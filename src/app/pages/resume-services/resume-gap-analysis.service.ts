import { Injectable } from '@angular/core';
import { 
  ResumeGapAnalysis, 
  SkillsGapAnalysis, 
  ExperienceGapAnalysis, 
  ATSAnalysis,
  Recommendation,
  SkillMatch,
  BulletAnalysis,
  KeywordDensity,
  MasterResume,
  TailoredResume
} from '../../interfaces/resume.interface';

@Injectable({
  providedIn: 'root'
})
export class ResumeGapAnalysisService {

  constructor() {}

  /**
   * Perform comprehensive gap analysis comparing master resume with tailored resume and job requirements
   */
  analyzeResumeGap(
    masterResume: MasterResume,
    tailoredResume: TailoredResume,
    jobDescription: string
  ): ResumeGapAnalysis {
    // Extract job requirements
    const jobSkills = this.extractSkillsFromJobDescription(jobDescription);
    const jobKeywords = this.extractKeywordsFromJobDescription(jobDescription);
    const jobResponsibilities = this.extractResponsibilitiesFromJobDescription(jobDescription);

    // Analyze each component
    const skillsAnalysis = this.compareSkills(masterResume, tailoredResume, jobSkills);
    const experienceAnalysis = this.analyzeExperience(tailoredResume, jobKeywords, jobResponsibilities);
    const atsScore = this.calculateATSScore(tailoredResume, jobDescription, jobKeywords);

    // Calculate overall score
    const overallScore = Math.round(
      skillsAnalysis.matchPercentage * 0.35 +
      experienceAnalysis.bulletQualityScore * 0.30 +
      atsScore.score * 0.20 +
      (tailoredResume.experience.length > 0 ? 100 : 0) * 0.15
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      skillsAnalysis,
      experienceAnalysis,
      atsScore,
      masterResume,
      tailoredResume
    );

    return {
      overallScore,
      skillsAnalysis,
      experienceAnalysis,
      atsScore,
      recommendations
    };
  }

  /**
   * Compare skills between master resume, tailored resume, and job requirements
   */
  private compareSkills(
    masterResume: MasterResume,
    tailoredResume: TailoredResume,
    jobSkills: string[]
  ): SkillsGapAnalysis {
    const masterSkillNames = new Set(masterResume.skills.map(s => s.name.toLowerCase()));
    const tailoredSkillNames = new Set(tailoredResume.skills.map(s => s.name.toLowerCase()));

    // Combine job skills with tailored resume skills to get all required skills
    // This ensures that skills added to the ideal resume (like default professional skills) are considered required
    const allRequiredSkills = new Set([
      ...jobSkills,
      ...tailoredResume.skills.map(s => s.name)
    ]);

    const requiredSkills: SkillMatch[] = Array.from(allRequiredSkills).map(skill => {
      const skillLower = skill.toLowerCase();
      const inMaster = masterSkillNames.has(skillLower);
      const inTailored = tailoredSkillNames.has(skillLower);
      
      // Check for transferable/alternative skills
      const alternatives = this.findAlternativeSkills(skill, Array.from(masterSkillNames));
      const hasAlternative = alternatives.length > 0;

      let status: 'matched' | 'partial' | 'missing';
      if (inMaster && inTailored) {
        status = 'matched';
      } else if (inMaster || hasAlternative) {
        status = 'partial';
      } else {
        status = 'missing';
      }

      return {
        name: skill,
        status,
        inMasterResume: inMaster,
        inTailoredResume: inTailored,
        alternatives: alternatives.length > 0 ? alternatives : undefined
      };
    });

    const matchedSkills = requiredSkills.filter(s => s.status === 'matched');
    const missingSkills = requiredSkills.filter(s => s.status === 'missing');
    const matchPercentage = allRequiredSkills.size > 0 
      ? Math.round((matchedSkills.length / allRequiredSkills.size) * 100)
      : 100;

    return {
      requiredSkills,
      matchedSkills,
      missingSkills,
      matchPercentage
    };
  }

  /**
   * Find alternative/transferable skills
   */
  private findAlternativeSkills(targetSkill: string, availableSkills: string[]): string[] {
    const skillRelationships: { [key: string]: string[] } = {
      'angular': ['react', 'vue', 'typescript', 'javascript'],
      'react': ['angular', 'vue', 'typescript', 'javascript'],
      'vue': ['angular', 'react', 'typescript', 'javascript'],
      'aws': ['azure', 'gcp', 'cloud'],
      'azure': ['aws', 'gcp', 'cloud'],
      'gcp': ['aws', 'azure', 'cloud'],
      'sql server': ['postgresql', 'mysql', 'oracle', 'sql'],
      'postgresql': ['sql server', 'mysql', 'oracle', 'sql'],
      'mysql': ['sql server', 'postgresql', 'oracle', 'sql'],
      'docker': ['kubernetes', 'containers'],
      'kubernetes': ['docker', 'containers'],
      'c#': ['.net', 'asp.net', 'entity framework'],
      '.net': ['c#', 'asp.net', 'entity framework'],
      'node.js': ['javascript', 'typescript', 'express'],
      'python': ['django', 'flask', 'fastapi'],
      'java': ['spring', 'spring boot', 'hibernate']
    };

    const targetLower = targetSkill.toLowerCase();
    const related = skillRelationships[targetLower] || [];
    
    return related.filter(alt => availableSkills.includes(alt));
  }

  /**
   * Analyze experience quality and relevance
   */
  private analyzeExperience(
    tailoredResume: TailoredResume,
    jobKeywords: string[],
    jobResponsibilities: string[]
  ): ExperienceGapAnalysis {
    let totalBullets = 0;
    let relevantBullets = 0;
    const weakBullets: BulletAnalysis[] = [];
    const foundKeywords = new Set<string>();

    // Analyze each responsibility bullet
    tailoredResume.experience.forEach(exp => {
      exp.responsibilities?.forEach(resp => {
        totalBullets++;
        
        // Check if bullet is relevant (contains job keywords)
        const isRelevant = jobKeywords.some(keyword => 
          resp.description.toLowerCase().includes(keyword.toLowerCase())
        );
        if (isRelevant) relevantBullets++;

        // Track which keywords are found
        jobKeywords.forEach(keyword => {
          if (resp.description.toLowerCase().includes(keyword.toLowerCase())) {
            foundKeywords.add(keyword);
          }
        });

        // Analyze bullet quality
        const bulletAnalysis = this.analyzeBulletQuality(resp.description);
        if (bulletAnalysis.score < 60) {
          weakBullets.push(bulletAnalysis);
        }
      });
    });

    // Find missing keywords
    const missingKeywords = jobKeywords.filter(k => !foundKeywords.has(k));

    // Calculate bullet quality score
    const bulletQualityScore = weakBullets.length === 0 && totalBullets > 0
      ? 100
      : totalBullets > 0
        ? Math.round(((totalBullets - weakBullets.length) / totalBullets) * 100)
        : 0;

    return {
      totalBullets,
      relevantBullets,
      weakBullets,
      missingKeywords,
      bulletQualityScore
    };
  }

  /**
   * Analyze individual bullet point quality
   */
  private analyzeBulletQuality(bullet: string): BulletAnalysis {
    let score = 0;
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for action verb
    const actionVerbs = ['designed', 'developed', 'led', 'managed', 'created', 'implemented', 
                         'architected', 'built', 'deployed', 'optimized', 'improved', 'reduced',
                         'increased', 'established', 'collaborated', 'coordinated', 'executed',
                         'delivered', 'enhanced', 'streamlined', 'transformed', 'spearheaded'];
    const hasActionVerb = actionVerbs.some(verb => bullet.toLowerCase().includes(verb));
    if (hasActionVerb) {
      score += 20;
    } else {
      issues.push('Missing action verb');
      suggestions.push('Start with a strong action verb (designed, developed, led, etc.)');
    }

    // Check for quantification
    const hasNumber = /\d+/.test(bullet);
    const hasPercentage = /%/.test(bullet);
    const hasMetric = /\$|million|billion|thousand|users|clients|applications/.test(bullet);
    if (hasNumber || hasPercentage || hasMetric) {
      score += 30;
    } else {
      issues.push('No quantifiable metrics');
      suggestions.push('Add numbers, percentages, or measurable impact');
    }

    // Check for impact/result
    const impactWords = ['improved', 'increased', 'reduced', 'saved', 'generated', 'achieved', 
                        'delivered', 'enhanced', 'optimized', 'resulting', 'enabling'];
    const hasImpact = impactWords.some(word => bullet.toLowerCase().includes(word));
    if (hasImpact) {
      score += 25;
    } else {
      issues.push('Unclear impact or result');
      suggestions.push('Describe the outcome or business impact');
    }

    // Check length (optimal: 10-25 words)
    const wordCount = bullet.split(/\s+/).length;
    if (wordCount >= 10 && wordCount <= 25) {
      score += 15;
    } else if (wordCount < 10) {
      issues.push('Too brief');
      suggestions.push('Add more context and details (aim for 10-25 words)');
    } else {
      issues.push('Too long');
      suggestions.push('Condense to 10-25 words for better readability');
    }

    // Check for technical specificity
    const techTerms = ['api', 'database', 'cloud', 'framework', 'system', 'application',
                       'platform', 'service', 'architecture', 'infrastructure'];
    const hasTechTerms = techTerms.some(term => bullet.toLowerCase().includes(term));
    if (hasTechTerms) {
      score += 10;
    }

    return {
      description: bullet,
      score,
      issues,
      suggestions
    };
  }

  /**
   * Calculate ATS (Applicant Tracking System) optimization score
   */
  private calculateATSScore(
    resume: TailoredResume,
    jobDescription: string,
    jobKeywords: string[]
  ): ATSAnalysis {
    const resumeText = this.flattenResumeToText(resume);
    const keywordDensity: KeywordDensity[] = [];
    const formattingIssues: string[] = [];
    const suggestions: string[] = [];

    // Analyze keyword density
    jobKeywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = resumeText.match(regex);
      const count = matches ? matches.length : 0;
      const optimal = keyword.length > 8 ? 2 : 3; // Longer keywords: 2x, shorter: 3x

      let status: 'good' | 'low' | 'high';
      if (count === 0) {
        status = 'low';
        suggestions.push(`Add keyword "${keyword}" to your resume`);
      } else if (count < optimal) {
        status = 'low';
        suggestions.push(`Increase usage of "${keyword}" (currently ${count}x, optimal ${optimal}x)`);
      } else if (count > optimal * 2) {
        status = 'high';
        suggestions.push(`Reduce usage of "${keyword}" to avoid keyword stuffing`);
      } else {
        status = 'good';
      }

      keywordDensity.push({ keyword, count, optimal, status });
    });

    // Check formatting
    if (!resume.contact.email || !resume.contact.phone) {
      formattingIssues.push('Missing contact information');
    }
    if (!resume.summary || resume.summary.length < 50) {
      formattingIssues.push('Professional summary is too short or missing');
    }
    if (resume.skills.length < 10) {
      formattingIssues.push('Skills section has fewer than 10 items');
    }

    // Calculate ATS score based on keyword coverage
    const goodKeywords = keywordDensity.filter(k => k.status === 'good').length;
    const totalKeywords = keywordDensity.length;
    const keywordScore = totalKeywords > 0 ? (goodKeywords / totalKeywords) * 100 : 0;
    
    // Deduct points for formatting issues
    const formatPenalty = formattingIssues.length * 10;
    const score = Math.max(0, Math.round(keywordScore - formatPenalty));

    return {
      score,
      keywordDensity,
      formattingIssues,
      suggestions
    };
  }

  /**
   * Flatten resume to searchable text
   */
  private flattenResumeToText(resume: TailoredResume): string {
    const parts: string[] = [];
    
    parts.push(resume.summary || '');
    parts.push(...resume.skills.map(s => s.name));
    resume.experience.forEach(exp => {
      parts.push(exp.role);
      parts.push(exp.company);
      exp.responsibilities?.forEach(r => parts.push(r.description));
    });
    resume.projects.forEach(proj => {
      parts.push(proj.title);
      parts.push(proj.description || '');
    });

    return parts.join(' ').toLowerCase();
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    skillsAnalysis: SkillsGapAnalysis,
    experienceAnalysis: ExperienceGapAnalysis,
    atsScore: ATSAnalysis,
    masterResume: MasterResume,
    tailoredResume: TailoredResume
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Critical: Missing required skills
    skillsAnalysis.missingSkills.forEach(skill => {
      if (!skill.alternatives || skill.alternatives.length === 0) {
        recommendations.push({
          type: 'skill',
          priority: 'critical',
          title: `Missing Required Skill: ${skill.name}`,
          description: `This skill is required for the job but not found in your resume.`,
          actionable: skill.alternatives && skill.alternatives.length > 0
            ? `Consider highlighting your ${skill.alternatives.join(', ')} experience as transferable`
            : `Add ${skill.name} to your skills section or highlight it in your experience`
        });
      }
    });

    // High: Partial skill matches
    skillsAnalysis.requiredSkills.filter(s => s.status === 'partial').forEach(skill => {
      recommendations.push({
        type: 'skill',
        priority: 'high',
        title: `Skill Not Highlighted: ${skill.name}`,
        description: `You have ${skill.alternatives?.join(', ')} but not ${skill.name} specifically listed.`,
        actionable: `Add ${skill.name} to your skills section or mention it in a responsibility bullet`
      });
    });

    // High: Weak bullets
    if (experienceAnalysis.weakBullets.length > 0) {
      experienceAnalysis.weakBullets.slice(0, 5).forEach(bullet => {
        recommendations.push({
          type: 'experience',
          priority: 'high',
          title: `Weak Bullet Point (Score: ${bullet.score}/100)`,
          description: bullet.description.substring(0, 100) + '...',
          actionable: bullet.suggestions[0] || 'Strengthen this bullet with metrics and impact'
        });
      });
    }

    // Medium: Missing keywords
    if (experienceAnalysis.missingKeywords.length > 0) {
      recommendations.push({
        type: 'keyword',
        priority: 'medium',
        title: `Missing ${experienceAnalysis.missingKeywords.length} Key Terms`,
        description: `Keywords from job description not found in experience: ${experienceAnalysis.missingKeywords.slice(0, 5).join(', ')}`,
        actionable: 'Incorporate these keywords naturally into your responsibility bullets'
      });
    }

    // Medium: ATS optimization
    const lowKeywords = atsScore.keywordDensity.filter(k => k.status === 'low');
    if (lowKeywords.length > 0) {
      recommendations.push({
        type: 'keyword',
        priority: 'medium',
        title: `ATS Keyword Optimization Needed`,
        description: `${lowKeywords.length} important keywords appear too infrequently`,
        actionable: `Increase usage of: ${lowKeywords.slice(0, 3).map(k => k.keyword).join(', ')}`
      });
    }

    // Low: Formatting improvements
    if (atsScore.formattingIssues.length > 0) {
      atsScore.formattingIssues.forEach(issue => {
        recommendations.push({
          type: 'format',
          priority: 'low',
          title: 'Formatting Issue',
          description: issue,
          actionable: 'Review and update the affected section'
        });
      });
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  }

  /**
   * Extract skills from job description
   */
  private extractSkillsFromJobDescription(text: string): string[] {
    const textLower = text.toLowerCase();
    const foundSkills = new Set<string>();
    
    // Comprehensive skill patterns matching resume service
    const skillPatterns = {
      languages: ['javascript', 'typescript', 'python', 'java', 'c#', 'csharp', 'c\\+\\+', 'ruby', 'php', 'go', 'rust', 'swift', 'kotlin'],
      frontend: ['react', 'angular', 'vue', 'html', 'css', 'sass', 'less', 'tailwind', 'bootstrap', 'jquery'],
      backend: ['node\\.js', 'nodejs', 'express', 'django', 'flask', 'spring', 'spring boot', '\\.net', 'asp\\.net', 'fastapi', 'laravel'],
      databases: ['sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'oracle', 'dynamodb', 'cassandra'],
      cloud: ['aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s', 'terraform', 'ansible'],
      tools: ['git', 'github', 'gitlab', 'jira', 'jenkins', 'ci/cd', 'cicd', 'devops', 'maven', 'gradle', 'npm', 'webpack']
    };
    
    // Search for each skill pattern
    Object.values(skillPatterns).flat().forEach(pattern => {
      const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
      const matches = textLower.match(regex);
      if (matches) {
        // Normalize the skill name
        let normalized = matches[0]
          .replace(/\./g, '')  // Remove dots
          .replace(/\\/g, '')  // Remove backslashes from regex patterns
          .trim();
        
        // Special formatting for specific skills
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
          // Standard capitalization
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

  /**
   * Extract keywords from job description
   */
  private extractKeywordsFromJobDescription(text: string): string[] {
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 4 && !commonWords.includes(word));
    
    const wordCounts = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * Extract responsibilities from job description
   */
  private extractResponsibilitiesFromJobDescription(text: string): string[] {
    const responsibilities: string[] = [];
    const bulletPattern = /(?:^|\n)\s*(?:[-•*]|\d+\.)\s*([^\n]+)/g;
    const matches = text.matchAll(bulletPattern);
    
    for (const match of matches) {
      const resp = match[1].trim();
      if (resp.length > 20 && resp.length < 200) {
        responsibilities.push(resp);
      }
    }
    
    return responsibilities;
  }
}

