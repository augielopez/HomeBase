-- Add minor and notes fields to resume_education table
ALTER TABLE resume_education
ADD COLUMN minor VARCHAR(255),
ADD COLUMN notes TEXT;

-- Add comments
COMMENT ON COLUMN resume_education.minor IS 'Minor, concentration, or emphasis area';
COMMENT ON COLUMN resume_education.notes IS 'Honors, GPA, or other relevant notes (e.g., Summa Cum Laude)';

