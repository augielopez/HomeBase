import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { ResumeService } from '../../resume-services/resume.service';
import { ResumeContact, ResumeContactForm } from '../../../interfaces/resume.interface';

@Component({
  selector: 'app-resume-contact',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    MessageModule,
    ProgressSpinnerModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './resume-contact.component.html',
  styleUrl: './resume-contact.component.scss'
})
export class ResumeContactComponent implements OnInit {
  contact: ResumeContactForm = {
    name: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: ''
  };
  
  loading = false;
  saving = false;

  constructor(
    private resumeService: ResumeService,
    private messageService: MessageService
  ) {}

  async ngOnInit() {
    await this.loadContact();
  }

  async loadContact() {
    this.loading = true;
    try {
      const contactData = await this.resumeService.getContact();
      if (contactData) {
        this.contact = {
          name: contactData.name || '',
          email: contactData.email || '',
          phone: contactData.phone || '',
          location: contactData.location || '',
          linkedin: contactData.linkedin || '',
          github: contactData.github || ''
        };
      }
    } catch (error) {
      console.error('Error loading contact:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load contact information'
      });
    } finally {
      this.loading = false;
    }
  }

  async saveContact() {
    this.saving = true;
    try {
      await this.resumeService.upsertContact(this.contact as ResumeContact);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Contact information saved successfully'
      });
    } catch (error) {
      console.error('Error saving contact:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save contact information'
      });
    } finally {
      this.saving = false;
    }
  }

  isFormValid(): boolean {
    return !!(this.contact.name && this.contact.email);
  }
}
