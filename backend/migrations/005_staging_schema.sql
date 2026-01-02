-- ============================================================
-- SimpleBaby Staging Schema
-- Run this in Supabase SQL Editor to create isolated staging tables
-- ============================================================

-- Create staging schema
CREATE SCHEMA IF NOT EXISTS staging;

-- ============================================================
-- Core Tables (from 003_full_schema.sql)
-- ============================================================

-- Babies table
CREATE TABLE staging.babies (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    owner_email VARCHAR,
    name VARCHAR NOT NULL,
    birth_date TIMESTAMP,
    shared_with_emails TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_staging_babies_user_id ON staging.babies(user_id);

-- Feedings table
CREATE TABLE staging.feedings (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER NOT NULL REFERENCES staging.babies(id) ON DELETE CASCADE,
    time TIMESTAMP NOT NULL,
    type VARCHAR NOT NULL CHECK (LOWER(type) IN ('formula', 'breast', 'bottle', 'solid')),
    duration_minutes INTEGER,
    amount_ml INTEGER,
    notes VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_staging_feedings_baby_id ON staging.feedings(baby_id);
CREATE INDEX idx_staging_feedings_time ON staging.feedings(time);

-- Diapers table
CREATE TABLE staging.diapers (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER NOT NULL REFERENCES staging.babies(id) ON DELETE CASCADE,
    time TIMESTAMP NOT NULL,
    type VARCHAR NOT NULL CHECK (LOWER(type) IN ('pee', 'poo', 'mixed')),
    poo_color VARCHAR CHECK (poo_color IS NULL OR LOWER(poo_color) IN ('yellow', 'brown', 'green', 'black', 'red', 'white', 'orange')),
    poo_consistency VARCHAR CHECK (poo_consistency IS NULL OR LOWER(poo_consistency) IN ('liquid', 'soft', 'formed', 'hard', 'pellets')),
    poo_amount VARCHAR CHECK (poo_amount IS NULL OR LOWER(poo_amount) IN ('small', 'medium', 'large', 'blowout')),
    notes VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_staging_diapers_baby_id ON staging.diapers(baby_id);
CREATE INDEX idx_staging_diapers_time ON staging.diapers(time);

-- Sleeps table
CREATE TABLE staging.sleeps (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER NOT NULL REFERENCES staging.babies(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    notes VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_staging_sleeps_baby_id ON staging.sleeps(baby_id);
CREATE INDEX idx_staging_sleeps_start_time ON staging.sleeps(start_time);

-- Pumpings table
CREATE TABLE staging.pumpings (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER NOT NULL REFERENCES staging.babies(id) ON DELETE CASCADE,
    time TIMESTAMP NOT NULL,
    duration_minutes INTEGER,
    amount_ml INTEGER,
    notes VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_staging_pumpings_baby_id ON staging.pumpings(baby_id);
CREATE INDEX idx_staging_pumpings_time ON staging.pumpings(time);

-- ============================================================
-- Health Tables (from 004_health_integration.sql)
-- ============================================================

-- Doctor Visits
CREATE TABLE staging.doctor_visits (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER REFERENCES staging.babies(id) ON DELETE CASCADE,
    visit_date TIMESTAMP NOT NULL,
    doctor_name VARCHAR(200),
    visit_type VARCHAR(50) CHECK (visit_type IN ('checkup', 'sick', 'emergency', 'specialist', 'vaccination')),
    weight_kg DECIMAL(5,2),
    height_cm DECIMAL(5,2),
    head_cm DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_staging_doctor_visits_baby ON staging.doctor_visits(baby_id);

-- Vaccinations
CREATE TABLE staging.vaccinations (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER REFERENCES staging.babies(id) ON DELETE CASCADE,
    vaccine_name VARCHAR(200) NOT NULL,
    dose_number INTEGER DEFAULT 1,
    given_date TIMESTAMP NOT NULL,
    next_due_date TIMESTAMP,
    administered_by VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_staging_vaccinations_baby ON staging.vaccinations(baby_id);

-- Medications
CREATE TABLE staging.medications (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER REFERENCES staging.babies(id) ON DELETE CASCADE,
    medication_name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_staging_medications_baby ON staging.medications(baby_id);

-- Milestones
CREATE TABLE staging.milestones (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER REFERENCES staging.babies(id) ON DELETE CASCADE,
    milestone_type VARCHAR(100) NOT NULL,
    achieved_date TIMESTAMP NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_staging_milestones_baby ON staging.milestones(baby_id);

-- Growth Records
CREATE TABLE staging.growth_records (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER REFERENCES staging.babies(id) ON DELETE CASCADE,
    recorded_date TIMESTAMP NOT NULL,
    weight_kg DECIMAL(5,2),
    height_cm DECIMAL(5,2),
    head_cm DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_staging_growth_records_baby ON staging.growth_records(baby_id);

-- ============================================================
-- Verify staging schema created
-- ============================================================
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema = 'staging'
ORDER BY table_name;
