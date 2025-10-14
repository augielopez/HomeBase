import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipsModule } from 'primeng/chips';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { AccordionModule } from 'primeng/accordion';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ResumeService } from '../../resume-services/resume.service';
import { ResumeExperience, ResumeExperienceForm, ResumeResponsibilityForm, ResumeManagerForm } from '../../../interfaces/resume.interface';

@Component({
  selector: 'app-resume-experience',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AutoCompleteModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    ChipsModule,
    ConfirmDialogModule,
    DialogModule,
    DividerModule,
    DropdownModule,
    InputTextModule,
    MessageModule,
    ProgressSpinnerModule,
    TableModule,
    TagModule,
    TextareaModule,
    ToastModule,
    TooltipModule,
    AccordionModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './resume-experience.component.html',
  styleUrl: './resume-experience.component.scss'
})
export class ResumeExperienceComponent implements OnInit {
  experiences: ResumeExperience[] = [];
  experienceForm: ResumeExperienceForm = {
    role: '',
    company: '',
    start_date: '',
    end_date: '',
    image_url: '',
    responsibilities: [],
    managers: []
  };
  
  loading = false;
  saving = false;
  showDialog = false;
  editingExperience: ResumeExperience | null = null;
  
  // Tag management
  allTags: string[] = [];
  filteredTags: string[] = [];
  
  // Job settings dialog
  showJobSettingsDialog = false;
  selectedJobForSettings: ResumeExperience | null = null;
  isJobExcluded = false;
  adjustDates = false;
  adjustedStartDate = '';
  adjustedEndDate = '';
  displayTagsInResume = true; // Default to true (show tags)
  responsibilityMappings = new Map<string, string>(); // responsibility_id -> target_experience_id
  availableTargetJobs: Array<{ id: string; displayLabel: string }> = [];
  savingSettings = false;
  
  // Available images from assets/images folder
  availableImages = [
    { label: 'None', value: '' },
    { label: 'Centene', value: 'assets/images/centene.png' },
    { label: 'HealthNet', value: 'assets/images/healthnet.png' },
    { label: 'Hyland', value: 'assets/images/hyland.png' },
    { label: 'Orion', value: 'assets/images/orion.png' },
    { label: 'Envolve', value: 'assets/images/envolve.png' },
    { label: 'Informa', value: 'assets/images/informa.png' },
    { label: 'DeVry', value: 'assets/images/devry.png' },
    { label: 'BestBuy', value: 'assets/images/bestbuy.png' },
  ];

  constructor(
    private resumeService: ResumeService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  async ngOnInit() {
    await Promise.all([
      this.loadExperiences(),
      this.loadAllTags()
    ]);
  }

  async loadExperiences() {
    this.loading = true;
    try {
      this.experiences = await this.resumeService.getExperience();
    } catch (error) {
      console.error('Error loading experiences:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load work experiences'
      });
    } finally {
      this.loading = false;
    }
  }

  async loadAllTags() {
    try {
      this.allTags = await this.resumeService.getAllTags();
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  }

  openNewExperienceDialog() {
    this.editingExperience = null;
    this.experienceForm = {
      role: '',
      company: '',
      start_date: '',
      end_date: '',
      image_url: '',
      responsibilities: [],
      managers: []
    };
    this.showDialog = true;
  }

  openEditExperienceDialog(experience: ResumeExperience) {
    this.editingExperience = experience;
    this.experienceForm = {
      role: experience.role,
      company: experience.company,
      start_date: experience.start_date || '',
      end_date: experience.end_date || '',
      image_url: experience.image_url || '',
      responsibilities: experience.responsibilities?.map(resp => ({
        description: resp.description,
        tags: (resp.tags || []).map(tag => typeof tag === 'string' ? tag : tag.name)
      })) || [],
      managers: experience.managers?.map(manager => ({
        id: manager.id,
        manager_name: manager.manager_name,
        start_date: manager.start_date || '',
        end_date: manager.end_date || ''
      })) || []
    };
    this.showDialog = true;
  }

  addResponsibility() {
    this.experienceForm.responsibilities.push({
      description: '',
      tags: []
    });
  }

  removeResponsibility(index: number) {
    this.experienceForm.responsibilities.splice(index, 1);
  }

  filterTags(event: any) {
    const query = event.query.toLowerCase().trim();
    if (query === '') {
      // Show all tags when dropdown is clicked or query is empty
      this.filteredTags = [...this.allTags];
    } else {
      // Filter tags based on query
      this.filteredTags = this.allTags.filter(tag => 
        tag.toLowerCase().includes(query)
      );
    }
  }

  onTagSelect(event: any, responsibilityIndex: number) {
    const resp = this.experienceForm.responsibilities[responsibilityIndex];
    if (resp.tags && resp.tags.length > 0) {
      // Remove duplicates (case-insensitive)
      const uniqueTags = new Map<string, string>();
      resp.tags.forEach(tag => {
        const trimmed = tag.trim();
        const lowerKey = trimmed.toLowerCase();
        // Keep the first occurrence with its original casing
        if (!uniqueTags.has(lowerKey) && trimmed.length > 0) {
          uniqueTags.set(lowerKey, trimmed);
        }
      });
      resp.tags = Array.from(uniqueTags.values());
      
      // Add new tags to the global list if they don't exist
      resp.tags.forEach(tag => {
        if (!this.allTags.some(t => t.toLowerCase() === tag.toLowerCase())) {
          this.allTags.push(tag);
          this.allTags.sort();
        }
      });
    }
  }

  addManager() {
    this.experienceForm.managers.push({
      manager_name: '',
      start_date: '',
      end_date: ''
    });
  }

  removeManager(index: number) {
    this.experienceForm.managers.splice(index, 1);
  }

  async saveExperience() {
    if (!this.experienceForm.role.trim() || !this.experienceForm.company.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Role and company are required'
      });
      return;
    }

    this.saving = true;
    try {
      if (this.editingExperience) {
        const updatedExperience = await this.resumeService.updateExperience(
          this.editingExperience.id!,
          this.experienceForm
        );
        const index = this.experiences.findIndex(e => e.id === this.editingExperience!.id);
        if (index !== -1) {
          this.experiences[index] = updatedExperience;
        }
      } else {
        const newExperience = await this.resumeService.createExperience(this.experienceForm);
        this.experiences.unshift(newExperience);
      }
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Work experience saved successfully'
      });
      
      this.showDialog = false;
    } catch (error) {
      console.error('Error saving experience:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save work experience'
      });
    } finally {
      this.saving = false;
    }
  }

  confirmDelete(experience: ResumeExperience) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${experience.role} at ${experience.company}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.deleteExperience(experience);
      }
    });
  }

  async deleteExperience(experience: ResumeExperience) {
    try {
      await this.resumeService.deleteExperience(experience.id!);
      this.experiences = this.experiences.filter(e => e.id !== experience.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Work experience deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting experience:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete work experience'
      });
    }
  }

  cancelEdit() {
    this.showDialog = false;
    this.editingExperience = null;
    this.experienceForm = {
      role: '',
      company: '',
      start_date: '',
      end_date: '',
      image_url: '',
      responsibilities: [],
      managers: []
    };
  }

  formatDateRange(startDate: string, endDate: string): string {
    const start = startDate ? new Date(startDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    }) : 'Present';
    const end = endDate ? new Date(endDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    }) : 'Present';
    return `${start} - ${end}`;
  }

  getSortedManagers(managers: any[]): any[] {
    if (!managers || managers.length === 0) return [];
    
    return [...managers].sort((a, b) => {
      // If no start_date, put at the end
      if (!a.start_date && !b.start_date) return 0;
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      
      // Sort by start_date descending (most recent first)
      return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
    });
  }

  // Job Settings Methods
  async openJobSettings(experience: ResumeExperience) {
    this.selectedJobForSettings = experience;
    this.isJobExcluded = experience.is_excluded || false;
    this.adjustDates = experience.adjust_dates || false;
    this.adjustedStartDate = experience.adjusted_start_date || experience.start_date || '';
    this.adjustedEndDate = experience.adjusted_end_date || experience.end_date || '';
    this.displayTagsInResume = experience.display_tags_in_resume !== undefined ? experience.display_tags_in_resume : true;
    this.responsibilityMappings = new Map();
    
    // Load existing mappings
    if (experience.id) {
      await this.loadResponsibilityMappings(experience.id);
    }
    
    // Get available target jobs (exclude current job and other excluded jobs)
    this.availableTargetJobs = this.experiences
      .filter(exp => exp.id !== experience.id && !exp.is_excluded)
      .map(exp => ({
        id: exp.id!,
        displayLabel: `${exp.role} at ${exp.company} (${this.formatDateRange(exp.start_date || '', exp.end_date || '')})`
      }));
    
    this.showJobSettingsDialog = true;
  }

  async loadResponsibilityMappings(experienceId: string) {
    try {
      const mappings = await this.resumeService.getResponsibilityMappings(experienceId);
      this.responsibilityMappings = new Map(
        mappings.map(m => [m.responsibility_id, m.target_experience_id])
      );
    } catch (error) {
      console.error('Error loading responsibility mappings:', error);
    }
  }

  getMappingForResponsibility(responsibilityId: string): string | undefined {
    return this.responsibilityMappings.get(responsibilityId);
  }

  onMappingChange(responsibilityId: string, targetExperienceId: string) {
    if (targetExperienceId) {
      this.responsibilityMappings.set(responsibilityId, targetExperienceId);
    } else {
      this.responsibilityMappings.delete(responsibilityId);
    }
  }

  autoDistributeMappings() {
    if (!this.selectedJobForSettings?.responsibilities || this.selectedJobForSettings.responsibilities.length === 0) return;
    
    const sourceJob = this.selectedJobForSettings;
    const sourceStart = sourceJob.start_date ? new Date(sourceJob.start_date) : null;
    const sourceEnd = sourceJob.end_date ? new Date(sourceJob.end_date) : new Date();
    
    // For each responsibility, find the best target job
    for (const resp of sourceJob.responsibilities!) {
      if (!resp.id) continue;
      
      // Find jobs with overlapping dates
      const overlappingJobs = this.experiences
        .filter(exp => {
          if (exp.id === sourceJob.id || exp.is_excluded) return false;
          
          const expStart = exp.start_date ? new Date(exp.start_date) : null;
          const expEnd = exp.end_date ? new Date(exp.end_date) : new Date();
          
          if (!sourceStart || !expStart) return false;
          
          // Check for date overlap
          return (sourceStart <= expEnd && sourceEnd >= expStart);
        })
        .map(exp => {
          // Calculate overlap score
          const expStart = new Date(exp.start_date!);
          const expEnd = exp.end_date ? new Date(exp.end_date) : new Date();
          
          const overlapStart = sourceStart! > expStart ? sourceStart! : expStart;
          const overlapEnd = sourceEnd < expEnd ? sourceEnd : expEnd;
          const overlapDays = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24);
          
          // Calculate role similarity (simple check for common words)
          const sourceWords = new Set(sourceJob.role.toLowerCase().split(' '));
          const expWords = new Set(exp.role.toLowerCase().split(' '));
          const commonWords = [...sourceWords].filter(w => expWords.has(w)).length;
          
          return {
            experience: exp,
            score: overlapDays + (commonWords * 30) // Weight common words heavily
          };
        })
        .sort((a, b) => b.score - a.score);
      
      // Assign to the best matching job
      if (overlappingJobs.length > 0) {
        this.responsibilityMappings.set(resp.id, overlappingJobs[0].experience.id!);
      } else {
        // If no overlap, assign to most recent job
        const mostRecent = this.availableTargetJobs[0];
        if (mostRecent) {
          this.responsibilityMappings.set(resp.id, mostRecent.id);
        }
      }
    }
    
    this.messageService.add({
      severity: 'success',
      summary: 'Auto-Distribution Complete',
      detail: 'Responsibilities have been automatically assigned based on date overlap and role similarity'
    });
  }

  async saveJobSettings() {
    if (!this.selectedJobForSettings?.id) return;
    
    this.savingSettings = true;
    try {
      // Update exclusion status
      await this.resumeService.updateExperienceExclusion(
        this.selectedJobForSettings.id,
        this.isJobExcluded
      );
      
      // Update display tags setting (only if NOT excluded)
      if (!this.isJobExcluded) {
        await this.resumeService.updateExperienceDisplayTags(
          this.selectedJobForSettings.id,
          this.displayTagsInResume
        );
      }
      
      // Update date adjustments (only if NOT excluded AND checkbox is checked)
      if (!this.isJobExcluded && this.adjustDates) {
        await this.resumeService.updateExperienceDateAdjustments(
          this.selectedJobForSettings.id,
          true,
          this.adjustedStartDate || undefined,
          this.adjustedEndDate || undefined
        );
      } else {
        // If job is excluded or adjust dates is unchecked, clear any date adjustments
        await this.resumeService.updateExperienceDateAdjustments(
          this.selectedJobForSettings.id,
          false,
          undefined,
          undefined
        );
      }
      
      // Save responsibility mappings (only if excluded)
      if (this.isJobExcluded) {
        const mappings = Array.from(this.responsibilityMappings.entries()).map(([responsibility_id, target_experience_id]) => ({
          responsibility_id,
          target_experience_id
        }));
        
        await this.resumeService.saveResponsibilityMappings(
          this.selectedJobForSettings.id,
          mappings
        );
      }
      
      // Update local experience object
      const exp = this.experiences.find(e => e.id === this.selectedJobForSettings?.id);
      if (exp) {
        exp.is_excluded = this.isJobExcluded;
        if (!this.isJobExcluded) {
          exp.display_tags_in_resume = this.displayTagsInResume;
          if (this.adjustDates) {
            exp.adjust_dates = true;
            exp.adjusted_start_date = this.adjustedStartDate || undefined;
            exp.adjusted_end_date = this.adjustedEndDate || undefined;
          } else {
            exp.adjust_dates = false;
            exp.adjusted_start_date = undefined;
            exp.adjusted_end_date = undefined;
          }
        }
      }
      
      this.messageService.add({
        severity: 'success',
        summary: 'Settings Saved',
        detail: 'Job settings saved successfully'
      });
      
      this.closeJobSettings();
    } catch (error) {
      console.error('Error saving job settings:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save job settings'
      });
    } finally {
      this.savingSettings = false;
    }
  }

  closeJobSettings() {
    this.showJobSettingsDialog = false;
    this.selectedJobForSettings = null;
    this.isJobExcluded = false;
    this.adjustDates = false;
    this.adjustedStartDate = '';
    this.adjustedEndDate = '';
    this.displayTagsInResume = true;
    this.responsibilityMappings = new Map();
    this.availableTargetJobs = [];
  }
}
