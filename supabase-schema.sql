-- ============================================
-- NEXIA - Database Schema for Supabase
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Therapists table
CREATE TABLE therapists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Patients table
CREATE TABLE patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  addiction_type TEXT,
  current_phase INT DEFAULT 0 CHECK (current_phase >= 0 AND current_phase <= 5),
  sobriety_start TIMESTAMPTZ,
  emergency_contacts JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Daily entries (mood + craving tracking)
CREATE TABLE daily_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  mood TEXT NOT NULL,
  craving_level INT NOT NULL CHECK (craving_level >= 0 AND craving_level <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Therapy tasks (personalized per patient)
CREATE TABLE therapy_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  task_type TEXT DEFAULT 'conductual',
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Task library (reusable tasks for therapist)
CREATE TABLE task_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  task_type TEXT DEFAULT 'conductual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Clinical notes (therapist notes per patient)
CREATE TABLE clinical_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Crisis events (log when patient activates crisis mode)
CREATE TABLE crisis_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  duration_seconds INT,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE therapists ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapy_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_events ENABLE ROW LEVEL SECURITY;

-- Therapists can see everything (they manage the system)
CREATE POLICY "Therapists full access to therapists" ON therapists
  FOR ALL USING (auth.uid() = user_id);

-- Therapists can manage all patients
CREATE POLICY "Therapists can manage patients" ON patients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM therapists WHERE user_id = auth.uid())
  );

-- Patients can read own data
CREATE POLICY "Patients can read own data" ON patients
  FOR SELECT USING (auth.uid() = user_id);

-- Daily entries: patients can insert own, therapists can read all
CREATE POLICY "Patients insert own entries" ON daily_entries
  FOR INSERT WITH CHECK (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

CREATE POLICY "Patients read own entries" ON daily_entries
  FOR SELECT USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM therapists WHERE user_id = auth.uid())
  );

CREATE POLICY "Therapists manage entries" ON daily_entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM therapists WHERE user_id = auth.uid())
  );

-- Tasks: therapists manage, patients read own + update status
CREATE POLICY "Therapists manage tasks" ON therapy_tasks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM therapists WHERE user_id = auth.uid())
  );

CREATE POLICY "Patients read own tasks" ON therapy_tasks
  FOR SELECT USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

CREATE POLICY "Patients update own tasks" ON therapy_tasks
  FOR UPDATE USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

-- Task library: therapists only
CREATE POLICY "Therapists manage task library" ON task_library
  FOR ALL USING (
    EXISTS (SELECT 1 FROM therapists WHERE user_id = auth.uid())
  );

-- Clinical notes: therapists only
CREATE POLICY "Therapists manage clinical notes" ON clinical_notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM therapists WHERE user_id = auth.uid())
  );

-- Crisis events: patients insert, therapists read
CREATE POLICY "Patients insert crisis events" ON crisis_events
  FOR INSERT WITH CHECK (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

CREATE POLICY "Therapists read crisis events" ON crisis_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM therapists WHERE user_id = auth.uid())
  );

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_daily_entries_patient ON daily_entries(patient_id, created_at DESC);
CREATE INDEX idx_therapy_tasks_patient ON therapy_tasks(patient_id, status);
CREATE INDEX idx_clinical_notes_patient ON clinical_notes(patient_id, created_at DESC);
CREATE INDEX idx_crisis_events_patient ON crisis_events(patient_id, created_at DESC);
