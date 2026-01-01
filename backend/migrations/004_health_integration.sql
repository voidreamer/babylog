-- SimpleBaby Health Integration Schema
-- Run this in Supabase SQL Editor

-- Doctor Visits
CREATE TABLE IF NOT EXISTS doctor_visits (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER REFERENCES babies(id) ON DELETE CASCADE,
    visit_date TIMESTAMP NOT NULL,
    doctor_name VARCHAR(200),
    visit_type VARCHAR(50) CHECK (visit_type IN ('checkup', 'sick', 'emergency', 'specialist', 'vaccination')),
    weight_kg DECIMAL(5,2),
    height_cm DECIMAL(5,2),
    head_cm DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Vaccinations
CREATE TABLE IF NOT EXISTS vaccinations (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER REFERENCES babies(id) ON DELETE CASCADE,
    vaccine_name VARCHAR(200) NOT NULL,
    dose_number INTEGER DEFAULT 1,
    given_date TIMESTAMP NOT NULL,
    next_due_date TIMESTAMP,
    administered_by VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Medications
CREATE TABLE IF NOT EXISTS medications (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER REFERENCES babies(id) ON DELETE CASCADE,
    medication_name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Milestones
CREATE TABLE IF NOT EXISTS milestones (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER REFERENCES babies(id) ON DELETE CASCADE,
    milestone_type VARCHAR(100) NOT NULL,
    achieved_date TIMESTAMP NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Growth Records
CREATE TABLE IF NOT EXISTS growth_records (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER REFERENCES babies(id) ON DELETE CASCADE,
    recorded_date TIMESTAMP NOT NULL,
    weight_kg DECIMAL(5,2),
    height_cm DECIMAL(5,2),
    head_cm DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_doctor_visits_baby ON doctor_visits(baby_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_baby ON vaccinations(baby_id);
CREATE INDEX IF NOT EXISTS idx_medications_baby ON medications(baby_id);
CREATE INDEX IF NOT EXISTS idx_milestones_baby ON milestones(baby_id);
CREATE INDEX IF NOT EXISTS idx_growth_records_baby ON growth_records(baby_id);
