import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextarea } from 'primeng/inputtextarea';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SplitterModule } from 'primeng/splitter';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { ResumeService } from '../../service/resume.service';
import { MasterResume, TailoredResume, TailoringRequest, TailoringResponse } from '../../../interfaces/resume.interface';

@Component({
  selector: 'app-resume-tailoring',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    InputTextarea,
    MessageModule,
    ProgressSpinnerModule,
    SplitterModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './resume-tailoring.component.html',
  styleUrl: './resume-tailoring.component.scss'
})
export class ResumeTailoringComponent implements OnInit {
  jobDescription = '';
  masterResume: MasterResume | null = null;
  tailoredResume: TailoredResume | null = null;
  tailoringAnalysis = '';
  recommendations: string[] = [];
  
  loading = false;
  tailoring = false;

  constructor(
    private resumeService: ResumeService,
    private messageService: MessageService
  ) {}

  async ngOnInit() {
    await this.loadMasterResume();
  }

  async loadMasterResume() {
    this.loading = true;
    try {
      this.masterResume = await this.resumeService.getMasterResume();
    } catch (error) {
      console.error('Error loading master resume:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load master resume data'
      });
    } finally {
      this.loading = false;
    }
  }

  async tailorResume() {
    if (!this.jobDescription.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please enter a job description'
      });
      return;
    }

    if (!this.masterResume) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Master resume data not available'
      });
      return;
    }

    this.tailoring = true;
    try {
      const request: TailoringRequest = {
        jobDescription: this.jobDescription,
        masterResume: this.masterResume
      };

      const response = await this.resumeService.tailorResume(request);
      
      this.tailoredResume = response.tailoredResume;
      this.tailoringAnalysis = response.analysis || '';
      this.recommendations = response.recommendations || [];

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Resume tailored successfully'
      });
    } catch (error) {
      console.error('Error tailoring resume:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to tailor resume'
      });
    } finally {
      this.tailoring = false;
    }
  }


  exportToMarkdown() {
    if (!this.tailoredResume) return;
    
    const markdown = this.generateMarkdownResume(this.tailoredResume);
    this.downloadFile(markdown, 'tailored-resume.md', 'text/markdown');
  }

  private generateMarkdownResume(resume: TailoredResume): string {
    let markdown = `# ${resume.contact.name}\n\n`;
    
    // Contact Info
    markdown += `**Email:** ${resume.contact.email}\n`;
    if (resume.contact.phone) markdown += `**Phone:** ${resume.contact.phone}\n`;
    if (resume.contact.location) markdown += `**Location:** ${resume.contact.location}\n`;
    if (resume.contact.linkedin) markdown += `**LinkedIn:** ${resume.contact.linkedin}\n`;
    if (resume.contact.github) markdown += `**GitHub:** ${resume.contact.github}\n`;
    markdown += '\n';
    
    // Summary
    if (resume.summary) {
      markdown += `## Summary\n\n${resume.summary}\n\n`;
    }
    
    // Skills
    if (resume.skills.length > 0) {
      markdown += `## Skills\n\n`;
      resume.skills.forEach(skill => {
        markdown += `- **${skill.name}**`;
        if (skill.tags && skill.tags.length > 0) {
          markdown += ` (${skill.tags.join(', ')})`;
        }
        markdown += '\n';
      });
      markdown += '\n';
    }
    
    // Experience
    if (resume.experience.length > 0) {
      markdown += `## Experience\n\n`;
      resume.experience.forEach(exp => {
        markdown += `### ${exp.role} at ${exp.company}\n`;
        if (exp.start_date || exp.end_date) {
          const start = exp.start_date ? new Date(exp.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'Present';
          const end = exp.end_date ? new Date(exp.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'Present';
          markdown += `${start} - ${end}\n\n`;
        }
        
        if (exp.responsibilities && exp.responsibilities.length > 0) {
          exp.responsibilities.forEach(resp => {
            markdown += `- ${resp.description}`;
            if (resp.tags && resp.tags.length > 0) {
              markdown += ` *(${resp.tags.join(', ')})*`;
            }
            markdown += '\n';
          });
        }
        markdown += '\n';
      });
    }
    
    // Education
    if (resume.education.length > 0) {
      markdown += `## Education\n\n`;
      resume.education.forEach(edu => {
        markdown += `### ${edu.degree}\n`;
        markdown += `${edu.school}\n`;
        if (edu.start_date || edu.end_date) {
          const start = edu.start_date ? new Date(edu.start_date).getFullYear().toString() : '';
          const end = edu.end_date ? new Date(edu.end_date).getFullYear().toString() : 'Present';
          markdown += `${start} - ${end}\n`;
        }
        markdown += '\n';
      });
    }
    
    // Certifications
    if (resume.certifications.length > 0) {
      markdown += `## Certifications\n\n`;
      resume.certifications.forEach(cert => {
        markdown += `- ${cert.title}`;
        if (cert.issued_date) {
          markdown += ` (${new Date(cert.issued_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })})`;
        }
        markdown += '\n';
      });
      markdown += '\n';
    }
    
    // Projects
    if (resume.projects.length > 0) {
      markdown += `## Projects\n\n`;
      resume.projects.forEach(project => {
        markdown += `### ${project.title}\n`;
        if (project.description) {
          markdown += `${project.description}\n`;
        }
        if (project.tags && project.tags.length > 0) {
          markdown += `**Technologies:** ${project.tags.join(', ')}\n`;
        }
        markdown += '\n';
      });
    }
    
    // Volunteer Work
    if (resume.volunteer.length > 0) {
      markdown += `## Volunteer Work\n\n`;
      resume.volunteer.forEach(vol => {
        markdown += `### ${vol.role}\n`;
        if (vol.description) {
          markdown += `${vol.description}\n`;
        }
        if (vol.tags && vol.tags.length > 0) {
          markdown += `**Focus Areas:** ${vol.tags.join(', ')}\n`;
        }
        markdown += '\n';
      });
    }
    
    return markdown;
  }

  private downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  clearResults() {
    this.tailoredResume = null;
    this.tailoringAnalysis = '';
    this.recommendations = [];
  }
}
