import { Injectable } from '@angular/core';
import { SupabaseService } from '../service/supabase.service';
import { ResumeMasterService } from './resume-master.service';
import { 
  ResumeContact, 
  ResumeSkill, 
  ResumeExperience, 
  ResumeEducation, 
  ResumeCertification, 
  ResumeProject, 
  ResumeVolunteer,
  MasterResume,
  TailoredResume,
  TailoringRequest,
  TailoringResponse,
  ResumeTag,
  ResumeExperienceInput,
  ResumeManager
} from '../../interfaces/resume.interface';

@Injectable({
  providedIn: 'root'
})
export class ResumeService {

  constructor(
    private supabase: SupabaseService,
    private masterService: ResumeMasterService
  ) {}

  // Contact Information
  async getContact(): Promise<ResumeContact | null> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_contact')
      .select('*')
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }
    
    return data;
  }

  async upsertContact(contact: ResumeContact): Promise<ResumeContact> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_contact')
      .upsert(contact)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Skills
  async getSkills(): Promise<ResumeSkill[]> {
    const { data: skills, error } = await this.supabase.getClient()
      .from('resume_skills')
      .select(`
        *,
        resume_skill_tags_junction (
          resume_tags (*)
        )
      `)
      .order('is_featured', { ascending: false })
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    return skills.map((skill: any) => ({
      ...skill,
      tags: skill.resume_skill_tags_junction?.map((junction: any) => junction.resume_tags) || []
    }));
  }

  async createSkill(skill: ResumeSkill | { name: string; category?: string; is_featured?: boolean; display_order?: number; tags: string[] }): Promise<ResumeSkill> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_skills')
      .insert({ 
        name: skill.name,
        category: (skill as any).category || null,
        is_featured: (skill as any).is_featured || false,
        display_order: (skill as any).display_order || 0
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Insert tags if provided
    if (skill.tags && skill.tags.length > 0) {
      await this.updateSkillTags(data.id, skill.tags);
    }
    
    // Return the skill with tags populated
    const createdSkill = await this.getSkillById(data.id);
    return createdSkill;
  }

  /**
   * Helper method to get a single skill by ID with tags
   */
  private async getSkillById(id: string): Promise<ResumeSkill> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_skills')
      .select(`
        *,
        resume_skill_tags_junction (
          resume_tags (*)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return {
      ...data,
      tags: data.resume_skill_tags_junction?.map((junction: any) => junction.resume_tags) || []
    };
  }

  /**
   * Helper method to handle tag updates for skills
   */
  private async updateSkillTags(skillId: string, tags: ResumeTag[] | string[]): Promise<void> {
    // Delete existing tag relationships
    await this.supabase.getClient()
      .from('resume_skill_tags_junction')
      .delete()
      .eq('skill_id', skillId);
    
    // Create new tag relationships
    if (tags.length > 0) {
      const tagIds: string[] = [];
      
      // Convert string tags to ResumeTag objects if needed
      for (const tag of tags) {
        let tagObj: ResumeTag;
        if (typeof tag === 'string') {
          tagObj = await this.masterService.createOrGetTag(tag);
        } else {
          tagObj = tag;
        }
        tagIds.push(tagObj.id!);
      }
      
      // Insert new tag relationships
      const junctionInserts = tagIds.map(tagId => ({ skill_id: skillId, tag_id: tagId }));
      const { error } = await this.supabase.getClient()
        .from('resume_skill_tags_junction')
        .insert(junctionInserts);
      
      if (error) throw error;
    }
  }

  /**
   * Helper method to handle tag updates for projects
   */
  private async updateProjectTags(projectId: string, tags: ResumeTag[] | string[]): Promise<void> {
    // Delete existing tag relationships
    await this.supabase.getClient()
      .from('resume_project_tags_junction')
      .delete()
      .eq('project_id', projectId);
    
    // Create new tag relationships
    if (tags.length > 0) {
      const tagIds: string[] = [];
      
      // Convert string tags to ResumeTag objects if needed
      for (const tag of tags) {
        let tagObj: ResumeTag;
        if (typeof tag === 'string') {
          tagObj = await this.masterService.createOrGetTag(tag);
        } else {
          tagObj = tag;
        }
        tagIds.push(tagObj.id!);
      }
      
      // Insert new tag relationships
      const junctionInserts = tagIds.map(tagId => ({ project_id: projectId, tag_id: tagId }));
      const { error } = await this.supabase.getClient()
        .from('resume_project_tags_junction')
        .insert(junctionInserts);
      
      if (error) throw error;
    }
  }

  /**
   * Helper method to handle tag updates for volunteer work
   */
  private async updateVolunteerTags(volunteerId: string, tags: ResumeTag[] | string[]): Promise<void> {
    // Delete existing tag relationships
    await this.supabase.getClient()
      .from('resume_volunteer_tags_junction')
      .delete()
      .eq('volunteer_id', volunteerId);
    
    // Create new tag relationships
    if (tags.length > 0) {
      const tagIds: string[] = [];
      
      // Convert string tags to ResumeTag objects if needed
      for (const tag of tags) {
        let tagObj: ResumeTag;
        if (typeof tag === 'string') {
          tagObj = await this.masterService.createOrGetTag(tag);
        } else {
          tagObj = tag;
        }
        tagIds.push(tagObj.id!);
      }
      
      // Insert new tag relationships
      const junctionInserts = tagIds.map(tagId => ({ volunteer_id: volunteerId, tag_id: tagId }));
      const { error } = await this.supabase.getClient()
        .from('resume_volunteer_tags_junction')
        .insert(junctionInserts);
      
      if (error) throw error;
    }
  }

  /**
   * Helper method to get a single project by ID with tags
   */
  private async getProjectById(id: string): Promise<ResumeProject> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_projects')
      .select(`
        *,
        resume_project_tags_junction (
          resume_tags (*)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return {
      ...data,
      tags: data.resume_project_tags_junction?.map((junction: any) => junction.resume_tags) || []
    };
  }

  /**
   * Helper method to get a single volunteer work by ID with tags
   */
  private async getVolunteerById(id: string): Promise<ResumeVolunteer> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_volunteer')
      .select(`
        *,
        resume_volunteer_tags_junction (
          resume_tags (*)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return {
      ...data,
      tags: data.resume_volunteer_tags_junction?.map((junction: any) => junction.resume_tags.name) || []
    };
  }

  async updateSkill(id: string, skill: ResumeSkill | { name: string; category?: string; is_featured?: boolean; display_order?: number; tags: string[] }): Promise<ResumeSkill> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_skills')
      .update({ 
        name: skill.name,
        category: (skill as any).category || null,
        is_featured: (skill as any).is_featured !== undefined ? (skill as any).is_featured : false,
        display_order: (skill as any).display_order !== undefined ? (skill as any).display_order : 0
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Update tags if provided
    if (skill.tags) {
      await this.updateSkillTags(id, skill.tags);
    }
    
    // Return the updated skill with tags populated
    return await this.getSkillById(id);
  }

  async deleteSkill(id: string): Promise<void> {
    const { error } = await this.supabase.getClient()
      .from('resume_skills')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }


  // Experience
  async getExperience(): Promise<ResumeExperience[]> {
    const { data: experiences, error } = await this.supabase.getClient()
      .from('resume_experience')
      .select(`
        *,
        resume_responsibilities(
          id,
          description,
          experience_id,
          created_at,
          resume_responsibility_tags_junction(
            resume_tags(*)
          )
        ),
        resume_managers(
          id,
          manager_name,
          start_date,
          end_date,
          created_at
        )
      `)
      .order('start_date', { ascending: false, nullsFirst: false });
    
    if (error) throw error;
    
    return experiences.map((exp: any) => ({
      ...exp,
      responsibilities: exp.resume_responsibilities?.map((resp: any) => ({
        ...resp,
        tags: resp.resume_responsibility_tags_junction?.map((junction: any) => junction.resume_tags.name) || []
      })) || [],
      managers: exp.resume_managers || []
    }));
  }

  async createExperience(experience: ResumeExperienceInput): Promise<ResumeExperience> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_experience')
      .insert({
        role: experience.role,
        company: experience.company,
        start_date: experience.start_date && experience.start_date.trim() !== '' ? experience.start_date : null,
        end_date: experience.end_date && experience.end_date.trim() !== '' ? experience.end_date : null,
        image_url: experience.image_url || null
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Insert responsibilities if provided
    if (experience.responsibilities && experience.responsibilities.length > 0) {
      await this.updateExperienceResponsibilities(data.id, experience.responsibilities);
    }
    
    // Insert managers if provided
    if (experience.managers && experience.managers.length > 0) {
      await this.updateExperienceManagers(data.id, experience.managers);
    }
    
    return { 
      ...data, 
      responsibilities: experience.responsibilities || [],
      managers: experience.managers || []
    };
  }

  async updateExperience(id: string, experience: ResumeExperienceInput): Promise<ResumeExperience> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_experience')
      .update({
        role: experience.role,
        company: experience.company,
        start_date: experience.start_date && experience.start_date.trim() !== '' ? experience.start_date : null,
        end_date: experience.end_date && experience.end_date.trim() !== '' ? experience.end_date : null,
        image_url: experience.image_url || null
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Update responsibilities if provided
    if (experience.responsibilities) {
      await this.updateExperienceResponsibilities(id, experience.responsibilities);
    }
    
    // Update managers if provided
    if (experience.managers) {
      await this.updateExperienceManagers(id, experience.managers);
    }
    
    return { 
      ...data, 
      responsibilities: experience.responsibilities || [],
      managers: experience.managers || []
    };
  }

  async deleteExperience(id: string): Promise<void> {
    const { error } = await this.supabase.getClient()
      .from('resume_experience')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  private async updateExperienceResponsibilities(experienceId: string, responsibilities: any[]): Promise<void> {
    // Delete existing responsibilities (cascade will delete tags)
    await this.supabase.getClient()
      .from('resume_responsibilities')
      .delete()
      .eq('experience_id', experienceId);
    
    // Insert new responsibilities with tags
    if (responsibilities && responsibilities.length > 0) {
      for (const resp of responsibilities) {
        // Insert responsibility
        const { data: respData, error: respError } = await this.supabase.getClient()
          .from('resume_responsibilities')
          .insert({
            experience_id: experienceId,
            description: resp.description
          })
          .select()
          .single();
        
        if (respError) throw respError;
        
        // Insert tags for this responsibility
        if (resp.tags && resp.tags.length > 0) {
          const tagIds = [];
          for (const tag of resp.tags) {
            let tagObj: ResumeTag;
            if (typeof tag === 'string') {
              tagObj = await this.masterService.createOrGetTag(tag);
            } else {
              tagObj = tag;
            }
            tagIds.push(tagObj.id);
          }
          
          // Bulk insert all tag relationships for this responsibility
          const junctionInserts = tagIds.map(tagId => ({
            responsibility_id: respData.id,
            tag_id: tagId
          }));
          
          const { error: tagError } = await this.supabase.getClient()
            .from('resume_responsibility_tags_junction')
            .insert(junctionInserts);
          
          if (tagError) {
            console.error('Error inserting responsibility tags:', tagError);
            throw tagError;
          }
        }
      }
    }
  }

  private async updateExperienceManagers(experienceId: string, managers: any[]): Promise<void> {
    // Get current user ID
    const { data: { user } } = await this.supabase.getClient().auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Delete existing managers
    await this.supabase.getClient()
      .from('resume_managers')
      .delete()
      .eq('experience_id', experienceId);
    
    // Insert new managers
    if (managers && managers.length > 0) {
      const managersToInsert = managers.map(manager => ({
        user_id: user.id,
        experience_id: experienceId,
        manager_name: manager.manager_name,
        start_date: manager.start_date && manager.start_date.trim() !== '' ? manager.start_date : null,
        end_date: manager.end_date && manager.end_date.trim() !== '' ? manager.end_date : null
      }));
      
      const { error } = await this.supabase.getClient()
        .from('resume_managers')
        .insert(managersToInsert);
      
      if (error) throw error;
    }
  }

  // Education
  async getEducation(): Promise<ResumeEducation[]> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_education')
      .select('*')
      .order('end_date', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async createEducation(education: ResumeEducation): Promise<ResumeEducation> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_education')
      .insert(education)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateEducation(id: string, education: ResumeEducation): Promise<ResumeEducation> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_education')
      .update(education)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteEducation(id: string): Promise<void> {
    const { error } = await this.supabase.getClient()
      .from('resume_education')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Certifications
  async getCertifications(): Promise<ResumeCertification[]> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_certifications')
      .select('*')
      .order('issued_date', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async createCertification(certification: ResumeCertification): Promise<ResumeCertification> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_certifications')
      .insert(certification)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateCertification(id: string, certification: ResumeCertification): Promise<ResumeCertification> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_certifications')
      .update(certification)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteCertification(id: string): Promise<void> {
    const { error } = await this.supabase.getClient()
      .from('resume_certifications')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Projects
  async getProjects(): Promise<ResumeProject[]> {
    const { data: projects, error } = await this.supabase.getClient()
      .from('resume_projects')
      .select(`
        *,
        resume_project_tags_junction(
          resume_tags(*)
        )
      `);
    
    if (error) throw error;
    
    return projects.map((project: any) => ({
      ...project,
      tags: project.resume_project_tags_junction?.map((junction: any) => junction.resume_tags.name) || []
    }));
  }

  async createProject(project: ResumeProject | { title: string; description?: string; tags: string[] }): Promise<ResumeProject> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_projects')
      .insert({ title: project.title, description: project.description })
      .select()
      .single();
    
    if (error) throw error;
    
    // Insert tags if provided
    if (project.tags && project.tags.length > 0) {
      await this.updateProjectTags(data.id, project.tags);
    }
    
    // Return the project with tags populated
    const createdProject = await this.getProjectById(data.id);
    return createdProject;
  }

  async updateProject(id: string, project: ResumeProject | { title: string; description?: string; tags: string[] }): Promise<ResumeProject> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_projects')
      .update({ title: project.title, description: project.description })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Update tags if provided
    if (project.tags) {
      await this.updateProjectTags(id, project.tags);
    }
    
    // Return the updated project with tags populated
    return await this.getProjectById(id);
  }

  async deleteProject(id: string): Promise<void> {
    const { error } = await this.supabase.getClient()
      .from('resume_projects')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }


  // Volunteer Work
  async getVolunteerWork(): Promise<ResumeVolunteer[]> {
    const { data: volunteer, error } = await this.supabase.getClient()
      .from('resume_volunteer')
      .select(`
        *,
        resume_volunteer_tags_junction(
          resume_tags(*)
        )
      `);
    
    if (error) throw error;
    
    return volunteer.map((vol: any) => ({
      ...vol,
      tags: vol.resume_volunteer_tags_junction?.map((junction: any) => junction.resume_tags.name) || []
    }));
  }

  async createVolunteerWork(volunteer: ResumeVolunteer | { role: string; description?: string; tags: string[] }): Promise<ResumeVolunteer> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_volunteer')
      .insert({ role: volunteer.role, description: volunteer.description })
      .select()
      .single();
    
    if (error) throw error;
    
    // Insert tags if provided
    if (volunteer.tags && volunteer.tags.length > 0) {
      await this.updateVolunteerTags(data.id, volunteer.tags);
    }
    
    // Return the volunteer work with tags populated
    const createdVolunteer = await this.getVolunteerById(data.id);
    return createdVolunteer;
  }

  async updateVolunteerWork(id: string, volunteer: ResumeVolunteer | { role: string; description?: string; tags: string[] }): Promise<ResumeVolunteer> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_volunteer')
      .update({ role: volunteer.role, description: volunteer.description })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Update tags if provided
    if (volunteer.tags) {
      await this.updateVolunteerTags(id, volunteer.tags);
    }
    
    // Return the updated volunteer work with tags populated
    return await this.getVolunteerById(id);
  }

  async deleteVolunteerWork(id: string): Promise<void> {
    const { error } = await this.supabase.getClient()
      .from('resume_volunteer')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }


  // Master Resume
  async getMasterResume(): Promise<MasterResume> {
    const [contact, skills, experience, education, certifications, projects, volunteer] = await Promise.all([
      this.getContact(),
      this.getSkills(),
      this.getExperience(),
      this.getEducation(),
      this.getCertifications(),
      this.getProjects(),
      this.getVolunteerWork()
    ]);

    return {
      contact: contact || {
        name: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        github: ''
      },
      skills,
      experience,
      education,
      certifications,
      projects,
      volunteer
    };
  }

  // Tags
  async getAllTags(): Promise<string[]> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_tags')
      .select('name')
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    return data ? data.map(tag => tag.name) : [];
  }

  // Job Tailoring Assistant
  async tailorResume(request: TailoringRequest): Promise<TailoringResponse> {
    const { data: { session } } = await this.supabase.getClient().auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const response = await this.supabase.getClient().functions.invoke('ai-tailor-resume', {
      body: request,
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (response.error) {
      throw new Error(`Failed to tailor resume: ${response.error.message}`);
    }

    return response.data;
  }

  // Tag Management
  async createTag(tagName: string): Promise<ResumeTag> {
    return await this.masterService.createOrGetTag(tagName);
  }
}
