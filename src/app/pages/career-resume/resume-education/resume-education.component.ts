import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ResumeService } from '../services/resume.service';
import { ResumeEducation, ResumeEducationForm } from '../interfaces/resume.interface';

@Component({
  selector: 'app-resume-education',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    ProgressSpinnerModule,
    TableModule,
    ToastModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './resume-education.component.html',
  styleUrl: './resume-education.component.scss'
})
export class ResumeEducationComponent implements OnInit {
  educations: ResumeEducation[] = [];
  educationForm: ResumeEducationForm = {
    degree: '',
    school: '',
    minor: '',
    notes: '',
    start_date: '',
    end_date: ''
  };
  
  loading = false;
  saving = false;
  showDialog = false;
  editingEducation: ResumeEducation | null = null;

  constructor(
    private resumeService: ResumeService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  async ngOnInit() {
    await this.loadEducation();
  }

  async loadEducation() {
    this.loading = true;
    try {
      this.educations = await this.resumeService.getEducation();
    } catch (error) {
      console.error('Error loading education:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load education'
      });
    } finally {
      this.loading = false;
    }
  }

  openNewEducationDialog() {
    this.editingEducation = null;
    this.educationForm = {
      degree: '',
      school: '',
      minor: '',
      notes: '',
      start_date: '',
      end_date: ''
    };
    this.showDialog = true;
  }

  openEditEducationDialog(education: ResumeEducation) {
    this.editingEducation = education;
    this.educationForm = {
      degree: education.degree,
      school: education.school,
      minor: education.minor || '',
      notes: education.notes || '',
      start_date: education.start_date || '',
      end_date: education.end_date || ''
    };
    this.showDialog = true;
  }

  async saveEducation() {
    if (!this.educationForm.degree.trim() || !this.educationForm.school.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Degree and school are required'
      });
      return;
    }

    this.saving = true;
    try {
      if (this.editingEducation) {
        const updatedEducation = await this.resumeService.updateEducation(
          this.editingEducation.id!, 
          this.educationForm as ResumeEducation
        );
        const index = this.educations.findIndex(e => e.id === this.editingEducation!.id);
        if (index !== -1) {
          this.educations[index] = updatedEducation;
        }
      } else {
        const newEducation = await this.resumeService.createEducation(this.educationForm as ResumeEducation);
        this.educations.unshift(newEducation);
      }
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Education saved successfully'
      });
      
      this.showDialog = false;
    } catch (error) {
      console.error('Error saving education:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save education'
      });
    } finally {
      this.saving = false;
    }
  }

  confirmDelete(education: ResumeEducation) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${education.degree} from ${education.school}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.deleteEducation(education);
      }
    });
  }

  async deleteEducation(education: ResumeEducation) {
    try {
      await this.resumeService.deleteEducation(education.id!);
      this.educations = this.educations.filter(e => e.id !== education.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Education deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting education:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete education'
      });
    }
  }

  cancelEdit() {
    this.showDialog = false;
    this.editingEducation = null;
    this.educationForm = {
      degree: '',
      school: '',
      minor: '',
      notes: '',
      start_date: '',
      end_date: ''
    };
  }

  formatDateRange(startDate: string, endDate: string): string {
    const start = startDate ? new Date(startDate).getFullYear().toString() : 'Present';
    const end = endDate ? new Date(endDate).getFullYear().toString() : 'Present';
    return `${start} - ${end}`;
  }
}
