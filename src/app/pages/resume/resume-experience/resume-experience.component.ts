import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipsModule } from 'primeng/chips';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { AccordionModule } from 'primeng/accordion';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ResumeService } from '../../resume-services/resume.service';
import { ResumeExperience, ResumeExperienceForm, ResumeResponsibilityForm } from '../../../interfaces/resume.interface';

@Component({
  selector: 'app-resume-experience',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    ChipsModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    ProgressSpinnerModule,
    TextareaModule,
    ToastModule,
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
    responsibilities: []
  };
  
  loading = false;
  saving = false;
  showDialog = false;
  editingExperience: ResumeExperience | null = null;

  constructor(
    private resumeService: ResumeService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  async ngOnInit() {
    await this.loadExperiences();
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

  openNewExperienceDialog() {
    this.editingExperience = null;
    this.experienceForm = {
      role: '',
      company: '',
      start_date: '',
      end_date: '',
      responsibilities: []
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
      responsibilities: experience.responsibilities?.map(resp => ({
        description: resp.description,
        tags: (resp.tags || []).map(tag => typeof tag === 'string' ? tag : tag.name)
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
      responsibilities: []
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
}
