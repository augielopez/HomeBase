-- Add category and featured flag to resume_skills table
ALTER TABLE resume_skills
ADD COLUMN category VARCHAR(100),
ADD COLUMN is_featured BOOLEAN DEFAULT false,
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Create index for featured skills
CREATE INDEX idx_resume_skills_featured ON resume_skills(is_featured, display_order);

-- Add comments
COMMENT ON COLUMN resume_skills.category IS 'Skill category: Languages & Frameworks, Cloud & DevOps, Containerization & Microservices, Databases & ORM, Security & Compliance, Testing & Monitoring, Practices & Methodologies';
COMMENT ON COLUMN resume_skills.is_featured IS 'Featured skills always appear in tailored resumes';
COMMENT ON COLUMN resume_skills.display_order IS 'Order for displaying skills (lower numbers first)';

