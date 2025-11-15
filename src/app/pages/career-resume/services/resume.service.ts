import { Injectable } from '@angular/core';
import { SupabaseService } from '../../service/supabase.service';
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
  ResumeResponsibility,
  ResumeExperienceInput,
  ResumeManager,
  ResponsibilityMapping
} from '../interfaces/resume.interface';

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

  // Job Exclusion and Responsibility Mapping
  async updateExperienceExclusion(experienceId: string, isExcluded: boolean): Promise<void> {
    const { error } = await this.supabase.getClient()
      .from('resume_experience')
      .update({ is_excluded: isExcluded })
      .eq('id', experienceId);
    
    if (error) throw error;
  }

  async updateExperienceDisplayTags(experienceId: string, displayTags: boolean): Promise<void> {
    const { error } = await this.supabase.getClient()
      .from('resume_experience')
      .update({ display_tags_in_resume: displayTags })
      .eq('id', experienceId);
    
    if (error) throw error;
  }

  async updateExperienceDateAdjustments(
    experienceId: string, 
    adjustDates: boolean, 
    adjustedStartDate?: string, 
    adjustedEndDate?: string
  ): Promise<void> {
    const { error } = await this.supabase.getClient()
      .from('resume_experience')
      .update({ 
        adjust_dates: adjustDates,
        adjusted_start_date: adjustedStartDate || null,
        adjusted_end_date: adjustedEndDate || null
      })
      .eq('id', experienceId);
    
    if (error) throw error;
  }

  async getResponsibilityMappings(experienceId: string): Promise<ResponsibilityMapping[]> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_responsibility_mappings')
      .select('*')
      .eq('source_experience_id', experienceId);
    
    if (error) throw error;
    return data || [];
  }

  async saveResponsibilityMappings(experienceId: string, mappings: Array<{ responsibility_id: string; target_experience_id: string }>): Promise<void> {
    // Get current user ID
    const { data: { user } } = await this.supabase.getClient().auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Delete existing mappings for this experience
    await this.supabase.getClient()
      .from('resume_responsibility_mappings')
      .delete()
      .eq('source_experience_id', experienceId);
    
    // Insert new mappings
    if (mappings && mappings.length > 0) {
      const mappingsToInsert = mappings.map(mapping => ({
        user_id: user.id,
        source_experience_id: experienceId,
        target_experience_id: mapping.target_experience_id,
        responsibility_id: mapping.responsibility_id
      }));
      
      const { error } = await this.supabase.getClient()
        .from('resume_responsibility_mappings')
        .insert(mappingsToInsert);
      
      if (error) throw error;
    }
  }

  /**
   * Get master resume with exclusions and responsibility mappings applied
   * This is used for resume tailoring and generation
   */
  async getMasterResumeForTailoring(): Promise<MasterResume> {
    // Get all data
    const [contact, skills, allExperience, education, certifications, projects, volunteer] = await Promise.all([
      this.getContact(),
      this.getSkills(),
      this.getExperience(),
      this.getEducation(),
      this.getCertifications(),
      this.getProjects(),
      this.getVolunteerWork()
    ]);

    // Separate excluded and non-excluded experiences
    const excludedExperiences = allExperience.filter((exp: ResumeExperience) => exp.is_excluded === true);
    const includedExperiences = allExperience.filter((exp: ResumeExperience) => exp.is_excluded !== true);

    // For each excluded experience, get its mappings and redistribute responsibilities
    for (const excludedExp of excludedExperiences) {
      if (!excludedExp.id) continue;

      const mappings = await this.getResponsibilityMappings(excludedExp.id);
      
      // Apply each mapping
      for (const mapping of mappings) {
        const targetExp = includedExperiences.find((exp: ResumeExperience) => exp.id === mapping.target_experience_id);
        const responsibility = excludedExp.responsibilities?.find(
          (resp: ResumeResponsibility) => resp.id === mapping.responsibility_id
        );
        
        if (targetExp && responsibility) {
          // Add the responsibility to the target experience
          if (!targetExp.responsibilities) {
            targetExp.responsibilities = [];
          }
          targetExp.responsibilities.push(responsibility);
        }
      }
    }

    // Apply date adjustments and tag display settings to included experiences
    const adjustedExperiences = includedExperiences.map((exp: ResumeExperience) => {
      let processedExp: ResumeExperience = { ...exp };
      
      // Apply date adjustments if enabled
      if (exp.adjust_dates === true) {
        processedExp.start_date = exp.adjusted_start_date || exp.start_date;
        processedExp.end_date = exp.adjusted_end_date || exp.end_date;
      }
      
      // Strip tags from responsibilities if display_tags_in_resume is false
      if (exp.display_tags_in_resume === false && processedExp.responsibilities) {
        processedExp.responsibilities = processedExp.responsibilities.map((resp: ResumeResponsibility) => ({
          ...resp,
          tags: [] // Remove tags when display_tags_in_resume is false
        }));
      }
      
      return processedExp;
    });

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
      experience: adjustedExperiences, // Include non-excluded experiences with adjusted dates and tag settings
      education,
      certifications,
      projects,
      volunteer
    };
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
    
    return data ? data.map((tag: { name: string }) => tag.name) : [];
  }

  // Job Tailoring Assistant
  async tailorResume(request: TailoringRequest, useMockMode: boolean = false): Promise<TailoringResponse> {
    // If mock mode is enabled, generate response locally without API call
    if (useMockMode) {
      console.log('Using local mock mode - no API call');
      return this.generateMockTailoredResume(request.jobDescription, request.masterResume);
    }

    // Otherwise, call the Edge Function (AI mode)
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

  // Generate Ideal Resume from Job Description (for Gap Analysis)
  async generateIdealResumeFromJobDescription(jobDescription: string): Promise<TailoredResume> {
    try {
      const { data: { session } } = await this.supabase.getClient().auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await this.supabase.getClient().functions.invoke('ai-generate-ideal-resume', {
        body: { jobDescription },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        console.warn('Edge function error, falling back to mock generation:', response.error);
        // Fallback to mock generation
        return this.generateMockIdealResume(jobDescription);
      }

      return response.data.idealResume;
    } catch (error) {
      console.warn('Error calling edge function, using mock generation:', error);
      // Fallback to mock generation
      return this.generateMockIdealResume(jobDescription);
    }
  }

  // Generate Mock Ideal Resume (fallback when edge function unavailable)
  private generateMockIdealResume(jobDescription: string): TailoredResume {
    const keywords = this.extractKeywords(jobDescription);
    const skills = this.extractRequiredSkills(jobDescription);
    
    // Create ideal skills list
    const idealSkills: any[] = skills.map((skill, idx) => ({
      id: `skill-${idx}`,
      name: skill,
      category: idx < 5 ? 'Languages & Frameworks' : (idx < 10 ? 'Cloud, DevOps & Platforms' : 'Practices & Methodologies'),
      is_featured: idx < 10,
      display_order: idx,
      tags: [skill]
    }));

    // Add some default professional skills if list is short
    if (idealSkills.length < 15) {
      const defaultSkills = ['Problem Solving', 'Communication', 'Leadership', 'Teamwork', 'Agile', 'Scrum'];
      defaultSkills.forEach((skill, idx) => {
        if (!idealSkills.some(s => s.name.toLowerCase() === skill.toLowerCase())) {
          idealSkills.push({
            id: `skill-${idealSkills.length}`,
            name: skill,
            category: 'Practices & Methodologies',
            is_featured: false,
            display_order: idealSkills.length,
            tags: [skill]
          });
        }
      });
    }

    // Create comprehensive set of bullet points for ranking
    const primarySkill = skills[0] || 'Software';
    const allBullets = [
      // Technical Leadership & Architecture
      {
        description: `Architected and deployed enterprise-scale ${skills.slice(0, 3).join(', ')} applications serving 500K+ active users, improving system performance by 45% and reducing infrastructure costs by $2M annually`,
        tags: skills.slice(0, 3)
      },
      {
        description: `Led cross-functional team of 8 engineers to deliver ${keywords[0] || 'innovative'} solutions, reducing deployment time by 60% through automated CI/CD pipelines and DevOps best practices`,
        tags: ['Leadership', 'CI/CD', 'DevOps', 'Team Management']
      },
      {
        description: `Implemented ${skills[1] || 'modern'} architecture patterns and microservices, achieving 99.9% uptime and enabling seamless scaling to handle 10M+ daily transactions`,
        tags: ['Architecture', 'Microservices', 'Scalability', 'Performance']
      },
      {
        description: `Designed and built scalable ${skills[0] || 'web'} applications processing 1M+ transactions daily with 99.99% reliability and sub-200ms response times`,
        tags: [skills[0] || 'Development', 'Scalability', 'Performance']
      },
      {
        description: `Optimized database queries and implemented caching strategies, reducing API response time from 2s to 200ms (90% improvement) and cutting database load by 65%`,
        tags: ['Performance Optimization', 'Database', 'Caching', 'API Development']
      },
      
      // Development & Implementation
      {
        description: `Developed and maintained ${skills[0] || 'web'} applications using ${skills.slice(0, 2).join(' and ')}, implementing responsive design and optimal user experience across web and mobile platforms`,
        tags: ['Full Stack Development', 'UI/UX', 'Cross-Platform']
      },
      {
        description: `Built and deployed ${skills[1] || 'modern'} applications serving 50K+ users, focusing on clean code principles and maintainable architecture`,
        tags: ['Development', 'Code Quality', 'Architecture']
      },
      {
        description: `Created automated testing frameworks and CI/CD pipelines, reducing deployment time by 70% and increasing code quality metrics by 40%`,
        tags: ['Testing', 'CI/CD', 'Automation', 'Quality Assurance']
      },
      {
        description: `Implemented ${keywords[1] || 'modern'} design patterns and best practices, improving code maintainability and reducing technical debt by 30%`,
        tags: ['Design Patterns', 'Code Quality', 'Best Practices']
      },
      
      // Leadership & Mentorship
      {
        description: `Mentored 5 junior developers and established code review standards, increasing team velocity by 40% and reducing production bugs by 55%`,
        tags: ['Mentorship', 'Best Practices', 'Code Review', 'Quality Assurance']
      },
      {
        description: `Led technical interviews and hiring processes, building a high-performing engineering team of 12 developers across multiple time zones`,
        tags: ['Leadership', 'Hiring', 'Team Building', 'Management']
      },
      {
        description: `Collaborated with product managers and designers to deliver features used by 250K+ customers, increasing user engagement by 35% and retention by 28%`,
        tags: ['Collaboration', 'Product Development', 'User Experience']
      },
      
      // Agile & Process
      {
        description: `Participated in agile development sprints, consistently delivering 95% of sprint commitments on time while maintaining 85%+ test coverage`,
        tags: ['Agile', 'Scrum', 'Testing', 'Sprint Planning']
      },
      {
        description: `Established DevOps practices and monitoring systems, reducing mean time to recovery by 60% and improving system observability`,
        tags: ['DevOps', 'Monitoring', 'Observability', 'Incident Response']
      },
      {
        description: `Contributed to open-source projects and technical communities, sharing knowledge through blog posts and conference presentations`,
        tags: ['Open Source', 'Community', 'Knowledge Sharing', 'Public Speaking']
      },
      
      // Problem Solving & Innovation
      {
        description: `Identified and resolved critical performance bottlenecks in legacy systems, improving response times by 80% and reducing server costs by $500K annually`,
        tags: ['Problem Solving', 'Performance', 'Cost Optimization', 'Legacy Systems']
      },
      {
        description: `Researched and implemented emerging technologies including ${skills[2] || 'cloud-native'} solutions, staying ahead of industry trends and best practices`,
        tags: ['Research', 'Innovation', 'Emerging Technologies', 'Cloud']
      },
      {
        description: `Troubleshot complex production issues and implemented preventive measures, reducing system downtime by 90% and improving reliability`,
        tags: ['Troubleshooting', 'Production Support', 'Reliability', 'Incident Management']
      }
    ];

    // Rank all bullets by job relevance
    const rankedBullets = this.rankBulletPoints(allBullets, jobDescription);

    // Create ideal experience with ranked bullets
    const idealExperience: any[] = [
      {
        id: 'exp-1',
        role: `Senior ${primarySkill} Engineer`,
        company: 'Tech Innovation Corp',
        start_date: '2020-01-01',
        end_date: undefined,
        responsibilities: rankedBullets.slice(0, 4).map((bullet, idx) => ({
          id: `resp-${idx + 1}`,
          description: bullet.description,
          tags: bullet.tags,
          relevanceScore: bullet.score
        }))
      },
      {
        id: 'exp-2',
        role: `${primarySkill} Engineer`,
        company: 'Digital Solutions Inc',
        start_date: '2017-06-01',
        end_date: '2019-12-31',
        responsibilities: rankedBullets.slice(4, 7).map((bullet, idx) => ({
          id: `resp-${idx + 5}`,
          description: bullet.description,
          tags: bullet.tags,
          relevanceScore: bullet.score
        }))
      },
      {
        id: 'exp-3',
        role: 'Software Developer',
        company: 'StartUp Ventures',
        start_date: '2015-01-01',
        end_date: '2017-05-31',
        responsibilities: rankedBullets.slice(7, 10).map((bullet, idx) => ({
          id: `resp-${idx + 8}`,
          description: bullet.description,
          tags: bullet.tags,
          relevanceScore: bullet.score
        }))
      }
    ];

    return {
      contact: {
        name: 'Ideal Candidate',
        email: 'ideal.candidate@example.com',
        phone: '555-0100',
        location: 'Remote, USA',
        linkedin: 'linkedin.com/in/ideal-candidate',
        github: 'github.com/ideal-candidate',
        professional_summary: `Highly accomplished ${primarySkill} professional with 10+ years of experience delivering enterprise-scale solutions. Expert in ${skills.slice(0, 5).join(', ')} with proven track record of improving system performance, leading high-performing teams, and driving business outcomes through technical excellence.`
      },
      summary: `Highly accomplished ${primarySkill} professional with 10+ years of experience delivering enterprise-scale solutions. Expert in ${skills.slice(0, 5).join(', ')} with proven track record of improving system performance, leading high-performing teams, and driving business outcomes through technical excellence.`,
      skills: idealSkills as any,
      experience: idealExperience as any,
      education: [
        {
          id: 'edu-1',
          degree: 'Bachelor of Science in Computer Science',
          school: 'State University',
          minor: 'Mathematics',
          notes: 'Summa Cum Laude, GPA: 3.9/4.0',
          start_date: '2011-09-01',
          end_date: '2015-05-01'
        }
      ],
      certifications: [],
      projects: [],
      volunteer: []
    } as TailoredResume;
  }

  // Tag-Based Resume Generation
  async generateTagBasedResume(selectedTags: string[]): Promise<TailoredResume> {
    const masterResume = await this.getMasterResumeForTailoring();
    
    if (!selectedTags || selectedTags.length === 0) {
      // If no tags selected, return the full master resume
      return {
        contact: masterResume.contact,
        summary: masterResume.contact?.professional_summary || 'Experienced professional with a proven track record of delivering results.',
        skills: masterResume.skills,
        experience: masterResume.experience,
        education: masterResume.education,
        certifications: masterResume.certifications,
        projects: masterResume.projects,
        volunteer: masterResume.volunteer
      };
    }

    // Filter skills where tags intersect with selected tags
    const filteredSkills = masterResume.skills.filter((skill: ResumeSkill) => {
      if (!skill.tags || skill.tags.length === 0) return false;
      return skill.tags.some((tag: string | ResumeTag) => {
        const tagName = typeof tag === 'string' ? tag : tag.name;
        return selectedTags.includes(tagName);
      });
    });
    
    // Filter experience with matching responsibilities
    const filteredExperience = masterResume.experience.map((exp: ResumeExperience) => {
      const allResponsibilities = exp.responsibilities || [];
      
      // First get tag-matched responsibilities
      const matchedResponsibilities = allResponsibilities.filter((resp: ResumeResponsibility) => {
        if (!resp.tags || resp.tags.length === 0) return false;
        return resp.tags.some(tag => {
          // Tag can be either a string or a ResumeTag object
          const tagName = typeof tag === 'string' ? tag : (typeof tag === 'object' && 'name' in tag ? tag.name : String(tag));
          return selectedTags.includes(tagName);
        });
      });
      
      // Ensure minimum 3 bullets per job
      let finalResponsibilities = matchedResponsibilities;
      if (matchedResponsibilities.length < 3 && allResponsibilities.length >= 3) {
        // Get unmatched responsibilities
        const unmatchedResponsibilities = allResponsibilities.filter(
          (r: ResumeResponsibility) => !matchedResponsibilities.includes(r)
        );
        
        // Add unmatched responsibilities to reach 3 minimum
        const needed = 3 - matchedResponsibilities.length;
        finalResponsibilities = [
          ...matchedResponsibilities,
          ...unmatchedResponsibilities.slice(0, needed)
        ];
      } else if (allResponsibilities.length < 3) {
        // If job has less than 3 total bullets, include all
        finalResponsibilities = allResponsibilities;
      }
      
      return {
        ...exp,
        responsibilities: finalResponsibilities
      };
    }).filter((exp: ResumeExperience) => (exp.responsibilities?.length || 0) > 0);
    
    // Filter projects where tags intersect with selected tags
    const filteredProjects = masterResume.projects.filter((proj: ResumeProject) => {
      if (!proj.tags || proj.tags.length === 0) return false;
      return proj.tags.some((tag: string | ResumeTag) => {
        const tagName = typeof tag === 'string' ? tag : tag.name;
        return selectedTags.includes(tagName);
      });
    });
    
    // Filter volunteer work where tags intersect with selected tags
    const filteredVolunteer = masterResume.volunteer.filter((vol: ResumeVolunteer) => {
      if (!vol.tags || vol.tags.length === 0) return false;
      return vol.tags.some((tag: string | ResumeTag) => {
        const tagName = typeof tag === 'string' ? tag : tag.name;
        return selectedTags.includes(tagName);
      });
    });
    
    return {
      contact: masterResume.contact,
      summary: masterResume.contact?.professional_summary || 'Experienced professional with a proven track record of delivering results.',
      skills: filteredSkills,
      experience: filteredExperience,
      education: masterResume.education,
      certifications: masterResume.certifications,
      projects: filteredProjects,
      volunteer: filteredVolunteer
    };
  }

  private generateMockTailoredResume(jobDescription: string, masterResume: any): TailoringResponse {
    // Extract keywords from job description
    const keywords = this.extractKeywords(jobDescription);
    
    // Extract benefits and pay
    const benefits = this.extractBenefits(jobDescription);
    const payRange = this.extractPayRange(jobDescription);
    
    // Filter relevant skills
    const skills = masterResume.skills || [];
    const relevantSkills = skills.filter((skill: any) => 
      keywords.some(keyword => 
        skill?.name?.toLowerCase().includes(keyword.toLowerCase()) ||
        (Array.isArray(skill?.tags) && skill.tags.some((tag: any) => 
          typeof tag === 'string' && tag.toLowerCase().includes(keyword.toLowerCase())
        ))
      )
    ).slice(0, 15);
    
    // Filter relevant experience
    const experience = masterResume.experience || [];
    const relevantExperience = experience.map((exp: any) => {
      const allResponsibilities = exp.responsibilities || [];
      
      // Filter for keyword-matched responsibilities
      const matchedResponsibilities = allResponsibilities.filter((resp: any) =>
        keywords.some(keyword =>
          resp?.description?.toLowerCase().includes(keyword.toLowerCase()) ||
          (Array.isArray(resp?.tags) && resp.tags.some((tag: string) => 
            typeof tag === 'string' && tag.toLowerCase().includes(keyword.toLowerCase())
          ))
        )
      );
      
      // Ensure minimum 3 bullets per job
      let finalResponsibilities = matchedResponsibilities;
      if (matchedResponsibilities.length < 3 && allResponsibilities.length >= 3) {
        const needed = 3 - matchedResponsibilities.length;
        const unmatchedResponsibilities = allResponsibilities.filter(
          (r: any) => !matchedResponsibilities.includes(r)
        );
        finalResponsibilities = [
          ...matchedResponsibilities,
          ...unmatchedResponsibilities.slice(0, needed)
        ];
      } else if (allResponsibilities.length < 3) {
        // If job has less than 3 total bullets, include all
        finalResponsibilities = allResponsibilities;
      }
      
      return {
        ...exp,
        responsibilities: finalResponsibilities
      };
    }).filter((exp: any) => exp.responsibilities.length > 0);
    
    // Calculate fit rating
    const totalSkills = skills.length;
    const matchedSkills = relevantSkills.length;
    const totalExperience = experience.length;
    const matchedExperience = relevantExperience.length;
    
    let fitRating = 3;
    if (totalSkills > 0 || totalExperience > 0) {
      const skillMatch = totalSkills > 0 ? matchedSkills / totalSkills : 0.5;
      const expMatch = totalExperience > 0 ? matchedExperience / totalExperience : 0.5;
      const averageMatch = (skillMatch * 0.6) + (expMatch * 0.4);
      
      if (averageMatch >= 0.7) fitRating = 5;
      else if (averageMatch >= 0.55) fitRating = 4;
      else if (averageMatch >= 0.35) fitRating = 3;
      else if (averageMatch >= 0.2) fitRating = 2;
      else fitRating = 1;
    }
    
    const summary = masterResume.contact?.professional_summary 
      || 'Experienced professional with a proven track record of delivering results and driving innovation.';
    
    const requiredSkills = this.extractRequiredSkills(jobDescription);
    const responsibilities = this.extractResponsibilities(jobDescription);
    
    return {
      jobBreakdown: {
        benefits,
        payRange,
        fitRating,
        requiredSkills,
        responsibilities,
        matchSummary: fitRating >= 4
          ? `Strong match with ${matchedSkills} relevant skills and ${matchedExperience} relevant experience areas.`
          : `Moderate match with ${matchedSkills} skills and ${matchedExperience} experience areas that align with the job requirements.`
      },
      tailoredResume: {
        contact: masterResume.contact || {},
        summary,
        skills: relevantSkills,
        experience: relevantExperience,
        education: masterResume.education || [],
        certifications: masterResume.certifications || [],
        projects: masterResume.projects || [],
        volunteer: masterResume.volunteer || []
      },
      analysis: keywords.length > 0 
        ? `Based on the job description, I've identified key requirements including ${keywords.slice(0, 5).join(', ')}. The tailored resume emphasizes relevant experience and skills that match these requirements.`
        : 'Resume has been structured and formatted.',
      recommendations: [
        'Consider adding quantifiable achievements to strengthen your impact',
        'Highlight specific examples of projects or initiatives you led',
        'Ensure technical skills align with the job requirements',
        'Add relevant certifications if available'
      ],
      _debug: {
        method: 'mock',
        timestamp: new Date().toISOString()
      }
    };
  }

  private extractKeywords(text: string): string[] {
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were'];
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word));
    
    const wordCounts = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);
  }

  private extractBenefits(text: string): string[] {
    const benefits: string[] = [];
    const benefitKeywords = [
      'health insurance', 'dental', 'vision', '401k', 'retirement',
      'pto', 'paid time off', 'vacation', 'sick leave',
      'remote', 'work from home', 'flexible', 'hybrid',
      'bonus', 'stock options', 'equity'
    ];
    
    const lowerText = text.toLowerCase();
    benefitKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        const formatted = keyword.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        if (!benefits.includes(formatted)) {
          benefits.push(formatted);
        }
      }
    });
    
    return benefits.length > 0 ? benefits : ['Benefits package available'];
  }

  private extractPayRange(text: string): string {
    const salaryPatterns = [
      /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:\/\s*(?:yr\.?|year)|per year|annually)?\s*(?:to|-)\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:\/\s*(?:yr\.?|year)|per year|annually)?/i,
      /\$\s*(\d+)k\s*(?:to|-)\s*\$?\s*(\d+)k/i,
      /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:\/\s*(?:yr\.?|year)|per year|annually)/i,
      /\$\s*(\d+)k/i
    ];
    
    for (const pattern of salaryPatterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[2]) {
          const min = match[1].replace(/\.00$/, '');
          const max = match[2].replace(/\.00$/, '');
          return `$${min} - $${max} per year`;
        } else {
          const value = match[1].replace(/\.00$/, '');
          return `$${value} per year`;
        }
      }
    }
    
    return 'Compensation not specified';
  }

  private extractRequiredSkills(text: string): string[] {
    const textLower = text.toLowerCase();
    const foundSkills = new Set<string>();
    
    // Comprehensive skill patterns matching gap analysis service
    const skillPatterns = {
      languages: ['javascript', 'typescript', 'python', 'java', 'c#', 'csharp', 'c\\+\\+', 'ruby', 'php', 'go', 'rust', 'swift', 'kotlin'],
      frontend: ['react', 'angular', 'vue', 'html', 'css', 'sass', 'less', 'tailwind', 'bootstrap', 'jquery'],
      backend: ['node\\.js', 'nodejs', 'express', 'django', 'flask', 'spring', 'spring boot', '\\.net', 'asp\\.net', 'fastapi', 'laravel'],
      databases: ['sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'oracle', 'dynamodb', 'cassandra'],
      cloud: ['aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s', 'terraform', 'ansible'],
      tools: ['git', 'github', 'gitlab', 'jira', 'jenkins', 'ci/cd', 'cicd', 'devops', 'maven', 'gradle', 'npm', 'webpack']
    };
    
    // Search for each skill pattern
    Object.values(skillPatterns).flat().forEach(pattern => {
      const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
      const matches = textLower.match(regex);
      if (matches) {
        // Normalize the skill name
        let normalized = matches[0]
          .replace(/\./g, '')  // Remove dots
          .replace(/\\/g, '')  // Remove backslashes from regex patterns
          .trim();
        
        // Special formatting for specific skills
        if (normalized === 'nodejs' || normalized === 'node js') {
          normalized = 'Node.js';
        } else if (normalized === 'cicd' || normalized === 'ci/cd' || normalized === 'ci cd') {
          normalized = 'CI/CD';
        } else if (normalized === 'csharp' || normalized === 'c#') {
          normalized = 'C#';
        } else if (normalized === 'c++') {
          normalized = 'C++';
        } else if (normalized === 'net' || normalized === '.net') {
          normalized = '.NET';
        } else if (normalized === 'aspnet' || normalized === 'asp.net') {
          normalized = 'ASP.NET';
        } else if (normalized === 'k8s') {
          normalized = 'Kubernetes';
        } else if (normalized === 'postgres') {
          normalized = 'PostgreSQL';
        } else {
          // Standard capitalization
          normalized = normalized
            .split(/[\s-]+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
        
        foundSkills.add(normalized);
      }
    });
    
    return Array.from(foundSkills);
  }

  // STAR Method + ATS Optimization
  async optimizeBulletPoint(bulletPoint: string, jobDescription: string): Promise<{ optimizedText: string, method: 'ai' | 'mock' }> {
    const maxRetries = 2;
    
    // Truncate job description to avoid API limits (max 2000 chars)
    const truncatedJobDescription = jobDescription.length > 2000 
      ? jobDescription.substring(0, 2000) + '...'
      : jobDescription;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data: { session } } = await this.supabase.getClient().auth.getSession();
        
        if (!session) {
          throw new Error('User not authenticated');
        }

        const keywords = this.extractRequiredSkills(truncatedJobDescription);

        console.log(`Attempt ${attempt}/${maxRetries} - Calling Edge Function with bullet:`, bulletPoint.substring(0, 50) + '...');
        
        const response = await this.supabase.getClient().functions.invoke('ai-optimize-bullet', {
          body: { 
            bulletPoint, 
            jobDescription: truncatedJobDescription, 
            keywords 
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        
        console.log('Edge Function response:', response);

        if (response.error) {
          console.warn(`Edge function error on attempt ${attempt}:`, response.error);
          if (attempt < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 500 * attempt));
            continue;
          }
          // Final attempt failed, use mock
          return {
            optimizedText: this.generateMockOptimization(bulletPoint, truncatedJobDescription),
            method: 'mock'
          };
        }

        // Check if response has the debug info to determine method
        const method = response.data._debug?.method || 'ai';
        return {
          optimizedText: response.data.optimizedBullet || bulletPoint,
          method: method as 'ai' | 'mock'
        };
      } catch (error) {
        console.warn(`Error on attempt ${attempt}/${maxRetries}:`, error);
        if (attempt < maxRetries) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }
        // All retries failed, use mock
        return {
          optimizedText: this.generateMockOptimization(bulletPoint, truncatedJobDescription),
          method: 'mock'
        };
      }
    }

    // Fallback (should never reach here)
    return {
      optimizedText: this.generateMockOptimization(bulletPoint, truncatedJobDescription),
      method: 'mock'
    };
  }

  // Mock optimization fallback
  private generateMockOptimization(bulletPoint: string, jobDescription: string): string {
    let optimized = bulletPoint;
    
    // Extract keywords from job description
    const keywords = this.extractRequiredSkills(jobDescription);
    
    // Improve action verbs
    const verbImprovements = {
      'worked on': 'developed',
      'helped with': 'led',
      'was responsible for': 'managed',
      'did': 'implemented',
      'made': 'created',
      'fixed': 'resolved',
      'used': 'leveraged',
      'handled': 'managed',
      'took care of': 'coordinated'
    };
    
    Object.entries(verbImprovements).forEach(([old, new_]) => {
      optimized = optimized.replace(new RegExp(old, 'gi'), new_);
    });
    
    // Add metrics if not present
    if (!/\d+[%$km]?/.test(optimized)) {
      const metrics = ['by 25%', 'by 40%', 'by 60%', 'by 30%', 'by 50%', 'by 35%', 'by 20%'];
      const randomMetric = metrics[Math.floor(Math.random() * metrics.length)];
      optimized += `, improving efficiency ${randomMetric}`;
    }
    
    // Add scale indicators if not present
    if (!/(serving|processing|managing|handling|supporting)/i.test(optimized)) {
      const scaleIndicators = [
        'serving 100K+ users', 'processing 1M+ transactions', 'managing team of 8',
        'handling 500K+ daily requests', 'supporting 50+ clients', 'reducing costs by $100K'
      ];
      const randomScale = scaleIndicators[Math.floor(Math.random() * scaleIndicators.length)];
      optimized = optimized.replace(/\.$/, `, ${randomScale}.`);
    }
    
    // Add relevant keywords from job description
    if (keywords.length > 0) {
      const relevantKeyword = keywords[Math.floor(Math.random() * keywords.length)];
      if (!optimized.toLowerCase().includes(relevantKeyword.toLowerCase())) {
        optimized = optimized.replace(/\.$/, ` using ${relevantKeyword}.`);
      }
    }
    
    // Ensure it starts with a strong action verb
    const strongVerbs = ['Led', 'Developed', 'Implemented', 'Designed', 'Managed', 'Created', 'Optimized', 'Enhanced'];
    const firstWord = optimized.split(' ')[0];
    if (!strongVerbs.some(verb => firstWord.toLowerCase().includes(verb.toLowerCase()))) {
      optimized = `Developed ${optimized.toLowerCase()}`;
    }
    
    return optimized;
  }

  /**
   * Score and rank bullet points based on job description relevance
   */
  private rankBulletPoints(bullets: Array<{description: string, tags: string[]}>, jobDescription: string): Array<{description: string, tags: string[], score: number}> {
    const jobKeywords = this.extractKeywords(jobDescription);
    const jobSkills = this.extractRequiredSkills(jobDescription);
    const jobLower = jobDescription.toLowerCase();
    
    return bullets.map(bullet => {
      let score = 0;
      const bulletLower = bullet.description.toLowerCase();
      
      // Score based on keyword matches in description
      jobKeywords.forEach(keyword => {
        if (bulletLower.includes(keyword.toLowerCase())) {
          score += 10; // High weight for direct keyword matches
        }
      });
      
      // Score based on skill matches in description
      jobSkills.forEach(skill => {
        if (bulletLower.includes(skill.toLowerCase())) {
          score += 15; // Higher weight for skill matches
        }
      });
      
      // Score based on tag matches
      bullet.tags.forEach(tag => {
        if (jobSkills.some(skill => skill.toLowerCase() === tag.toLowerCase())) {
          score += 12; // High weight for tag matches
        }
        if (jobKeywords.some(keyword => keyword.toLowerCase() === tag.toLowerCase())) {
          score += 8; // Medium weight for keyword tag matches
        }
      });
      
      // Score based on action verbs and impact indicators
      const actionVerbs = ['led', 'managed', 'developed', 'implemented', 'designed', 'architected', 'optimized', 'improved', 'increased', 'reduced', 'delivered', 'built', 'created', 'established'];
      actionVerbs.forEach(verb => {
        if (bulletLower.includes(verb)) {
          score += 2; // Small bonus for strong action verbs
        }
      });
      
      // Score based on quantifiable results
      const hasNumbers = /\d+[%$km]?/.test(bullet.description);
      if (hasNumbers) {
        score += 5; // Bonus for quantifiable results
      }
      
      // Score based on scale indicators
      const scaleWords = ['enterprise', 'large-scale', 'high-volume', 'millions', 'thousands', 'team', 'cross-functional'];
      scaleWords.forEach(word => {
        if (bulletLower.includes(word)) {
          score += 3; // Bonus for scale indicators
        }
      });
      
      return {
        ...bullet,
        score
      };
    }).sort((a, b) => b.score - a.score); // Sort by score descending (best first)
  }

  private extractResponsibilities(text: string): string[] {
    const responsibilities: string[] = [];
    const bulletPattern = /(?:^|\n)\s*(?:[-•*]|\d+\.)\s*([^\n]+)/g;
    const matches = text.matchAll(bulletPattern);
    
    for (const match of matches) {
      const resp = match[1].trim();
      if (resp.length > 20 && resp.length < 200) {
        responsibilities.push(resp);
      }
    }
    
    return responsibilities.slice(0, 8);
  }

  // Tag Management
  async createTag(tagName: string): Promise<ResumeTag> {
    return await this.masterService.createOrGetTag(tagName);
  }
}
