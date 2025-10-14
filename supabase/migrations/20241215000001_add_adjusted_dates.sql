-- Add date adjustment fields to resume_experience
ALTER TABLE resume_experience
ADD COLUMN adjust_dates BOOLEAN DEFAULT false,
ADD COLUMN adjusted_start_date DATE,
ADD COLUMN adjusted_end_date DATE;

COMMENT ON COLUMN resume_experience.adjust_dates IS 'If true, use adjusted dates instead of original dates for resume generation';
COMMENT ON COLUMN resume_experience.adjusted_start_date IS 'Modified start date for resume generation (to handle overlapping jobs)';
COMMENT ON COLUMN resume_experience.adjusted_end_date IS 'Modified end date for resume generation (to handle overlapping jobs)';


