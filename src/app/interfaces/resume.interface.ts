// Resume Management System Interfaces

export interface ResumeContact {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ResumeSkill {
  id?: string;
  name: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ResumeSkillTag {
  id?: string;
  skill_id: string;
  tag: string;
}

export interface ResumeExperience {
  id?: string;
  role: string;
  company: string;
  start_date?: string;
  end_date?: string;
  responsibilities?: ResumeResponsibility[];
  created_at?: string;
  updated_at?: string;
}

export interface ResumeResponsibility {
  id?: string;
  experience_id: string;
  description: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ResumeResponsibilityTag {
  id?: string;
  responsibility_id: string;
  tag: string;
}

export interface ResumeEducation {
  id?: string;
  degree: string;
  school: string;
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
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ResumeProjectTag {
  id?: string;
  project_id: string;
  tag: string;
}

export interface ResumeVolunteer {
  id?: string;
  role: string;
  description?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ResumeVolunteerTag {
  id?: string;
  volunteer_id: string;
  tag: string;
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
}

export interface ResumeSkillForm {
  name: string;
  tags: string[];
}

export interface ResumeExperienceForm {
  role: string;
  company: string;
  start_date: string;
  end_date: string;
  responsibilities: ResumeResponsibilityForm[];
}

export interface ResumeResponsibilityForm {
  description: string;
  tags: string[];
}

export interface ResumeEducationForm {
  degree: string;
  school: string;
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

export interface TailoringResponse {
  tailoredResume: TailoredResume;
  analysis?: string;
  recommendations?: string[];
}
