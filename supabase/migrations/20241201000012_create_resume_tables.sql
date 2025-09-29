-- Resume Management System Tables
-- All tables prefixed with resume_ for organization

-- Contact Information (1 row only)
create table resume_contact (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  location text,
  linkedin text,
  github text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Skills (many skills, each with tags)
create table resume_skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table resume_skill_tags (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid references resume_skills(id) on delete cascade,
  tag text not null
);

-- Work Experience
create table resume_experience (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  company text not null,
  start_date date,
  end_date date,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table resume_responsibilities (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid references resume_experience(id) on delete cascade,
  description text not null,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table resume_responsibility_tags (
  id uuid primary key default gen_random_uuid(),
  responsibility_id uuid references resume_responsibilities(id) on delete cascade,
  tag text not null
);

-- Education
create table resume_education (
  id uuid primary key default gen_random_uuid(),
  degree text not null,
  school text not null,
  start_date date,
  end_date date,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Certifications
create table resume_certifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  issued_date date,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Projects
create table resume_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table resume_project_tags (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references resume_projects(id) on delete cascade,
  tag text not null
);

-- Volunteer Work
create table resume_volunteer (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  description text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table resume_volunteer_tags (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid references resume_volunteer(id) on delete cascade,
  tag text not null
);

-- Enable RLS (Row Level Security)
alter table resume_contact enable row level security;
alter table resume_skills enable row level security;
alter table resume_skill_tags enable row level security;
alter table resume_experience enable row level security;
alter table resume_responsibilities enable row level security;
alter table resume_responsibility_tags enable row level security;
alter table resume_education enable row level security;
alter table resume_certifications enable row level security;
alter table resume_projects enable row level security;
alter table resume_project_tags enable row level security;
alter table resume_volunteer enable row level security;
alter table resume_volunteer_tags enable row level security;

-- Create policies (allow all operations for authenticated users)
-- Contact
create policy "Allow all operations on resume_contact for authenticated users" on resume_contact
  for all using (auth.role() = 'authenticated');

-- Skills
create policy "Allow all operations on resume_skills for authenticated users" on resume_skills
  for all using (auth.role() = 'authenticated');

create policy "Allow all operations on resume_skill_tags for authenticated users" on resume_skill_tags
  for all using (auth.role() = 'authenticated');

-- Experience
create policy "Allow all operations on resume_experience for authenticated users" on resume_experience
  for all using (auth.role() = 'authenticated');

create policy "Allow all operations on resume_responsibilities for authenticated users" on resume_responsibilities
  for all using (auth.role() = 'authenticated');

create policy "Allow all operations on resume_responsibility_tags for authenticated users" on resume_responsibility_tags
  for all using (auth.role() = 'authenticated');

-- Education
create policy "Allow all operations on resume_education for authenticated users" on resume_education
  for all using (auth.role() = 'authenticated');

-- Certifications
create policy "Allow all operations on resume_certifications for authenticated users" on resume_certifications
  for all using (auth.role() = 'authenticated');

-- Projects
create policy "Allow all operations on resume_projects for authenticated users" on resume_projects
  for all using (auth.role() = 'authenticated');

create policy "Allow all operations on resume_project_tags for authenticated users" on resume_project_tags
  for all using (auth.role() = 'authenticated');

-- Volunteer
create policy "Allow all operations on resume_volunteer for authenticated users" on resume_volunteer
  for all using (auth.role() = 'authenticated');

create policy "Allow all operations on resume_volunteer_tags for authenticated users" on resume_volunteer_tags
  for all using (auth.role() = 'authenticated');

-- Create indexes for better performance
create index idx_resume_skill_tags_skill_id on resume_skill_tags(skill_id);
create index idx_resume_responsibilities_experience_id on resume_responsibilities(experience_id);
create index idx_resume_responsibility_tags_responsibility_id on resume_responsibility_tags(responsibility_id);
create index idx_resume_project_tags_project_id on resume_project_tags(project_id);
create index idx_resume_volunteer_tags_volunteer_id on resume_volunteer_tags(volunteer_id);
