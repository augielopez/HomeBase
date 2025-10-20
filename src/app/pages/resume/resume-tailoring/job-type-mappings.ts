export interface JobTypeMapping {
  name: string;
  description: string;
  tags: string[];
}

export const JOB_TYPE_MAPPINGS: JobTypeMapping[] = [
  {
    name: 'Software Engineer',
    description: 'Full-stack software development role',
    tags: [
      'Angular', 'TypeScript', 'JavaScript', 'REST API', 'Full Stack', 
      'Frontend', 'Backend', 'C#', '.NET', 'SQL', 'API Development',
      'Database', 'Web Development', 'MVC', 'Entity Framework', 'Azure',
      'AWS', 'Cloud', 'DevOps', 'CI/CD', 'Git', 'Agile', 'Testing'
    ]
  },
  {
    name: 'Senior Software Engineer',
    description: 'Senior-level software development with architecture focus',
    tags: [
      'Angular', 'TypeScript', 'JavaScript', 'REST API', 'Full Stack',
      'Architecture', 'System Design', 'Scalability', 'Enterprise Architecture',
      'C#', '.NET', 'SQL', 'API Development', 'Microservices', 'Cloud',
      'Azure', 'AWS', 'DevOps', 'CI/CD', 'Leadership', 'Mentorship',
      'Code Review', 'Best Practices', 'Security', 'Performance'
    ]
  },
  {
    name: 'Frontend Developer',
    description: 'Frontend-focused web development',
    tags: [
      'Angular', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Frontend',
      'UI/UX', 'Responsive Design', 'Web Development', 'React', 'Vue',
      'UI Development', 'Cross-Platform', 'Testing', 'Git', 'Agile'
    ]
  },
  {
    name: 'Backend Developer',
    description: 'Backend and API development',
    tags: [
      'C#', '.NET', 'Backend', 'API Development', 'REST API', 'SQL',
      'Database', 'Entity Framework', 'Microservices', 'Transaction Processing',
      'Performance', 'Scalability', 'Cloud', 'Azure', 'AWS', 'DevOps'
    ]
  },
  {
    name: 'Full Stack Developer',
    description: 'Full-stack web application development',
    tags: [
      'Angular', 'TypeScript', 'JavaScript', 'C#', '.NET', 'Full Stack',
      'Frontend', 'Backend', 'REST API', 'SQL', 'Database', 'MVC',
      'Entity Framework', 'Web Development', 'API Development', 'Cloud',
      'Agile', 'Testing', 'Git', 'DevOps'
    ]
  },
  {
    name: 'Project Manager',
    description: 'Project management and team coordination',
    tags: [
      'Project Management', 'Agile', 'Scrum', 'Leadership', 'Communication',
      'Team Coordination', 'Sprint Planning', 'Workflow Optimization',
      'Task Management', 'JIRA', 'Collaboration', 'Teamwork', 'Team Development',
      'Mentorship', 'Stakeholder Management'
    ]
  },
  {
    name: 'DevOps Engineer',
    description: 'DevOps, CI/CD, and infrastructure automation',
    tags: [
      'DevOps', 'CI/CD', 'Azure DevOps', 'Jenkins', 'Docker', 'Kubernetes',
      'Cloud', 'Azure', 'AWS', 'Infrastructure', 'Automation', 'Deployment',
      'Release Management', 'Continuous Delivery', 'Monitoring', 'Security',
      'Testing', 'Git', 'GitLab', 'Terraform'
    ]
  },
  {
    name: 'Business Analyst',
    description: 'Business analysis and requirements gathering',
    tags: [
      'Business Analysis', 'Requirements Gathering', 'Data Analysis',
      'Reporting', 'Communication', 'Collaboration', 'Project Management',
      'Agile', 'Scrum', 'SQL', 'Excel', 'Documentation', 'Stakeholder Management'
    ]
  },
  {
    name: 'Solutions Architect',
    description: 'Solution architecture and system design',
    tags: [
      'Architecture', 'System Design', 'Enterprise Architecture', 'Scalability',
      'Cloud', 'Azure', 'AWS', 'Microservices', 'API Development', 'REST API',
      'Security', 'Performance', 'Best Practices', 'Technical Leadership',
      'Solution Design', 'Integration', 'DevOps', 'Database'
    ]
  },
  {
    name: 'Healthcare IT',
    description: 'Healthcare technology and compliance',
    tags: [
      'Healthcare', 'HIPAA', 'Compliance', 'Security', 'SOC', 'Governance',
      'Auditing', 'Logging', 'Enterprise Application', 'Full Stack',
      'Database', 'Reporting', 'ETL', 'Analytics', 'Performance Improvement'
    ]
  }
];


