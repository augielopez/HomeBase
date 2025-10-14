-- Add exclusion flag to resume_experience
ALTER TABLE resume_experience
ADD COLUMN is_excluded BOOLEAN DEFAULT false;

COMMENT ON COLUMN resume_experience.is_excluded IS 'If true, this job is excluded from resume generation but responsibilities can be reassigned';

-- Create responsibility mapping table
CREATE TABLE resume_responsibility_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_experience_id UUID NOT NULL REFERENCES resume_experience(id) ON DELETE CASCADE,
  target_experience_id UUID NOT NULL REFERENCES resume_experience(id) ON DELETE CASCADE,
  responsibility_id UUID NOT NULL REFERENCES resume_responsibilities(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_responsibility_mappings_source ON resume_responsibility_mappings(source_experience_id);
CREATE INDEX idx_responsibility_mappings_target ON resume_responsibility_mappings(target_experience_id);
CREATE INDEX idx_responsibility_mappings_user ON resume_responsibility_mappings(user_id);

ALTER TABLE resume_responsibility_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own mappings" ON resume_responsibility_mappings
  FOR ALL USING (auth.uid() = user_id);

COMMENT ON TABLE resume_responsibility_mappings IS 'Maps responsibilities from excluded jobs to other jobs for resume generation';


