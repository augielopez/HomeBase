-- Add display_tags_in_resume column to resume_experience table
-- This column controls whether tags are shown on generated resumes for this experience

ALTER TABLE resume_experience 
ADD COLUMN IF NOT EXISTS display_tags_in_resume BOOLEAN DEFAULT true;

-- Add comment to explain the column
COMMENT ON COLUMN resume_experience.display_tags_in_resume IS 'Controls whether responsibility tags are displayed in generated resumes. Defaults to true for backwards compatibility.';

