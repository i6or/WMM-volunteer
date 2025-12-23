-- Migration to add new Workshop fields
-- Run this in your Neon database before syncing

ALTER TABLE workshops
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS format TEXT;

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_workshops_type ON workshops(type);
CREATE INDEX IF NOT EXISTS idx_workshops_format ON workshops(format);

