-- New Activity Tables: Potty, TummyTime, Bath
-- Run this in Supabase SQL Editor

-- Potty Training Table
CREATE TABLE IF NOT EXISTS potty (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    time TIMESTAMP NOT NULL,
    result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'accident', 'attempt')),
    potty_type VARCHAR(10) CHECK (potty_type IN ('pee', 'poo', 'both')),
    notes VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_potty_baby_id ON potty(baby_id);
CREATE INDEX IF NOT EXISTS idx_potty_time ON potty(time);

-- Tummy Time Table
CREATE TABLE IF NOT EXISTS tummy_time (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    duration_minutes INTEGER,
    notes VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tummy_time_baby_id ON tummy_time(baby_id);
CREATE INDEX IF NOT EXISTS idx_tummy_time_start ON tummy_time(start_time);

-- Bath Table
CREATE TABLE IF NOT EXISTS baths (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    time TIMESTAMP NOT NULL,
    notes VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_baths_baby_id ON baths(baby_id);
CREATE INDEX IF NOT EXISTS idx_baths_time ON baths(time);

-- For staging schema (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'staging') THEN
        -- Potty
        CREATE TABLE IF NOT EXISTS staging.potty (
            id SERIAL PRIMARY KEY,
            baby_id INTEGER NOT NULL REFERENCES staging.babies(id) ON DELETE CASCADE,
            time TIMESTAMP NOT NULL,
            result VARCHAR(20) NOT NULL,
            potty_type VARCHAR(10),
            notes VARCHAR,
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_staging_potty_baby ON staging.potty(baby_id);
        
        -- Tummy Time
        CREATE TABLE IF NOT EXISTS staging.tummy_time (
            id SERIAL PRIMARY KEY,
            baby_id INTEGER NOT NULL REFERENCES staging.babies(id) ON DELETE CASCADE,
            start_time TIMESTAMP NOT NULL,
            duration_minutes INTEGER,
            notes VARCHAR,
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_staging_tummy_baby ON staging.tummy_time(baby_id);
        
        -- Baths
        CREATE TABLE IF NOT EXISTS staging.baths (
            id SERIAL PRIMARY KEY,
            baby_id INTEGER NOT NULL REFERENCES staging.babies(id) ON DELETE CASCADE,
            time TIMESTAMP NOT NULL,
            notes VARCHAR,
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_staging_baths_baby ON staging.baths(baby_id);
    END IF;
END $$;
