-- Ward workflow: discharge summary, expected discharge, bed cleaning + isolation. Additive + idempotent.
ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS expected_discharge_at timestamp,
    ADD COLUMN IF NOT EXISTS discharge_summary      text,
    ADD COLUMN IF NOT EXISTS discharge_condition    varchar(20);

ALTER TABLE beds
    ADD COLUMN IF NOT EXISTS cleaning_status varchar(14) NOT NULL DEFAULT 'clean',
    ADD COLUMN IF NOT EXISTS is_isolation    boolean     NOT NULL DEFAULT false;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beds_cleaning_status_check') THEN
        ALTER TABLE beds ADD CONSTRAINT beds_cleaning_status_check CHECK (cleaning_status IN ('clean','needs_cleaning'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admissions_discharge_condition_check') THEN
        ALTER TABLE admissions ADD CONSTRAINT admissions_discharge_condition_check
            CHECK (discharge_condition IS NULL OR discharge_condition IN ('improved','stable','deteriorated','against_advice','other'));
    END IF;
END $$;
