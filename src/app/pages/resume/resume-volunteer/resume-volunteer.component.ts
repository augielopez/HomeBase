import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
import { ConfirmationService, MessageService } from 'primeng/api';

import { ResumeService } from '../../service/resume.service';
import { ResumeVolunteer, ResumeVolunteerForm } from '../../../interfaces/resume.interface';

@Component({
  selector: 'app-resume-volunteer',
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
    ToastModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './resume-volunteer.component.html',
  styleUrl: './resume-volunteer.component.scss'
})
export class ResumeVolunteerComponent implements OnInit {
  volunteerWork: ResumeVolunteer[] = [];
  volunteerForm: ResumeVolunteerForm = {
    role: '',
    description: '',
    tags: []
  };
  
  loading = false;
  saving = false;
  showDialog = false;
  editingVolunteer: ResumeVolunteer | null = null;

  constructor(
    private resumeService: ResumeService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadVolunteerWork();
  }

  async loadVolunteerWork() {
    this.loading = true;
    try {
      this.volunteerWork = await this.resumeService.getVolunteerWork();
    } catch (error) {
      console.error('Error loading volunteer work:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load volunteer work'
      });
    } finally {
      this.loading = false;
    }
  }

  openNewVolunteerDialog() {
    this.editingVolunteer = null;
    this.volunteerForm = {
      role: '',
      description: '',
      tags: []
    };
    this.showDialog = true;
    this.cdr.detectChanges();
  }

  openEditVolunteerDialog(volunteer: ResumeVolunteer) {
    this.editingVolunteer = volunteer;
    this.volunteerForm = {
      role: volunteer.role,
      description: volunteer.description || '',
      tags: [...(volunteer.tags || [])]
    };
    this.showDialog = true;
    this.cdr.detectChanges();
  }

  async saveVolunteer() {
    if (!this.volunteerForm.role.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Volunteer role is required'
      });
      return;
    }

    this.saving = true;
    try {
      if (this.editingVolunteer) {
        const updatedVolunteer = await this.resumeService.updateVolunteerWork(
          this.editingVolunteer.id!, 
          this.volunteerForm as ResumeVolunteer
        );
        const index = this.volunteerWork.findIndex(v => v.id === this.editingVolunteer!.id);
        if (index !== -1) {
          this.volunteerWork[index] = updatedVolunteer;
        }
      } else {
        const newVolunteer = await this.resumeService.createVolunteerWork(this.volunteerForm as ResumeVolunteer);
        this.volunteerWork.unshift(newVolunteer);
      }
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Volunteer work saved successfully'
      });
      
      this.showDialog = false;
    } catch (error) {
      console.error('Error saving volunteer work:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save volunteer work'
      });
    } finally {
      this.saving = false;
    }
  }

  confirmDelete(volunteer: ResumeVolunteer) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${volunteer.role}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.deleteVolunteer(volunteer);
      }
    });
  }

  async deleteVolunteer(volunteer: ResumeVolunteer) {
    try {
      await this.resumeService.deleteVolunteerWork(volunteer.id!);
      this.volunteerWork = this.volunteerWork.filter(v => v.id !== volunteer.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Volunteer work deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting volunteer work:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete volunteer work'
      });
    }
  }

  cancelEdit() {
    this.showDialog = false;
    this.editingVolunteer = null;
    this.volunteerForm = {
      role: '',
      description: '',
      tags: []
    };
  }
}
