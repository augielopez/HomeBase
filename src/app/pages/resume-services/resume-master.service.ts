import { Injectable } from '@angular/core';
import { SupabaseService } from '../service/supabase.service';
import { ResumeTag } from '../../interfaces/resume.interface';

@Injectable({
  providedIn: 'root'
})
export class ResumeMasterService {

  constructor(private supabase: SupabaseService) { }

  /**
   * Get all tags from the master tags table
   */
  async getAllTags(): Promise<ResumeTag[]> {
    try {
      const { data, error } = await this.supabase.getClient()
        .from('resume_tags')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all tags:', error);
      return [];
    }
  }

  /**
   * Get all unique tag names as strings (for backward compatibility)
   */
  async getAllTagNames(): Promise<string[]> {
    const tags = await this.getAllTags();
    return tags.map(tag => tag.name);
  }

  /**
   * Get all skill tags
   */
  async getSkillTags(): Promise<string[]> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_skill_tags_junction')
      .select(`
        resume_tags (
          name
        )
      `);
    
    if (error) throw error;
    return data?.flatMap((item: any) => 
      Array.isArray(item.resume_tags) 
        ? item.resume_tags.map((tag: any) => tag.name)
        : item.resume_tags?.name ? [item.resume_tags.name] : []
    ).filter(Boolean) || [];
  }

  /**
   * Get all experience responsibility tags
   */
  async getExperienceTags(): Promise<string[]> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_experience_tags_junction')
      .select(`
        resume_tags (
          name
        )
      `);
    
    if (error) throw error;
    return data?.flatMap((item: any) => 
      Array.isArray(item.resume_tags) 
        ? item.resume_tags.map((tag: any) => tag.name)
        : item.resume_tags?.name ? [item.resume_tags.name] : []
    ).filter(Boolean) || [];
  }

  /**
   * Get all project tags
   */
  async getProjectTags(): Promise<string[]> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_project_tags_junction')
      .select(`
        resume_tags (
          name
        )
      `);
    
    if (error) throw error;
    return data?.flatMap((item: any) => 
      Array.isArray(item.resume_tags) 
        ? item.resume_tags.map((tag: any) => tag.name)
        : item.resume_tags?.name ? [item.resume_tags.name] : []
    ).filter(Boolean) || [];
  }

  /**
   * Get all volunteer work tags
   */
  async getVolunteerTags(): Promise<string[]> {
    const { data, error } = await this.supabase.getClient()
      .from('resume_volunteer_tags_junction')
      .select(`
        resume_tags (
          name
        )
      `);
    
    if (error) throw error;
    return data?.flatMap((item: any) => 
      Array.isArray(item.resume_tags) 
        ? item.resume_tags.map((tag: any) => tag.name)
        : item.resume_tags?.name ? [item.resume_tags.name] : []
    ).filter(Boolean) || [];
  }

  /**
   * Search tags based on query (for autocomplete)
   */
  async searchTags(query: string, tagType?: 'skill' | 'experience' | 'project' | 'volunteer'): Promise<string[]> {
    try {
      // Always search the master tags table
      const { data, error } = await this.supabase.getClient()
        .from('resume_tags')
        .select('name')
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(15);
      
      if (error) throw error;
      
      return data?.map(tag => tag.name) || [];
    } catch (error) {
      console.error('Error searching tags:', error);
      return [];
    }
  }

  /**
   * Get tag statistics (how many times each tag is used)
   */
  async getTagStatistics(): Promise<{ tag: string; count: number }[]> {
    try {
      const allTags = await this.getAllTags();
      const tagStats: { [key: string]: number } = {};

      // Count occurrences of each tag
      const [skillTags, experienceTags, projectTags, volunteerTags] = await Promise.all([
        this.getSkillTags(),
        this.getExperienceTags(),
        this.getProjectTags(),
        this.getVolunteerTags()
      ]);

      [...skillTags, ...experienceTags, ...projectTags, ...volunteerTags].forEach(tag => {
        tagStats[tag] = (tagStats[tag] || 0) + 1;
      });

      return Object.entries(tagStats)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Error getting tag statistics:', error);
      return [];
    }
  }

  /**
   * Get popular tags (most frequently used)
   */
  async getPopularTags(limit: number = 10): Promise<string[]> {
    try {
      const tagStats = await this.getTagStatistics();
      return tagStats.slice(0, limit).map(stat => stat.tag);
    } catch (error) {
      console.error('Error getting popular tags:', error);
      return [];
    }
  }

  /**
   * Create a new tag if it doesn't exist, return existing tag if it does
   */
  async createOrGetTag(tagName: string): Promise<ResumeTag> {
    try {
      // First, try to get existing tag
      const { data: existingTag, error: selectError } = await this.supabase.getClient()
        .from('resume_tags')
        .select('*')
        .eq('name', tagName)
        .single();
      
      if (existingTag) {
        return existingTag;
      }

      // If tag doesn't exist, create it
      const { data: newTag, error: insertError } = await this.supabase.getClient()
        .from('resume_tags')
        .insert({ name: tagName })
        .select()
        .single();
      
      if (insertError) throw insertError;
      return newTag;
    } catch (error) {
      console.error('Error creating or getting tag:', error);
      throw error;
    }
  }

  /**
   * Get tag by name
   */
  async getTagByName(tagName: string): Promise<ResumeTag | null> {
    try {
      const { data, error } = await this.supabase.getClient()
        .from('resume_tags')
        .select('*')
        .eq('name', tagName)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
      return data;
    } catch (error) {
      console.error('Error getting tag by name:', error);
      return null;
    }
  }
}
