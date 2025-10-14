import { Component, OnInit, SecurityContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextarea } from 'primeng/inputtextarea';
import { InputSwitchModule } from 'primeng/inputswitch';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SplitterModule } from 'primeng/splitter';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { marked } from 'marked';

import { ResumeService } from '../../resume-services/resume.service';
import { MasterResume, TailoredResume, TailoringRequest, TailoringResponse, JobBreakdown } from '../../../interfaces/resume.interface';

@Component({
  selector: 'app-resume-tailoring',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    InputTextarea,
    InputSwitchModule,
    MessageModule,
    ProgressSpinnerModule,
    SplitterModule,
    ToastModule,
    TagModule,
    ChipModule,
    DividerModule
  ],
  providers: [MessageService],
  templateUrl: './resume-tailoring.component.html',
  styleUrl: './resume-tailoring.component.scss'
})
export class ResumeTailoringComponent implements OnInit {
  jobDescription = '';
  masterResume: MasterResume | null = null;
  jobBreakdown: JobBreakdown | null = null;
  tailoredResume: TailoredResume | null = null;
  tailoringAnalysis = '';
  recommendations: string[] = [];
  debugInfo: { method: 'mock' | 'openai'; timestamp: string } | null = null;
  useMockMode = false;
  
  loading = false;
  tailoring = false;
  showMarkdownPreview = false;
  markdownPreviewHtml: SafeHtml = '';

  constructor(
    private resumeService: ResumeService,
    private messageService: MessageService,
    private sanitizer: DomSanitizer
  ) {}

  async ngOnInit() {
    await this.loadMasterResume();
  }

  async loadMasterResume() {
    this.loading = true;
    try {
      this.masterResume = await this.resumeService.getMasterResumeForTailoring();
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

    this.tailoring = true;
    try {
      // Reload master resume with latest exclusions and mappings
      this.masterResume = await this.resumeService.getMasterResumeForTailoring();
      
      if (!this.masterResume) {
        throw new Error('Master resume data not available');
      }

      const request: TailoringRequest = {
        jobDescription: this.jobDescription,
        masterResume: this.masterResume
      };

      const response = await this.resumeService.tailorResume(request, this.useMockMode);
      
      this.jobBreakdown = response.jobBreakdown;
      this.tailoredResume = response.tailoredResume;
      this.tailoringAnalysis = response.analysis || '';
      this.recommendations = response.recommendations || [];
      this.debugInfo = response._debug || null;

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
    
    // Contact Info with line breaks (two spaces at end for markdown)
    markdown += `**Email:** ${resume.contact.email}  \n`;
    if (resume.contact.phone) markdown += `**Phone:** ${resume.contact.phone}  \n`;
    if (resume.contact.location) markdown += `**Location:** ${resume.contact.location}  \n`;
    if (resume.contact.linkedin) markdown += `**LinkedIn:** ${resume.contact.linkedin}  \n`;
    if (resume.contact.github) markdown += `**GitHub:** ${resume.contact.github}  \n`;
    markdown += '\n';
    
    // Summary
    if (resume.summary) {
      markdown += `## Summary\n\n${resume.summary}\n\n`;
    }
    
    // Skills by Category
    if (resume.skills.length > 0) {
      markdown += `## Technical Skills\n\n`;
      
      const categories = this.getSkillCategories(resume.skills);
      categories.forEach(category => {
        markdown += `**${category.name}:** `;
        markdown += category.skills.map(s => s.name).join(', ');
        markdown += '\n\n';
      });
    }
    
    // Experience
    if (resume.experience.length > 0) {
      markdown += `## Experience\n\n`;
      resume.experience.forEach(exp => {
        markdown += `#### ${exp.role} at ${exp.company}\n`;
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
        markdown += `#### ${edu.degree}  \n`;
        markdown += `${edu.school}  \n`;
        if (edu.minor) {
          markdown += `Minor/Emphasis: ${edu.minor}  \n`;
        }
        if (edu.notes) {
          markdown += `${edu.notes}  \n`;
        }
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
        markdown += `#### ${project.title}\n`;
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
        markdown += `#### ${vol.role}\n`;
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
    this.jobBreakdown = null;
    this.tailoredResume = null;
    this.tailoringAnalysis = '';
    this.recommendations = [];
    this.debugInfo = null;
    this.showMarkdownPreview = false;
    this.markdownPreviewHtml = '';
  }

  toggleMarkdownPreview() {
    this.showMarkdownPreview = !this.showMarkdownPreview;
    if (this.showMarkdownPreview && this.tailoredResume) {
      this.generateMarkdownPreview();
    }
  }

  onMockModeChange() {
    const mode = this.useMockMode ? 'Mock Algorithm' : 'OpenAI GPT-4';
    this.messageService.add({
      severity: 'info',
      summary: 'Mode Changed',
      detail: `Switched to ${mode}`,
      life: 3000
    });
  }

  private async generateMarkdownPreview() {
    if (!this.tailoredResume) return;
    
    const markdown = this.generateMarkdownResume(this.tailoredResume);
    const html = await marked(markdown);
    this.markdownPreviewHtml = this.sanitizer.sanitize(SecurityContext.HTML, html) || '';
  }

  getStarArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, index) => index < rating);
  }

  getFitRatingColor(rating: number): string {
    if (rating >= 4) return 'success';
    if (rating === 3) return 'warning';
    return 'danger';
  }

  getFitRatingLabel(rating: number): string {
    if (rating === 5) return 'Excellent Fit';
    if (rating === 4) return 'Strong Fit';
    if (rating === 3) return 'Moderate Fit';
    if (rating === 2) return 'Developing Fit';
    return 'Limited Fit';
  }

  getSkillCategories(skills: any[]): { name: string, skills: any[] }[] {
    const categorized = new Map<string, any[]>();
    
    skills.forEach(skill => {
      const category = skill.category || 'Other';
      if (!categorized.has(category)) {
        categorized.set(category, []);
      }
      categorized.get(category)!.push(skill);
    });
    
    // Map AI categories to display categories
    const categoryMapping: { [key: string]: string } = {
      'Languages': 'Languages & Frameworks',
      'Frontend': 'Languages & Frameworks', 
      'Backend': 'Languages & Frameworks',
      'Cloud': 'Cloud & DevOps',
      'DevOps': 'Cloud & DevOps',
      'Database': 'Databases & ORM',
      'Databases': 'Databases & ORM',
      'Testing': 'Testing & Monitoring',
      'Tools': 'Practices & Methodologies',
      'Methodology': 'Practices & Methodologies',
      'Soft Skills': 'Practices & Methodologies',
      'Low-Code': 'Practices & Methodologies'
    };
    
    // Group by mapped categories
    const mappedCategorized = new Map<string, any[]>();
    categorized.forEach((skills, category) => {
      const mappedCategory = categoryMapping[category] || category;
      if (!mappedCategorized.has(mappedCategory)) {
        mappedCategorized.set(mappedCategory, []);
      }
      mappedCategorized.get(mappedCategory)!.push(...skills);
    });
    
    // Return in preferred category order
    const categoryOrder = [
      'Languages & Frameworks',
      'Cloud & DevOps',
      'Containerization & Microservices',
      'Databases & ORM',
      'Security & Compliance',
      'Testing & Monitoring',
      'Practices & Methodologies',
      'Other'
    ];
    
    return categoryOrder
      .filter(cat => mappedCategorized.has(cat))
      .map(cat => ({
        name: cat,
        skills: mappedCategorized.get(cat)!
      }));
  }

  getSkillNames(skills: any[]): string {
    return skills.map(s => s.name).join(', ');
  }
}
