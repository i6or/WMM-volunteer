-- Migration to add new Program fields from Salesforce
-- Run this in your Neon database before syncing

ALTER TABLE programs
ADD COLUMN IF NOT EXISTS program_type TEXT,
ADD COLUMN IF NOT EXISTS format TEXT,
ADD COLUMN IF NOT EXISTS language TEXT,
ADD COLUMN IF NOT EXISTS workshop_day TEXT,
ADD COLUMN IF NOT EXISTS workshop_time TEXT,
ADD COLUMN IF NOT EXISTS workshop_frequency TEXT,
ADD COLUMN IF NOT EXISTS number_of_workshops INTEGER,
ADD COLUMN IF NOT EXISTS primary_program_partner TEXT,
ADD COLUMN IF NOT EXISTS program_leader TEXT,
ADD COLUMN IF NOT EXISTS Workshop_Start_Date_Time__c TEXT,
ADD COLUMN IF NOT EXISTS program_leader_name TEXT,
ADD COLUMN IF NOT EXISTS total_participants INTEGER,
ADD COLUMN IF NOT EXISTS zoom_link TEXT,
ADD COLUMN IF NOT EXISTS schedule_link TEXT;

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_programs_status ON programs(status);
CREATE INDEX IF NOT EXISTS idx_programs_format ON programs(format);
CREATE INDEX IF NOT EXISTS idx_programs_start_date ON programs(start_date);
