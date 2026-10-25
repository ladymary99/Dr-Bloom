-- =====================================================================
-- Dr-Bloom patient portal completion  (PostgreSQL / Supabase)
-- Additive + idempotent: safe to run more than once.
-- Run by: database/migrations/2026_10_23_130000_complete_patient_portal.php
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Doctors: fee, time off
-- ---------------------------------------------------------------------
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS consultation_fee numeric(10,2);

CREATE TABLE IF NOT EXISTS doctor_time_off (
    id               bigserial PRIMARY KEY,
    staff_profile_id bigint NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    starts_on        date   NOT NULL,
    ends_on          date   NOT NULL,
    reason           varchar(160),
    created_at       timestamp,
    updated_at       timestamp,
    CONSTRAINT doctor_time_off_range CHECK (ends_on >= starts_on)
);
CREATE INDEX IF NOT EXISTS doctor_time_off_lookup ON doctor_time_off (staff_profile_id, starts_on, ends_on);

-- Give every existing doctor sensible default hours (Mon-Fri 09:00-17:00, lunch 13-14)
UPDATE staff_profiles
   SET working_days  = '[1,2,3,4,5]',
       working_hours = '{"start":"09:00","end":"17:00","break_start":"13:00","break_end":"14:00"}'
 WHERE position = 'doctor' AND working_days IS NULL;

-- ---------------------------------------------------------------------
-- 2. Appointments: visit type, telehealth, cancellation audit
-- ---------------------------------------------------------------------
ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS visit_type          varchar(16) NOT NULL DEFAULT 'in_person',
    ADD COLUMN IF NOT EXISTS meeting_url         varchar(500),
    ADD COLUMN IF NOT EXISTS cancelled_by        bigint REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cancellation_reason varchar(300),
    ADD COLUMN IF NOT EXISTS rescheduled_from    timestamp,
    ADD COLUMN IF NOT EXISTS booked_by           bigint REFERENCES users(id) ON DELETE SET NULL;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_visit_type_check') THEN
        ALTER TABLE appointments ADD CONSTRAINT appointments_visit_type_check
            CHECK (visit_type IN ('in_person','online'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS appointments_doctor_time ON appointments (doctor_id, appointment_at);
CREATE INDEX IF NOT EXISTS appointments_patient_time ON appointments (patient_id, appointment_at);

-- ---------------------------------------------------------------------
-- 3. Patients: full profile, insurance, preferences, consent
-- ---------------------------------------------------------------------
ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS emergency_contact_name     varchar(120),
    ADD COLUMN IF NOT EXISTS emergency_contact_phone    text,          -- encrypted by Eloquent
    ADD COLUMN IF NOT EXISTS emergency_contact_relation varchar(60),
    ADD COLUMN IF NOT EXISTS chronic_conditions         text,
    ADD COLUMN IF NOT EXISTS current_medications        text,
    ADD COLUMN IF NOT EXISTS insurance_provider         varchar(120),
    ADD COLUMN IF NOT EXISTS insurance_policy_number    text,          -- encrypted by Eloquent
    ADD COLUMN IF NOT EXISTS insurance_group_number     varchar(60),
    ADD COLUMN IF NOT EXISTS insurance_expires_on       date,
    ADD COLUMN IF NOT EXISTS preferred_language         varchar(8) NOT NULL DEFAULT 'en',
    ADD COLUMN IF NOT EXISTS notification_prefs         jsonb NOT NULL
        DEFAULT '{"email":true,"sms":false,"appointment_reminders":true,"messages":true,"billing":true}',
    ADD COLUMN IF NOT EXISTS privacy_accepted_at        timestamp,
    ADD COLUMN IF NOT EXISTS privacy_policy_version     varchar(20);

-- Server-side, collision-free MRN (MRN-YYYY-000123). Existing MRNs are untouched.
CREATE SEQUENCE IF NOT EXISTS patient_mrn_seq;
SELECT setval('patient_mrn_seq', GREATEST((SELECT count(*) FROM patients), 1), (SELECT count(*) FROM patients) > 0)
 WHERE (SELECT last_value FROM patient_mrn_seq) = 1 AND NOT (SELECT is_called FROM patient_mrn_seq);

-- ---------------------------------------------------------------------
-- 4. Visits: doctor controls what the patient can see
-- ---------------------------------------------------------------------
ALTER TABLE visits
    ADD COLUMN IF NOT EXISTS share_diagnosis boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS share_vitals    boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS share_notes     boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------
-- 5. Lab & imaging  (live table only had id + timestamps: repair it)
-- ---------------------------------------------------------------------
ALTER TABLE lab_tests
    ADD COLUMN IF NOT EXISTS patient_id        uuid REFERENCES patients(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS visit_id          uuid REFERENCES visits(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS doctor_id         bigint REFERENCES staff_profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS test_name         varchar(255),
    ADD COLUMN IF NOT EXISTS status            varchar(20) NOT NULL DEFAULT 'ordered',
    ADD COLUMN IF NOT EXISTS result            text,
    ADD COLUMN IF NOT EXISTS notes             text,
    ADD COLUMN IF NOT EXISTS completed_at      timestamp,
    ADD COLUMN IF NOT EXISTS category          varchar(16) NOT NULL DEFAULT 'lab',
    ADD COLUMN IF NOT EXISTS result_file_path  varchar(255),
    ADD COLUMN IF NOT EXISTS result_file_name  varchar(255),
    ADD COLUMN IF NOT EXISTS result_file_size  bigint,
    ADD COLUMN IF NOT EXISTS released_at       timestamp;   -- NULL = not yet visible to the patient

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM lab_tests WHERE patient_id IS NULL OR test_name IS NULL) THEN
        ALTER TABLE lab_tests ALTER COLUMN patient_id SET NOT NULL, ALTER COLUMN test_name SET NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lab_tests_status_check') THEN
        ALTER TABLE lab_tests ADD CONSTRAINT lab_tests_status_check
            CHECK (status IN ('ordered','in_progress','completed','cancelled'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lab_tests_category_check') THEN
        ALTER TABLE lab_tests ADD CONSTRAINT lab_tests_category_check CHECK (category IN ('lab','imaging'));
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS lab_tests_patient ON lab_tests (patient_id, created_at DESC);

-- ---------------------------------------------------------------------
-- 6. Vaccination history
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vaccinations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    vaccine_name    varchar(150) NOT NULL,
    dose_number     smallint,
    administered_on date NOT NULL,
    next_due_on     date,
    lot_number      varchar(60),
    administered_by bigint REFERENCES users(id) ON DELETE SET NULL,
    notes           text,
    created_at      timestamp,
    updated_at      timestamp
);
CREATE INDEX IF NOT EXISTS vaccinations_patient ON vaccinations (patient_id, administered_on DESC);

-- ---------------------------------------------------------------------
-- 7. Billing: statuses, line items, payments, insurance claims
-- ---------------------------------------------------------------------
DO $$ DECLARE c text; BEGIN
    FOR c IN SELECT conname FROM pg_constraint
              WHERE conrelid = 'invoices'::regclass AND contype = 'c'
                AND pg_get_constraintdef(oid) ILIKE '%status%' LOOP
        EXECUTE format('ALTER TABLE invoices DROP CONSTRAINT %I', c);
    END LOOP;
    ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
        CHECK (status IN ('pending','partial','paid','refunded','cancelled'));
END $$;

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS amount_paid    numeric(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS due_date       date,
    ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL;
UPDATE invoices SET amount_paid = amount WHERE status = 'paid' AND amount_paid = 0;

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;
SELECT setval('invoice_number_seq',
              GREATEST(COALESCE((SELECT max(split_part(invoice_number,'-',3)::int)
                                   FROM invoices WHERE invoice_number ~ '^INV-[0-9]{4}-[0-9]+$'), 0), 1),
              COALESCE((SELECT max(split_part(invoice_number,'-',3)::int)
                          FROM invoices WHERE invoice_number ~ '^INV-[0-9]{4}-[0-9]+$'), 0) > 0)
 WHERE NOT (SELECT is_called FROM invoice_number_seq);

CREATE TABLE IF NOT EXISTS invoice_items (
    id          bigserial PRIMARY KEY,
    invoice_id  bigint NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description varchar(255) NOT NULL,
    quantity    numeric(8,2)  NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price  numeric(12,2) NOT NULL CHECK (unit_price >= 0),
    total       numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at  timestamp,
    updated_at  timestamp
);
CREATE INDEX IF NOT EXISTS invoice_items_invoice ON invoice_items (invoice_id);

CREATE SEQUENCE IF NOT EXISTS receipt_number_seq;
CREATE TABLE IF NOT EXISTS payments (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id     bigint NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount         numeric(12,2) NOT NULL CHECK (amount > 0),
    method         varchar(24) NOT NULL DEFAULT 'cash',
    status         varchar(16) NOT NULL DEFAULT 'succeeded',
    gateway_ref    varchar(160),
    receipt_number varchar(40),
    paid_at        timestamp,
    recorded_by    bigint REFERENCES users(id) ON DELETE SET NULL,
    notes          varchar(300),
    created_at     timestamp,
    updated_at     timestamp,
    CONSTRAINT payments_method_check CHECK (method IN ('cash','card','stripe','bank_transfer','insurance','other')),
    CONSTRAINT payments_status_check CHECK (status IN ('pending','succeeded','failed','refunded'))
);
CREATE UNIQUE INDEX IF NOT EXISTS payments_gateway_ref_uq ON payments (gateway_ref) WHERE gateway_ref IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payments_receipt_uq     ON payments (receipt_number) WHERE receipt_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_invoice ON payments (invoice_id);

CREATE TABLE IF NOT EXISTS insurance_claims (
    id              bigserial PRIMARY KEY,
    invoice_id      bigint NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    patient_id      uuid   NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    provider        varchar(120) NOT NULL,
    claim_number    varchar(60),
    amount_claimed  numeric(12,2) NOT NULL CHECK (amount_claimed >= 0),
    amount_approved numeric(12,2),
    status          varchar(16) NOT NULL DEFAULT 'submitted',
    submitted_at    timestamp,
    resolved_at     timestamp,
    notes           text,
    created_by      bigint REFERENCES users(id) ON DELETE SET NULL,
    created_at      timestamp,
    updated_at      timestamp,
    CONSTRAINT insurance_claims_status_check CHECK (status IN ('submitted','in_review','approved','rejected','paid'))
);
CREATE INDEX IF NOT EXISTS insurance_claims_patient ON insurance_claims (patient_id);
CREATE INDEX IF NOT EXISTS insurance_claims_invoice ON insurance_claims (invoice_id);

-- ---------------------------------------------------------------------
-- 8. Secure messaging
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS message_threads (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    staff_user_id   bigint REFERENCES users(id) ON DELETE SET NULL,   -- NULL = general clinic inbox
    subject         varchar(160) NOT NULL,
    last_message_at timestamp,
    created_at      timestamp,
    updated_at      timestamp
);
CREATE INDEX IF NOT EXISTS message_threads_patient ON message_threads (patient_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS message_threads_staff   ON message_threads (staff_user_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS messages (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id  uuid   NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
    sender_id  bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       text   NOT NULL,
    read_at    timestamp,
    created_at timestamp,
    updated_at timestamp
);
CREATE INDEX IF NOT EXISTS messages_thread ON messages (thread_id, created_at);

-- ---------------------------------------------------------------------
-- 9. Documents: category, scan status, integrity hash
-- ---------------------------------------------------------------------
ALTER TABLE patient_documents
    ADD COLUMN IF NOT EXISTS category    varchar(32) NOT NULL DEFAULT 'other',
    ADD COLUMN IF NOT EXISTS scan_status varchar(16) NOT NULL DEFAULT 'unscanned',   -- clean | unscanned | infected
    ADD COLUMN IF NOT EXISTS scanned_at  timestamp,
    ADD COLUMN IF NOT EXISTS sha256      char(64);
CREATE INDEX IF NOT EXISTS patient_documents_patient ON patient_documents (patient_id, created_at DESC);

-- ---------------------------------------------------------------------
-- 10. Compliance: consents + GDPR-style data requests
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consents (
    id          bigserial PRIMARY KEY,
    patient_id  uuid   NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    user_id     bigint REFERENCES users(id) ON DELETE SET NULL,
    type        varchar(40) NOT NULL,
    version     varchar(20) NOT NULL,
    accepted_at timestamp   NOT NULL,
    ip_address  inet,
    user_agent  text,
    created_at  timestamp,
    updated_at  timestamp
);
CREATE INDEX IF NOT EXISTS consents_patient ON consents (patient_id, type);

CREATE TABLE IF NOT EXISTS data_requests (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id  uuid   NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    user_id     bigint REFERENCES users(id) ON DELETE SET NULL,
    type        varchar(16) NOT NULL,
    status      varchar(16) NOT NULL DEFAULT 'pending',
    reason      text,
    admin_notes text,
    resolved_by bigint REFERENCES users(id) ON DELETE SET NULL,
    resolved_at timestamp,
    created_at  timestamp,
    updated_at  timestamp,
    CONSTRAINT data_requests_type_check   CHECK (type IN ('export','delete')),
    CONSTRAINT data_requests_status_check CHECK (status IN ('pending','processing','completed','rejected'))
);
CREATE INDEX IF NOT EXISTS data_requests_status ON data_requests (status, created_at DESC);

-- ---------------------------------------------------------------------
-- 10b. Optional two-factor authentication (TOTP)
-- ---------------------------------------------------------------------
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS two_factor_secret       text,        -- encrypted by Eloquent
    ADD COLUMN IF NOT EXISTS two_factor_confirmed_at timestamp;

-- ---------------------------------------------------------------------
-- 11. Audit + notification lookups
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS audit_logs_subject ON audit_logs (auditable_type, auditable_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user    ON audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_notifiable ON notifications (notifiable_type, notifiable_id, read_at);

-- ---------------------------------------------------------------------
-- 12. Default clinic settings (only if missing)
-- ---------------------------------------------------------------------
INSERT INTO settings (key, value, created_at, updated_at) VALUES
    ('cancellation_cutoff_hours', '2',       now(), now()),
    ('booking_window_days',       '60',      now(), now()),
    ('privacy_policy_version',    '2026-10', now(), now()),
    ('telehealth_base_url',       '',        now(), now())
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------
-- 13. Lock new tables away from the Supabase Data API (anon / authenticated).
--     Only the Laravel backend role can touch them; RLS is deny-by-default.
-- ---------------------------------------------------------------------
DO $$ DECLARE t text; BEGIN
    FOREACH t IN ARRAY ARRAY['doctor_time_off','vaccinations','invoice_items','payments','insurance_claims',
                             'message_threads','messages','consents','data_requests'] LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
            EXECUTE format('REVOKE ALL ON TABLE %I FROM anon', t);
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
            EXECUTE format('REVOKE ALL ON TABLE %I FROM authenticated', t);
        END IF;
    END LOOP;
END $$;
