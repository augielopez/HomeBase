import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipsModule } from 'primeng/chips';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
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
    ChipsModule,
    ConfirmDialogModule,
    DialogModule,
    DropdownModule,
    InputTextModule,
    MessageModule,
    ProgressSpinnerModule,
    TableModule,
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
  
  // Available images from assets/images folder
  availableImages = [
    { label: 'None', value: '' },
    { label: 'Centene', value: 'assets/images/centene.png' },
    { label: 'HealthNet', value: 'assets/images/healthnet.png' },
    { label: 'Hyland', value: 'assets/images/hyland.png' },
    { label: 'Orion', value: 'assets/images/orion.png' },
    { label: 'Envolve', value: 'assets/images/envolve.png' }
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
}
