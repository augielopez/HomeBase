// Resume Management System Interfaces

// Master tags table
export interface ResumeTag {
  id?: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ResumeContact {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  professional_summary?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ResumeSkill {
  id?: string;
  name: string;
  category?: string;
  is_featured?: boolean;
  display_order?: number;
  tags?: ResumeTag[]; // Changed from string[] to ResumeTag[]
  created_at?: string;
  updated_at?: string;
}

// Junction table for skills and tags
export interface ResumeSkillTagsJunction {
  id?: string;
  skill_id: string;
  tag_id: string;
  created_at?: string;
}

export interface ResumeExperience {
  id?: string;
  role: string;
  company: string;
  start_date?: string;
  end_date?: string;
  image_url?: string;
  is_excluded?: boolean;
  adjust_dates?: boolean;
  adjusted_start_date?: string;
  adjusted_end_date?: string;
  display_tags_in_resume?: boolean;
  responsibilities?: ResumeResponsibility[];
  managers?: ResumeManager[];
  created_at?: string;
  updated_at?: string;
}

export interface ResumeResponsibility {
  id?: string;
  experience_id: string;
  description: string;
  tags?: ResumeTag[] | string[];
  created_at?: string;
  updated_at?: string;
}

export interface ResumeManager {
  id?: string;
  experience_id: string;
  manager_name: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ResponsibilityMapping {
  id?: string;
  user_id?: string;
  source_experience_id: string;
  target_experience_id: string;
  responsibility_id: string;
  created_at?: string;
  updated_at?: string;
}

// Junction table for experience and tags
export interface ResumeExperienceTagsJunction {
  id?: string;
  experience_id: string;
  tag_id: string;
  created_at?: string;
}

export interface ResumeEducation {
  id?: string;
  degree: string;
  school: string;
  minor?: string;
  notes?: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ResumeCertification {
  id?: string;
  title: string;
  issued_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ResumeProject {
  id?: string;
  title: string;
  description?: string;
  tags?: ResumeTag[]; // Changed from string[] to ResumeTag[]
  created_at?: string;
  updated_at?: string;
}

// Junction table for projects and tags
export interface ResumeProjectTagsJunction {
  id?: string;
  project_id: string;
  tag_id: string;
  created_at?: string;
}

export interface ResumeVolunteer {
  id?: string;
  role: string;
  description?: string;
  tags?: ResumeTag[]; // Changed from string[] to ResumeTag[]
  created_at?: string;
  updated_at?: string;
}

// Junction table for volunteer work and tags
export interface ResumeVolunteerTagsJunction {
  id?: string;
  volunteer_id: string;
  tag_id: string;
  created_at?: string;
}

// Aggregated interfaces for API responses
export interface MasterResume {
  contact: ResumeContact;
  skills: ResumeSkill[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  certifications: ResumeCertification[];
  projects: ResumeProject[];
  volunteer: ResumeVolunteer[];
}

export interface TailoredResume {
  contact: ResumeContact;
  summary?: string;
  skills: ResumeSkill[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  certifications: ResumeCertification[];
  projects: ResumeProject[];
  volunteer: ResumeVolunteer[];
}

// Form interfaces for UI
export interface ResumeContactForm {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  professional_summary: string;
}

export interface ResumeSkillForm {
  name: string;
  category: string;
  is_featured: boolean;
  display_order: number;
  tags: string[]; // Keep as string[] for form handling
}

export interface ResumeExperienceForm {
  role: string;
  company: string;
  start_date: string;
  end_date: string;
  image_url: string;
  responsibilities: ResumeResponsibilityForm[];
  managers: ResumeManagerForm[];
}

export interface ResumeManagerForm {
  id?: string;
  manager_name: string;
  start_date: string;
  end_date: string;
}

// Flexible type for experience operations
export interface ResumeExperienceInput {
  role: string;
  company: string;
  start_date?: string;
  end_date?: string;
  image_url?: string;
  responsibilities?: ResumeResponsibilityForm[];
  managers?: ResumeManagerForm[];
}

export interface ResumeResponsibilityForm {
  description: string;
  tags: string[];
}

export interface ResumeEducationForm {
  degree: string;
  school: string;
  minor: string;
  notes: string;
  start_date: string;
  end_date: string;
}

export interface ResumeCertificationForm {
  title: string;
  issued_date: string;
}

export interface ResumeProjectForm {
  title: string;
  description: string;
  tags: string[];
}

export interface ResumeVolunteerForm {
  role: string;
  description: string;
  tags: string[];
}

// Job Tailoring Assistant interfaces
export interface JobDescription {
  text: string;
  company?: string;
  role?: string;
}

export interface TailoringRequest {
  jobDescription: string;
  masterResume: MasterResume;
}

export interface JobBreakdown {
  benefits: string[];
  payRange: string;
  fitRating: number;
  requiredSkills: string[];
  responsibilities: string[];
  matchSummary: string;
}

export interface TailoringResponse {
  jobBreakdown: JobBreakdown;
  tailoredResume: TailoredResume;
  analysis?: string;
  recommendations?: string[];
  _debug?: {
    method: 'mock' | 'openai';
    timestamp: string;
  };
}

// Skill category constants
export const SKILL_CATEGORIES = [
  'Languages & Frameworks',
  'Libraries & Tools',
  'Databases & ORM',
  'Cloud, DevOps & Platforms',
  'ETL & Messaging',
  'Practices & Methodologies'
] as const;

export type SkillCategory = typeof SKILL_CATEGORIES[number];
