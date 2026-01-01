-- Babylog Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

-- Create babies table
CREATE TABLE IF NOT EXISTS babies (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    owner_email VARCHAR,
    name VARCHAR NOT NULL,
    birth_date TIMESTAMP,
    shared_with_emails TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_babies_user_id ON babies(user_id);
CREATE INDEX IF NOT EXISTS idx_babies_shared_with ON babies USING GIN(shared_with_emails);

-- Create feedings table
CREATE TABLE IF NOT EXISTS feedings (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    time TIMESTAMP NOT NULL,
    type VARCHAR NOT NULL CHECK (type IN ('formula', 'breast')),
    duration_minutes INTEGER,
    amount_ml INTEGER,
    notes VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedings_baby_id ON feedings(baby_id);
CREATE INDEX IF NOT EXISTS idx_feedings_time ON feedings(time);

-- Create diapers table
CREATE TABLE IF NOT EXISTS diapers (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    time TIMESTAMP NOT NULL,
    type VARCHAR NOT NULL CHECK (type IN ('pee', 'poo', 'mixed')),
    notes VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diapers_baby_id ON diapers(baby_id);
CREATE INDEX IF NOT EXISTS idx_diapers_time ON diapers(time);

-- Create sleeps table
CREATE TABLE IF NOT EXISTS sleeps (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    notes VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sleeps_baby_id ON sleeps(baby_id);
CREATE INDEX IF NOT EXISTS idx_sleeps_start_time ON sleeps(start_time);

-- Verify tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('babies', 'feedings', 'diapers', 'sleeps');
