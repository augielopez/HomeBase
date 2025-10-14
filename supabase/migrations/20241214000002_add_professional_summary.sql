-- Add professional summary field to resume_contact table
ALTER TABLE resume_contact
ADD COLUMN professional_summary TEXT;

-- Add comment
COMMENT ON COLUMN resume_contact.professional_summary IS 'Professional summary/objective statement that will be tailored for each job application';

