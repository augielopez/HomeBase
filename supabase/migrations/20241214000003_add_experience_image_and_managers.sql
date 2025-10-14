-- Add image_url field to resume_experience table
ALTER TABLE resume_experience
ADD COLUMN image_url TEXT;

COMMENT ON COLUMN resume_experience.image_url IS 'URL/path to uploaded image for this experience (company logo, team photo, etc.)';

-- Create resume_managers table for tracking managers per experience
CREATE TABLE resume_managers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  experience_id UUID NOT NULL REFERENCES resume_experience(id) ON DELETE CASCADE,
  manager_name VARCHAR(200) NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_resume_managers_experience ON resume_managers(experience_id);
CREATE INDEX idx_resume_managers_user ON resume_managers(user_id);

-- Enable RLS
ALTER TABLE resume_managers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own managers"
  ON resume_managers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own managers"
  ON resume_managers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own managers"
  ON resume_managers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own managers"
  ON resume_managers FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE resume_managers IS 'Tracks managers for each work experience, allowing multiple managers per job with date ranges';

