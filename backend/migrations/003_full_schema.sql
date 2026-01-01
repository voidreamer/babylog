-- Huckle Baby Tracker - Full Schema (drop and recreate)
-- Run this in Supabase SQL Editor

-- Drop existing tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS pumpings CASCADE;
DROP TABLE IF EXISTS sleeps CASCADE;
DROP TABLE IF EXISTS diapers CASCADE;
DROP TABLE IF EXISTS feedings CASCADE;
DROP TABLE IF EXISTS babies CASCADE;

-- Babies table
CREATE TABLE babies (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    owner_email VARCHAR,
    name VARCHAR NOT NULL,
    birth_date TIMESTAMP,
    shared_with_emails TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_babies_user_id ON babies(user_id);

-- Feedings table
CREATE TABLE feedings (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    time TIMESTAMP NOT NULL,
    type VARCHAR NOT NULL CHECK (LOWER(type) IN ('formula', 'breast', 'bottle', 'solid')),
    duration_minutes INTEGER,
    amount_ml INTEGER,
    notes VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_feedings_baby_id ON feedings(baby_id);
CREATE INDEX idx_feedings_time ON feedings(time);

-- Diapers table (enhanced with size, color, consistency)
CREATE TABLE diapers (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    time TIMESTAMP NOT NULL,
    type VARCHAR NOT NULL CHECK (LOWER(type) IN ('pee', 'poo', 'mixed')),
    -- Poo details (only relevant when type is 'poo' or 'mixed')
    poo_color VARCHAR CHECK (poo_color IS NULL OR LOWER(poo_color) IN ('yellow', 'brown', 'green', 'black', 'red', 'white', 'orange')),
    poo_consistency VARCHAR CHECK (poo_consistency IS NULL OR LOWER(poo_consistency) IN ('liquid', 'soft', 'formed', 'hard', 'pellets')),
    poo_amount VARCHAR CHECK (poo_amount IS NULL OR LOWER(poo_amount) IN ('small', 'medium', 'large', 'blowout')),
    notes VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_diapers_baby_id ON diapers(baby_id);
CREATE INDEX idx_diapers_time ON diapers(time);

-- Sleeps table
CREATE TABLE sleeps (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    notes VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sleeps_baby_id ON sleeps(baby_id);
CREATE INDEX idx_sleeps_start_time ON sleeps(start_time);

-- Pumpings table
CREATE TABLE pumpings (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    time TIMESTAMP NOT NULL,
    duration_minutes INTEGER,
    amount_ml INTEGER,
    notes VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pumpings_baby_id ON pumpings(baby_id);
CREATE INDEX idx_pumpings_time ON pumpings(time);

-- Verify tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('babies', 'feedings', 'diapers', 'sleeps', 'pumpings');
