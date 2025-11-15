import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';

import { ResumeService } from '../services/resume.service';
import { MasterResume } from '../interfaces/resume.interface';

interface CareerStats {
  year: string;
  company: string;
  role: string;
  duration: number;
  projects: number;
  techCount: number;
}

@Component({
  selector: 'app-resume-card-style',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ProgressSpinnerModule,
    MessageModule,
    TagModule,
    ButtonModule
  ],
  templateUrl: './resume-card-style.component.html',
  styleUrl: './resume-card-style.component.scss'
})
export class ResumeCardStyleComponent implements OnInit {
  loading = false;
  masterResume: MasterResume | null = null;
  careerStats: CareerStats[] = [];
  totalYears = 0;
  totalCompanies = 0;
  totalProjects = 0;
  totalTechnologies = 0;
  totalMonths = 0;
  topSkills: string[] = [];
  currentYear = new Date().getFullYear();

  constructor(private resumeService: ResumeService) {}

  async ngOnInit() {
    await this.loadResumeData();
  }

  async loadResumeData() {
    this.loading = true;
    try {
      this.masterResume = await this.resumeService.getMasterResume();
      this.calculateStats();
    } catch (error) {
      console.error('Error loading resume data:', error);
    } finally {
      this.loading = false;
    }
  }

  calculateStats() {
    if (!this.masterResume) return;

    // Build career stats from experience
    this.careerStats = (this.masterResume.experience || []).map(exp => {
      const startDate = exp.start_date ? new Date(exp.start_date) : null;
      const endDate = exp.end_date ? new Date(exp.end_date) : new Date();
      
      // Calculate duration in months
      let duration = 0;
      if (startDate) {
        const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                      (endDate.getMonth() - startDate.getMonth());
        duration = Math.max(1, months);
      }

      // Count projects (responsibilities)
      const projects = exp.responsibilities?.length || 0;

      // Count unique technologies from tags
      const techSet = new Set<string>();
      exp.responsibilities?.forEach(resp => {
        if (Array.isArray(resp.tags)) {
          resp.tags.forEach(tag => {
            if (typeof tag === 'string') {
              techSet.add(tag);
            } else if (tag && typeof tag === 'object' && 'name' in tag) {
              techSet.add(tag.name);
            }
          });
        }
      });

      return {
        year: startDate ? startDate.getFullYear().toString().slice(-2) : '??',
        company: exp.company,
        role: exp.role,
        duration,
        projects,
        techCount: techSet.size
      };
    });

    // Calculate totals
    this.totalCompanies = new Set(this.careerStats.map(s => s.company)).size;
    this.totalProjects = this.careerStats.reduce((sum, s) => sum + s.projects, 0);
    
    // Calculate total years (sum all durations and convert to years)
    this.totalMonths = this.careerStats.reduce((sum, s) => sum + s.duration, 0);
    this.totalYears = Math.round((this.totalMonths / 12) * 10) / 10; // Round to 1 decimal

    // Count unique technologies
    const allTechSet = new Set<string>();
    this.careerStats.forEach(s => {
      // We need to recount from original data
      const exp = this.masterResume?.experience?.find(e => e.company === s.company);
      exp?.responsibilities?.forEach(resp => {
        if (Array.isArray(resp.tags)) {
          resp.tags.forEach(tag => {
            if (typeof tag === 'string') {
              allTechSet.add(tag);
            } else if (tag && typeof tag === 'object' && 'name' in tag) {
              allTechSet.add(tag.name);
            }
          });
        }
      });
    });
    this.totalTechnologies = allTechSet.size;

    // Get top skills (featured or first 8)
    const skills = this.masterResume.skills || [];
    this.topSkills = skills
      .sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return (a.display_order || 0) - (b.display_order || 0);
      })
      .slice(0, 8)
      .map(s => s.name);
  }

  printCard() {
    window.print();
  }

  getPrimaryRole(): string {
    if (!this.masterResume?.experience || this.masterResume.experience.length === 0) {
      return 'PRO';
    }
    
    // Get the most recent role (first character of each word)
    const mostRecentRole = this.masterResume.experience[0].role;
    const words = mostRecentRole.split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    
    // Take first letter of first two words
    return words.slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
  }

  formatLinkedIn(linkedin: string): string {
    // Extract just the username from LinkedIn URL
    if (linkedin.includes('linkedin.com/in/')) {
      const parts = linkedin.split('linkedin.com/in/');
      return parts[1]?.split('/')[0] || linkedin;
    }
    return linkedin;
  }

  // Make Math available in template
  Math = Math;
}

