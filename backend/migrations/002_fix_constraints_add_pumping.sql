-- Migration 002: Fix type constraints and add pumping table
-- Run this in Supabase SQL Editor

-- Drop old check constraints that require lowercase
ALTER TABLE feedings DROP CONSTRAINT IF EXISTS feedings_type_check;
ALTER TABLE diapers DROP CONSTRAINT IF EXISTS diapers_type_check;

-- Add new case-insensitive check constraints
ALTER TABLE feedings ADD CONSTRAINT feedings_type_check 
    CHECK (LOWER(type) IN ('formula', 'breast'));

ALTER TABLE diapers ADD CONSTRAINT diapers_type_check 
    CHECK (LOWER(type) IN ('pee', 'poo', 'mixed'));

-- Create pumping table
CREATE TABLE IF NOT EXISTS pumpings (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    time TIMESTAMP NOT NULL,
    duration_minutes INTEGER,
    amount_ml INTEGER,
    notes VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pumpings_baby_id ON pumpings(baby_id);
CREATE INDEX IF NOT EXISTS idx_pumpings_time ON pumpings(time);

-- Verify
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'pumpings';
