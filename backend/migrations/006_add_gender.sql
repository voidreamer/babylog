-- Add gender column to babies table
-- Run this in Supabase SQL Editor

ALTER TABLE babies ADD COLUMN IF NOT EXISTS gender VARCHAR(10);

-- Also add to staging schema if exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'staging') THEN
        ALTER TABLE staging.babies ADD COLUMN IF NOT EXISTS gender VARCHAR(10);
    END IF;
END $$;
