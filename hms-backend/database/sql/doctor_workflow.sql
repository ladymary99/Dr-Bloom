-- =====================================================================
-- Doctor clinical workflow  (PostgreSQL / Supabase). Additive + idempotent.
-- Run by: database/migrations/2026_10_24_090000_doctor_clinical_workflow.php
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Appointment queue: Booked -> Checked in -> Waiting -> In consultation -> Completed
-- ---------------------------------------------------------------------
DO $$ DECLARE c text; BEGIN
    FOR c IN SELECT conname FROM pg_constraint
              WHERE conrelid = 'appointments'::regclass AND contype = 'c'
                AND pg_get_constraintdef(oid) ILIKE '%scheduled%' LOOP
        EXECUTE format('ALTER TABLE appointments DROP CONSTRAINT %I', c);
    END LOOP;
    ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN
        ('scheduled','confirmed','checked_in','waiting','in_consultation','completed','cancelled','no_show'));
END $$;

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS checked_in_at           timestamp,
    ADD COLUMN IF NOT EXISTS consultation_started_at timestamp,
    ADD COLUMN IF NOT EXISTS completed_at            timestamp;

-- waiting / in_consultation still occupy the doctor's calendar
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS no_double_booking;
ALTER TABLE appointments ADD CONSTRAINT no_double_booking EXCLUDE USING gist (
    doctor_id WITH =,
    tsrange(appointment_at, ends_at) WITH &&
) WHERE (status IN ('scheduled','confirmed','checked_in','waiting','in_consultation')
         AND appointment_at >= timestamp '2026-10-23 00:00:00');

-- ---------------------------------------------------------------------
-- 2. Visits become real encounters: draft -> signed (locked), SOAP, ICD-10, follow-up
-- ---------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visits' AND column_name='status') THEN
        -- rows that already exist were finished visits: mark them signed, then new rows default to draft
        ALTER TABLE visits ADD COLUMN status varchar(10) NOT NULL DEFAULT 'signed';
        ALTER TABLE visits ALTER COLUMN status SET DEFAULT 'draft';
        ALTER TABLE visits ADD CONSTRAINT visits_status_check CHECK (status IN ('draft','signed'));
    END IF;
END $$;

ALTER TABLE visits
    ADD COLUMN IF NOT EXISTS subjective      text,
    ADD COLUMN IF NOT EXISTS objective       text,
    ADD COLUMN IF NOT EXISTS assessment      text,
    ADD COLUMN IF NOT EXISTS plan            text,
    ADD COLUMN IF NOT EXISTS diagnosis_codes jsonb NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS follow_up_days  smallint,
    ADD COLUMN IF NOT EXISTS follow_up_note  varchar(300),
    ADD COLUMN IF NOT EXISTS signed_at       timestamp,
    ADD COLUMN IF NOT EXISTS signed_by       bigint REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS version         integer NOT NULL DEFAULT 1;
UPDATE visits SET signed_at = COALESCE(signed_at, visited_at) WHERE status = 'signed' AND signed_at IS NULL;
CREATE INDEX IF NOT EXISTS visits_doctor_status ON visits (doctor_id, status);

-- every edit keeps the previous content (nothing is silently overwritten)
CREATE TABLE IF NOT EXISTS visit_versions (
    id         bigserial PRIMARY KEY,
    visit_id   uuid   NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    version    integer NOT NULL,
    snapshot   jsonb  NOT NULL,
    edited_by  bigint REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamp
);
CREATE INDEX IF NOT EXISTS visit_versions_visit ON visit_versions (visit_id, version DESC);

-- after signing, corrections are append-only addenda
CREATE TABLE IF NOT EXISTS visit_addenda (
    id         bigserial PRIMARY KEY,
    visit_id   uuid   NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    author_id  bigint REFERENCES users(id) ON DELETE SET NULL,
    body       text   NOT NULL,
    created_at timestamp,
    updated_at timestamp
);
CREATE INDEX IF NOT EXISTS visit_addenda_visit ON visit_addenda (visit_id, created_at);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS visit_id uuid REFERENCES visits(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- 3. ICD-10 diagnosis search
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS icd10_codes (
    code        varchar(10) PRIMARY KEY,
    description text NOT NULL
);
CREATE INDEX IF NOT EXISTS icd10_codes_desc_lower ON icd10_codes (lower(description) text_pattern_ops);

-- ---------------------------------------------------------------------
-- 4. Sick notes and referral letters
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical_letters (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id   uuid   NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    patient_id uuid   NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id  bigint REFERENCES staff_profiles(id) ON DELETE SET NULL,
    type       varchar(16) NOT NULL,
    data       jsonb  NOT NULL DEFAULT '{}',
    issued_at  timestamp NOT NULL,
    created_at timestamp,
    updated_at timestamp,
    CONSTRAINT clinical_letters_type_check CHECK (type IN ('sick_note','referral'))
);
CREATE INDEX IF NOT EXISTS clinical_letters_patient ON clinical_letters (patient_id, issued_at DESC);

-- ---------------------------------------------------------------------
-- 5. Break-the-glass access (reasoned, time-limited, reviewed by an admin)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS access_grants (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id     uuid   NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    reason         text   NOT NULL,
    expires_at     timestamp NOT NULL,
    reviewed_at    timestamp,
    reviewed_by    bigint REFERENCES users(id) ON DELETE SET NULL,
    review_outcome varchar(16),
    review_note    text,
    created_at     timestamp,
    updated_at     timestamp,
    CONSTRAINT access_grants_outcome_check CHECK (review_outcome IS NULL OR review_outcome IN ('appropriate','inappropriate'))
);
CREATE INDEX IF NOT EXISTS access_grants_lookup ON access_grants (user_id, patient_id, expires_at);
CREATE INDEX IF NOT EXISTS access_grants_review ON access_grants (reviewed_at, created_at DESC);

-- ---------------------------------------------------------------------
-- 6. Lab results need review; critical values raise alerts
-- ---------------------------------------------------------------------
ALTER TABLE lab_tests
    ADD COLUMN IF NOT EXISTS is_critical boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS reviewed_at timestamp,
    ADD COLUMN IF NOT EXISTS reviewed_by bigint REFERENCES users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- 7. Messaging: resolve conversations, track response time
-- ---------------------------------------------------------------------
ALTER TABLE message_threads
    ADD COLUMN IF NOT EXISTS status              varchar(10) NOT NULL DEFAULT 'open',
    ADD COLUMN IF NOT EXISTS resolved_at         timestamp,
    ADD COLUMN IF NOT EXISTS resolved_by         bigint REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS first_staff_reply_at timestamp;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'message_threads_status_check') THEN
        ALTER TABLE message_threads ADD CONSTRAINT message_threads_status_check CHECK (status IN ('open','resolved'));
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- 8. Doctor schedule: different hours per day, several breaks, buffer, daily cap
-- ---------------------------------------------------------------------
ALTER TABLE staff_profiles
    ADD COLUMN IF NOT EXISTS weekly_schedule  jsonb,      -- {"1":{"start":"09:00","end":"17:00","breaks":[["13:00","14:00"]]}, ...}
    ADD COLUMN IF NOT EXISTS buffer_minutes   smallint NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_per_day      smallint,
    ADD COLUMN IF NOT EXISTS accepts_online   boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS accepts_in_person boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS license_number   varchar(60);

-- ---------------------------------------------------------------------
-- 9. RLS lock-down for the new tables (Laravel backend role only)
-- ---------------------------------------------------------------------
DO $$ DECLARE t text; BEGIN
    FOREACH t IN ARRAY ARRAY['visit_versions','visit_addenda','icd10_codes','clinical_letters','access_grants'] LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
            EXECUTE format('REVOKE ALL ON TABLE %I FROM anon', t);
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
            EXECUTE format('REVOKE ALL ON TABLE %I FROM authenticated', t);
        END IF;
    END LOOP;
END $$;
