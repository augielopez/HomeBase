import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';
import { KnobModule } from 'primeng/knob';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SplitterModule } from 'primeng/splitter';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { ResumeGapAnalysisService } from '../services/resume-gap-analysis.service';
import { ResumeService } from '../services/resume.service';
import { 
  MasterResume, 
  TailoredResume, 
  ResumeGapAnalysis,
  Recommendation 
} from '../interfaces/resume.interface';

@Component({
  selector: 'app-resume-comparison',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AccordionModule,
    ButtonModule,
    CardModule,
    ChipModule,
    DividerModule,
    KnobModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    SelectButtonModule,
    SplitterModule,
    TagModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './resume-comparison.component.html',
  styleUrl: './resume-comparison.component.scss'
})
export class ResumeComparisonComponent implements OnInit {
  masterResume: MasterResume | null = null;
  tailoredResume: TailoredResume | null = null;
  jobDescription = '';
  gapAnalysis: ResumeGapAnalysis | null = null;
  
  viewMode: 'side-by-side' | 'gaps-only' | 'edit' = 'side-by-side';
  viewModeOptions = [
    { label: 'Side-by-Side', value: 'side-by-side', icon: 'pi pi-table' },
    { label: 'Gaps Only', value: 'gaps-only', icon: 'pi pi-exclamation-triangle' },
    { label: 'Edit', value: 'edit', icon: 'pi pi-pencil' }
  ];
  
  showRecommendations = true;
  loading = false;
  bulletViewMode: 'original' | 'optimized' = 'original';
  optimizedBullets: Map<string, string> = new Map();
  optimizingBullets = false;
  optimizationProgress = 0;
  currentBulletIndex = 0;
  totalBullets = 0;
  aiOptimizedCount = 0;
  mockFallbackCount = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private resumeService: ResumeService,
    private gapAnalysisService: ResumeGapAnalysisService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    // Get data from route state or load from service
    const navigation = history.state;
    
    if (navigation.masterResume && navigation.tailoredResume && navigation.jobDescription) {
      this.masterResume = navigation.masterResume;
      this.tailoredResume = navigation.tailoredResume;
      this.jobDescription = navigation.jobDescription;
      this.performAnalysis();
    } else {
      // No data provided, redirect back to tailoring
      this.messageService.add({
        severity: 'warn',
        summary: 'No Data',
        detail: 'Please generate a tailored resume first in the Job Tailoring Assistant',
        life: 5000
      });
      setTimeout(() => this.router.navigate(['/career-resume/tailoring']), 2000);
    }
  }

  performAnalysis() {
    if (!this.masterResume || !this.tailoredResume) return;

    this.loading = true;
    try {
      this.gapAnalysis = this.gapAnalysisService.analyzeResumeGap(
        this.masterResume,
        this.tailoredResume,
        this.jobDescription
      );
    } catch (error) {
      console.error('Error performing gap analysis:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Analysis Error',
        detail: 'Failed to analyze resume gap'
      });
    } finally {
      this.loading = false;
    }
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  }

  getScoreSeverity(score: number): 'success' | 'warning' | 'danger' {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  }

  getPrioritySeverity(priority: string): 'danger' | 'warning' | 'info' | 'secondary' {
    switch (priority) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'secondary';
    }
  }

  getCriticalRecommendations(): Recommendation[] {
    return this.gapAnalysis?.recommendations.filter(r => r.priority === 'critical') || [];
  }

  getHighRecommendations(): Recommendation[] {
    return this.gapAnalysis?.recommendations.filter(r => r.priority === 'high') || [];
  }

  getMediumRecommendations(): Recommendation[] {
    return this.gapAnalysis?.recommendations.filter(r => r.priority === 'medium') || [];
  }

  getLowRecommendations(): Recommendation[] {
    return this.gapAnalysis?.recommendations.filter(r => r.priority === 'low') || [];
  }

  getPartialSkills() {
    return this.gapAnalysis?.skillsAnalysis.requiredSkills.filter(s => s.status === 'partial') || [];
  }

  getPartialSkillsCount(): number {
    return this.getPartialSkills().length;
  }

  getTopWeakBullets() {
    return this.gapAnalysis?.experienceAnalysis.weakBullets.slice(0, 5) || [];
  }

  getTopKeywords() {
    return this.gapAnalysis?.atsScore.keywordDensity.slice(0, 12) || [];
  }

  // Helper methods for highlighting skills and bullets in side-by-side view
  getSkillStatus(skillName: string): 'matched' | 'partial' | 'missing' | null {
    if (!this.gapAnalysis) return null;
    const skill = this.gapAnalysis.skillsAnalysis.requiredSkills.find(
      s => s.name.toLowerCase() === skillName.toLowerCase()
    );
    return skill?.status || null;
  }

  isSkillMatched(skillName: string): boolean {
    return this.getSkillStatus(skillName) === 'matched';
  }

  isSkillPartial(skillName: string): boolean {
    return this.getSkillStatus(skillName) === 'partial';
  }

  isSkillMissing(skillName: string): boolean {
    return this.getSkillStatus(skillName) === 'missing';
  }

  // Get all skills for master resume display (master skills + missing required skills)
  getAllMasterSkills(): Array<{ name: string; status: 'matched' | 'partial' | 'missing' | 'not-required' }> {
    if (!this.masterResume || !this.gapAnalysis) return [];
    
    const skillsMap = new Map<string, 'matched' | 'partial' | 'missing' | 'not-required'>();
    
    // Add all master resume skills
    this.masterResume.skills.forEach(skill => {
      const status = this.getSkillStatus(skill.name);
      skillsMap.set(skill.name.toLowerCase(), status || 'not-required');
    });
    
    // Add missing skills that are required by the job but not in master resume
    this.gapAnalysis.skillsAnalysis.missingSkills.forEach(skill => {
      if (!skillsMap.has(skill.name.toLowerCase())) {
        skillsMap.set(skill.name.toLowerCase(), 'missing');
      }
    });
    
    // Convert map to array
    return Array.from(skillsMap.entries()).map(([name, status]) => ({
      name: this.findOriginalSkillName(name),
      status
    }));
  }

  // Helper to find the original skill name with proper casing
  private findOriginalSkillName(lowerCaseName: string): string {
    // Check master resume first
    if (this.masterResume) {
      const masterSkill = this.masterResume.skills.find(
        s => s.name.toLowerCase() === lowerCaseName
      );
      if (masterSkill) return masterSkill.name;
    }
    
    // Check gap analysis required skills
    if (this.gapAnalysis) {
      const requiredSkill = this.gapAnalysis.skillsAnalysis.requiredSkills.find(
        s => s.name.toLowerCase() === lowerCaseName
      );
      if (requiredSkill) return requiredSkill.name;
      
      const missingSkill = this.gapAnalysis.skillsAnalysis.missingSkills.find(
        s => s.name.toLowerCase() === lowerCaseName
      );
      if (missingSkill) return missingSkill.name;
    }
    
    return lowerCaseName;
  }

  isBulletWeak(bulletDescription: string): boolean {
    if (!this.gapAnalysis) return false;
    return this.gapAnalysis.experienceAnalysis.weakBullets.some(
      wb => wb.description === bulletDescription
    );
  }

  getBulletScore(bulletDescription: string): number | null {
    if (!this.gapAnalysis) return null;
    const weakBullet = this.gapAnalysis.experienceAnalysis.weakBullets.find(
      wb => wb.description === bulletDescription
    );
    return weakBullet?.score || null;
  }

  // Get ranked responsibilities for master resume
  getRankedResponsibilities(experience: any): any[] {
    if (!experience.responsibilities || !this.jobDescription) {
      return experience.responsibilities || [];
    }

    // Score and rank bullets based on job relevance
    const rankedBullets = experience.responsibilities.map((resp: any) => {
      let score = 0;
      const bulletLower = resp.description.toLowerCase();
      const jobLower = this.jobDescription.toLowerCase();
      
      // Extract keywords and skills from job description
      const jobKeywords = this.extractKeywords(this.jobDescription);
      const jobSkills = this.extractRequiredSkills(this.jobDescription);
      
      // Score based on keyword matches
      jobKeywords.forEach(keyword => {
        if (bulletLower.includes(keyword.toLowerCase())) {
          score += 10;
        }
      });
      
      // Score based on skill matches
      jobSkills.forEach(skill => {
        if (bulletLower.includes(skill.toLowerCase())) {
          score += 15;
        }
      });
      
      // Score based on tag matches
      if (resp.tags) {
        resp.tags.forEach((tag: any) => {
          const tagName = typeof tag === 'string' ? tag : tag.name;
          if (jobSkills.some(skill => skill.toLowerCase() === tagName.toLowerCase())) {
            score += 12;
          }
          if (jobKeywords.some(keyword => keyword.toLowerCase() === tagName.toLowerCase())) {
            score += 8;
          }
        });
      }
      
      // Score based on action verbs and impact
      const actionVerbs = ['led', 'managed', 'developed', 'implemented', 'designed', 'architected', 'optimized', 'improved', 'increased', 'reduced', 'delivered', 'built', 'created', 'established'];
      actionVerbs.forEach(verb => {
        if (bulletLower.includes(verb)) {
          score += 2;
        }
      });
      
      // Score based on quantifiable results
      if (/\d+[%$km]?/.test(resp.description)) {
        score += 5;
      }
      
      return {
        ...resp,
        relevanceScore: score
      };
    });

    // Sort by relevance score (best first)
    return rankedBullets.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
  }

  // Get relevance score for a specific bullet
  getBulletRelevanceScore(bulletDescription: string): number | null {
    if (!this.jobDescription) return null;
    
    let score = 0;
    const bulletLower = bulletDescription.toLowerCase();
    const jobKeywords = this.extractKeywords(this.jobDescription);
    const jobSkills = this.extractRequiredSkills(this.jobDescription);
    
    jobKeywords.forEach(keyword => {
      if (bulletLower.includes(keyword.toLowerCase())) {
        score += 10;
      }
    });
    
    jobSkills.forEach(skill => {
      if (bulletLower.includes(skill.toLowerCase())) {
        score += 15;
      }
    });
    
    return score > 0 ? score : null;
  }

  // Helper methods for keyword and skill extraction (simplified versions)
  private extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'];
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word));
    
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });
    
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  private extractRequiredSkills(text: string): string[] {
    const textLower = text.toLowerCase();
    const foundSkills = new Set<string>();
    
    const skillPatterns = {
      languages: ['javascript', 'typescript', 'python', 'java', 'c#', 'csharp', 'c\\+\\+', 'ruby', 'php', 'go', 'rust', 'swift', 'kotlin'],
      frontend: ['react', 'angular', 'vue', 'html', 'css', 'sass', 'less', 'tailwind', 'bootstrap', 'jquery'],
      backend: ['node\\.js', 'nodejs', 'express', 'django', 'flask', 'spring', 'spring boot', '\\.net', 'asp\\.net', 'fastapi', 'laravel'],
      databases: ['sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'oracle', 'dynamodb', 'cassandra'],
      cloud: ['aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s', 'terraform', 'ansible'],
      tools: ['git', 'github', 'gitlab', 'jira', 'jenkins', 'ci/cd', 'cicd', 'devops', 'maven', 'gradle', 'npm', 'webpack']
    };
    
    Object.values(skillPatterns).flat().forEach(pattern => {
      const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
      const matches = textLower.match(regex);
      if (matches) {
        let normalized = matches[0]
          .replace(/\./g, '')
          .replace(/\\/g, '')
          .trim();
        
        if (normalized === 'nodejs' || normalized === 'node js') {
          normalized = 'Node.js';
        } else if (normalized === 'cicd' || normalized === 'ci/cd' || normalized === 'ci cd') {
          normalized = 'CI/CD';
        } else if (normalized === 'csharp' || normalized === 'c#') {
          normalized = 'C#';
        } else if (normalized === 'c++') {
          normalized = 'C++';
        } else if (normalized === 'net' || normalized === '.net') {
          normalized = '.NET';
        } else if (normalized === 'aspnet' || normalized === 'asp.net') {
          normalized = 'ASP.NET';
        } else if (normalized === 'k8s') {
          normalized = 'Kubernetes';
        } else if (normalized === 'postgres') {
          normalized = 'PostgreSQL';
        } else {
          normalized = normalized
            .split(/[\s-]+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
        
        foundSkills.add(normalized);
      }
    });
    
    return Array.from(foundSkills);
  }

  goBack() {
    this.router.navigate(['/career-resume/tailoring']);
  }

  // STAR Method + ATS Optimization Methods
  async optimizeAllBullets() {
    if (!this.masterResume || !this.jobDescription) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Missing Data',
        detail: 'Please ensure you have a master resume and job description loaded',
        life: 3000
      });
      return;
    }

    // Initialize progress tracking
    this.optimizingBullets = true;
    this.optimizationProgress = 0;
    this.currentBulletIndex = 0;
    this.aiOptimizedCount = 0;
    this.mockFallbackCount = 0;
    
    // Force change detection to show progress bar immediately
    this.cdr.detectChanges();
    
    try {
      const allBullets: Array<{id: string, description: string}> = [];
      
      // Collect all bullet points from master resume
      this.masterResume.experience.forEach(exp => {
        if (exp.responsibilities) {
          exp.responsibilities.forEach(resp => {
            if (resp.id) {
              allBullets.push({ id: resp.id, description: resp.description });
            }
          });
        }
      });

      this.totalBullets = allBullets.length;
      this.cdr.detectChanges();

      // Optimize each bullet point
      for (let i = 0; i < allBullets.length; i++) {
        const bullet = allBullets[i];
        this.currentBulletIndex = i + 1;
        this.optimizationProgress = Math.round((i / allBullets.length) * 100);
        this.cdr.detectChanges();

        try {
          const result = await this.resumeService.optimizeBulletPoint(bullet.description, this.jobDescription);
          this.optimizedBullets.set(bullet.id, result.optimizedText);
          
          // Track success vs fallback
          if (result.method === 'ai') {
            this.aiOptimizedCount++;
          } else {
            this.mockFallbackCount++;
          }
        } catch (error) {
          console.warn(`Failed to optimize bullet ${bullet.id}:`, error);
          this.mockFallbackCount++;
          // Keep original if optimization fails
          this.optimizedBullets.set(bullet.id, bullet.description);
        }
      }

      // Set to 100% complete
      this.optimizationProgress = 100;
      this.cdr.detectChanges();

      // Keep progress bar visible for at least 1 second after completion
      await new Promise(resolve => setTimeout(resolve, 1000));

      const failedCount = this.totalBullets - this.aiOptimizedCount - this.mockFallbackCount;
      this.messageService.add({
        severity: 'success',
        summary: 'Optimization Complete',
        detail: `Optimized ${this.totalBullets} bullets: ${this.aiOptimizedCount} AI-optimized, ${this.mockFallbackCount} mock fallback${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
        life: 5000
      });
    } catch (error) {
      console.error('Error optimizing bullets:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Optimization Failed',
        detail: 'Failed to optimize bullet points. Please try again.',
        life: 3000
      });
    } finally {
      this.optimizingBullets = false;
      this.optimizationProgress = 0;
      this.cdr.detectChanges();
    }
  }

  getBulletDisplay(resp: any): string {
    if (this.bulletViewMode === 'optimized' && resp.id && this.optimizedBullets.has(resp.id)) {
      return this.optimizedBullets.get(resp.id) || resp.description;
    }
    return resp.description;
  }

  toggleBulletView() {
    if (this.bulletViewMode === 'optimized') {
      // Always show progress bar and optimize when switching to optimized view
      this.optimizeAllBullets();
    }
  }

  onViewModeChange() {
    if (this.viewMode === 'edit') {
      // Navigate to Experience Editor for editing
      this.router.navigate(['/career-resume/experience']);
    }
  }

  exportAnalysisReport() {
    if (!this.gapAnalysis) return;

    const report = this.generateAnalysisReport();
    this.downloadFile(report, 'resume-gap-analysis.md', 'text/markdown');
  }

  private generateAnalysisReport(): string {
    if (!this.gapAnalysis) return '';

    let report = '# Resume Gap Analysis Report\n\n';
    report += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    report += `## Overall Score: ${this.gapAnalysis.overallScore}/100\n\n`;
    
    report += `### Metrics\n`;
    report += `- Skills Match: ${this.gapAnalysis.skillsAnalysis.matchPercentage}%\n`;
    report += `- Bullet Quality: ${this.gapAnalysis.experienceAnalysis.bulletQualityScore}%\n`;
    report += `- ATS Optimization: ${this.gapAnalysis.atsScore.score}%\n\n`;
    
    report += `### Missing Critical Skills\n`;
    this.gapAnalysis.skillsAnalysis.missingSkills.forEach(skill => {
      report += `- ${skill.name}\n`;
    });
    report += '\n';
    
    report += `### Recommendations\n`;
    this.gapAnalysis.recommendations.forEach((rec, idx) => {
      report += `${idx + 1}. **[${rec.priority.toUpperCase()}]** ${rec.title}\n`;
      report += `   - ${rec.actionable}\n\n`;
    });

    return report;
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
}

