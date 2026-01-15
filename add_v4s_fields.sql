-- Add V4S specific fields to opportunities table
ALTER TABLE opportunities 
ADD COLUMN job_id TEXT,
ADD COLUMN shift_id TEXT,
ADD COLUMN campaign_id TEXT,
ADD COLUMN duration INTEGER,
ADD COLUMN skills_needed TEXT,
ADD COLUMN display_on_website BOOLEAN DEFAULT true;

-- Create indexes for better performance
CREATE INDEX idx_opportunities_job_id ON opportunities(job_id);
CREATE INDEX idx_opportunities_shift_id ON opportunities(shift_id);
CREATE INDEX idx_opportunities_display_on_website ON opportunities(display_on_website);
