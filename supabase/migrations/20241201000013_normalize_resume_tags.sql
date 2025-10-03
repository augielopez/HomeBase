-- Migration to normalize resume tags structure
-- This creates a proper many-to-many relationship for tags

-- Create a master tags table
CREATE TABLE IF NOT EXISTS resume_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_resume_tags_name ON resume_tags(name);
CREATE INDEX IF NOT EXISTS idx_resume_tags_created_at ON resume_tags(created_at);

-- Create junction tables for many-to-many relationships
CREATE TABLE IF NOT EXISTS resume_skill_tags_junction (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    skill_id UUID NOT NULL REFERENCES resume_skills(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES resume_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(skill_id, tag_id)
);

CREATE TABLE IF NOT EXISTS resume_experience_tags_junction (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    experience_id UUID NOT NULL REFERENCES resume_experience(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES resume_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(experience_id, tag_id)
);

CREATE TABLE IF NOT EXISTS resume_project_tags_junction (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES resume_projects(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES resume_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, tag_id)
);

CREATE TABLE IF NOT EXISTS resume_volunteer_tags_junction (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    volunteer_id UUID NOT NULL REFERENCES resume_volunteer(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES resume_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(volunteer_id, tag_id)
);

-- Create indexes for junction tables
CREATE INDEX IF NOT EXISTS idx_resume_skill_tags_junction_skill_id ON resume_skill_tags_junction(skill_id);
CREATE INDEX IF NOT EXISTS idx_resume_skill_tags_junction_tag_id ON resume_skill_tags_junction(tag_id);

CREATE INDEX IF NOT EXISTS idx_resume_experience_tags_junction_experience_id ON resume_experience_tags_junction(experience_id);
CREATE INDEX IF NOT EXISTS idx_resume_experience_tags_junction_tag_id ON resume_experience_tags_junction(tag_id);

CREATE INDEX IF NOT EXISTS idx_resume_project_tags_junction_project_id ON resume_project_tags_junction(project_id);
CREATE INDEX IF NOT EXISTS idx_resume_project_tags_junction_tag_id ON resume_project_tags_junction(tag_id);

CREATE INDEX IF NOT EXISTS idx_resume_volunteer_tags_junction_volunteer_id ON resume_volunteer_tags_junction(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_resume_volunteer_tags_junction_tag_id ON resume_volunteer_tags_junction(tag_id);

-- Migrate existing data from old tag tables to new structure
-- First, insert unique tags from all existing tag tables
INSERT INTO resume_tags (name)
SELECT DISTINCT tag FROM (
    SELECT tag FROM resume_skill_tags
    UNION
    SELECT tag FROM resume_responsibility_tags
    UNION
    SELECT tag FROM resume_project_tags
    UNION
    SELECT tag FROM resume_volunteer_tags
) AS all_tags
WHERE tag IS NOT NULL AND tag != '';

-- Migrate skill tags
INSERT INTO resume_skill_tags_junction (skill_id, tag_id)
SELECT 
    rst.skill_id,
    rt.id
FROM resume_skill_tags rst
JOIN resume_tags rt ON rst.tag = rt.name;

-- Migrate responsibility tags (experience)
INSERT INTO resume_experience_tags_junction (experience_id, tag_id)
SELECT 
    rrt.responsibility_id,
    rt.id
FROM resume_responsibility_tags rrt
JOIN resume_responsibilities rr ON rrt.responsibility_id = rr.id
JOIN resume_tags rt ON rrt.tag = rt.name;

-- Migrate project tags
INSERT INTO resume_project_tags_junction (project_id, tag_id)
SELECT 
    rpt.project_id,
    rt.id
FROM resume_project_tags rpt
JOIN resume_tags rt ON rpt.tag = rt.name;

-- Migrate volunteer tags
INSERT INTO resume_volunteer_tags_junction (volunteer_id, tag_id)
SELECT 
    rvt.volunteer_id,
    rt.id
FROM resume_volunteer_tags rvt
JOIN resume_tags rt ON rvt.tag = rt.name;

-- Drop old tag tables (commented out for safety - uncomment after verification)
-- DROP TABLE IF EXISTS resume_skill_tags;
-- DROP TABLE IF EXISTS resume_responsibility_tags;
-- DROP TABLE IF EXISTS resume_project_tags;
-- DROP TABLE IF EXISTS resume_volunteer_tags;

-- Enable RLS on new tables
ALTER TABLE resume_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_skill_tags_junction ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_experience_tags_junction ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_project_tags_junction ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_volunteer_tags_junction ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for resume_tags
CREATE POLICY "Users can view all resume tags" ON resume_tags
    FOR SELECT USING (true);

CREATE POLICY "Users can insert resume tags" ON resume_tags
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update resume tags" ON resume_tags
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete resume tags" ON resume_tags
    FOR DELETE USING (true);

-- Create RLS policies for junction tables
CREATE POLICY "Users can view skill tags junction" ON resume_skill_tags_junction
    FOR SELECT USING (true);

CREATE POLICY "Users can insert skill tags junction" ON resume_skill_tags_junction
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update skill tags junction" ON resume_skill_tags_junction
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete skill tags junction" ON resume_skill_tags_junction
    FOR DELETE USING (true);

CREATE POLICY "Users can view experience tags junction" ON resume_experience_tags_junction
    FOR SELECT USING (true);

CREATE POLICY "Users can insert experience tags junction" ON resume_experience_tags_junction
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update experience tags junction" ON resume_experience_tags_junction
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete experience tags junction" ON resume_experience_tags_junction
    FOR DELETE USING (true);

CREATE POLICY "Users can view project tags junction" ON resume_project_tags_junction
    FOR SELECT USING (true);

CREATE POLICY "Users can insert project tags junction" ON resume_project_tags_junction
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update project tags junction" ON resume_project_tags_junction
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete project tags junction" ON resume_project_tags_junction
    FOR DELETE USING (true);

CREATE POLICY "Users can view volunteer tags junction" ON resume_volunteer_tags_junction
    FOR SELECT USING (true);

CREATE POLICY "Users can insert volunteer tags junction" ON resume_volunteer_tags_junction
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update volunteer tags junction" ON resume_volunteer_tags_junction
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete volunteer tags junction" ON resume_volunteer_tags_junction
    FOR DELETE USING (true);

-- Create updated_at trigger for resume_tags
CREATE OR REPLACE FUNCTION update_resume_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_resume_tags_updated_at
    BEFORE UPDATE ON resume_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_resume_tags_updated_at();

