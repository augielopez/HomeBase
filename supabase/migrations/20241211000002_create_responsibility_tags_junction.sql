-- Create junction table for responsibility tags (separate from experience tags)
CREATE TABLE IF NOT EXISTS resume_responsibility_tags_junction (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    responsibility_id UUID NOT NULL REFERENCES resume_responsibilities(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES resume_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(responsibility_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_resume_responsibility_tags_junction_responsibility_id ON resume_responsibility_tags_junction(responsibility_id);
CREATE INDEX IF NOT EXISTS idx_resume_responsibility_tags_junction_tag_id ON resume_responsibility_tags_junction(tag_id);

-- Enable RLS
ALTER TABLE resume_responsibility_tags_junction ENABLE ROW LEVEL SECURITY;

-- RLS policies - Allow all authenticated users to access resume data
-- (Since resume tables don't have user_id, we allow all authenticated users)
CREATE POLICY "Authenticated users can view responsibility tags"
    ON resume_responsibility_tags_junction
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert responsibility tags"
    ON resume_responsibility_tags_junction
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update responsibility tags"
    ON resume_responsibility_tags_junction
    FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete responsibility tags"
    ON resume_responsibility_tags_junction
    FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- Migrate existing data from resume_experience_tags_junction that were actually responsibility tags
-- (The previous migration incorrectly put responsibility tags into experience_id)
-- We'll skip this for now as it's complex to determine which are which

