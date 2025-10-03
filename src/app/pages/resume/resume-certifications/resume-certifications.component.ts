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
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ResumeService } from '../../resume-services/resume.service';
import { ResumeCertification, ResumeCertificationForm } from '../../../interfaces/resume.interface';

@Component({
  selector: 'app-resume-certifications',
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
    ToastModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './resume-certifications.component.html',
  styleUrl: './resume-certifications.component.scss'
})
export class ResumeCertificationsComponent implements OnInit {
  certifications: ResumeCertification[] = [];
  certificationForm: ResumeCertificationForm = {
    title: '',
    issued_date: ''
  };
  
  loading = false;
  saving = false;
  showDialog = false;
  editingCertification: ResumeCertification | null = null;

  constructor(
    private resumeService: ResumeService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  async ngOnInit() {
    await this.loadCertifications();
  }

  async loadCertifications() {
    this.loading = true;
    try {
      this.certifications = await this.resumeService.getCertifications();
    } catch (error) {
      console.error('Error loading certifications:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load certifications'
      });
    } finally {
      this.loading = false;
    }
  }

  openNewCertificationDialog() {
    this.editingCertification = null;
    this.certificationForm = {
      title: '',
      issued_date: ''
    };
    this.showDialog = true;
  }

  openEditCertificationDialog(certification: ResumeCertification) {
    this.editingCertification = certification;
    this.certificationForm = {
      title: certification.title,
      issued_date: certification.issued_date || ''
    };
    this.showDialog = true;
  }

  async saveCertification() {
    if (!this.certificationForm.title.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Certification title is required'
      });
      return;
    }

    this.saving = true;
    try {
      if (this.editingCertification) {
        const updatedCertification = await this.resumeService.updateCertification(
          this.editingCertification.id!, 
          this.certificationForm as ResumeCertification
        );
        const index = this.certifications.findIndex(c => c.id === this.editingCertification!.id);
        if (index !== -1) {
          this.certifications[index] = updatedCertification;
        }
      } else {
        const newCertification = await this.resumeService.createCertification(this.certificationForm as ResumeCertification);
        this.certifications.unshift(newCertification);
      }
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Certification saved successfully'
      });
      
      this.showDialog = false;
    } catch (error) {
      console.error('Error saving certification:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save certification'
      });
    } finally {
      this.saving = false;
    }
  }

  confirmDelete(certification: ResumeCertification) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${certification.title}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.deleteCertification(certification);
      }
    });
  }

  async deleteCertification(certification: ResumeCertification) {
    try {
      await this.resumeService.deleteCertification(certification.id!);
      this.certifications = this.certifications.filter(c => c.id !== certification.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Certification deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting certification:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete certification'
      });
    }
  }

  cancelEdit() {
    this.showDialog = false;
    this.editingCertification = null;
    this.certificationForm = {
      title: '',
      issued_date: ''
    };
  }

  formatDate(date: string): string {
    return date ? new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    }) : '';
  }
}
