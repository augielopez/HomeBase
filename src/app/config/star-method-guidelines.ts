// STAR Method Guidelines for Resume Bullet Point Optimization
// Based on the STAR method: Situation, Task, Action, Result

export const STAR_GUIDELINES = {
  method: "STAR (Situation, Task, Action, Result)",
  description: "Transform resume bullet points to follow STAR method with ATS optimization",
  
  rules: [
    "Start with a strong action verb (Led, Developed, Implemented, Designed, etc.)",
    "Include quantifiable metrics (numbers, percentages, dollar amounts, timeframes)",
    "Show specific outcomes and measurable impact",
    "Be concise yet comprehensive (1-2 lines maximum)",
    "Include relevant ATS keywords from the job description",
    "Focus on achievements rather than just responsibilities",
    "Use industry-specific terminology when appropriate"
  ],

  actionVerbs: [
    "Led", "Managed", "Developed", "Implemented", "Designed", "Architected", 
    "Optimized", "Improved", "Increased", "Reduced", "Delivered", "Built", 
    "Created", "Established", "Streamlined", "Automated", "Enhanced", 
    "Transformed", "Launched", "Executed", "Coordinated", "Collaborated",
    "Mentored", "Trained", "Resolved", "Analyzed", "Evaluated"
  ],

  examples: {
    before: [
      "Responsible for taking inventory and ordering supplies.",
      "Helped with after-school tutoring program.",
      "Processed payments and balanced the cash register.",
      "Served customers and answered questions.",
      "Trained new team members on store policies."
    ],
    after: [
      "Reorganized the inventory process after noticing frequent supply shortages, reducing stockouts by 40% and saving the company over $10,000 annually.",
      "Developed and marketed a new after-school tutoring program, increasing student participation by 60% and improving average test scores by 25%.",
      "Streamlined payment processing operations, reducing transaction time by 30% and achieving 99.9% accuracy in cash register reconciliation.",
      "Enhanced customer service experience by implementing new support protocols, resulting in 35% increase in customer satisfaction scores.",
      "Established comprehensive training program for new team members, reducing onboarding time by 50% and improving employee retention by 20%."
    ]
  },

  metrics: [
    "percentage improvements (%)",
    "dollar amounts ($)",
    "time reductions (hours, days, weeks)",
    "quantity increases (users, transactions, revenue)",
    "efficiency gains (faster, more accurate, streamlined)",
    "scale indicators (team size, project scope, user base)"
  ],

  atsOptimization: {
    description: "Include relevant keywords from job description while maintaining natural language",
    techniques: [
      "Incorporate required skills mentioned in job posting",
      "Use industry-standard terminology",
      "Include technology names and frameworks",
      "Mention relevant methodologies (Agile, Scrum, DevOps, etc.)",
      "Reference specific tools and platforms",
      "Use action-oriented language that ATS systems recognize"
    ]
  }
};

export const OPTIMIZATION_PROMPT_TEMPLATE = `
You are an expert resume writer specializing in the STAR method and ATS optimization. 

Transform the following bullet point to follow STAR method principles while incorporating relevant keywords from the job description:

STAR Method Rules:
- Start with a strong action verb
- Include quantifiable metrics (numbers, %, $)
- Show specific outcomes and impact
- Be concise (1-2 lines max)
- Include relevant ATS keywords from job description

Original Bullet Point: "{bulletPoint}"

Job Description Context: "{jobDescription}"

Required Skills/Keywords: {keywords}

Transform this bullet point to be more impactful, quantifiable, and ATS-optimized while maintaining authenticity. Focus on achievements rather than just responsibilities.

Optimized Bullet Point:`;

export const MOCK_OPTIMIZATION_RULES = {
  // Fallback optimization when AI is unavailable
  addMetrics: [
    "by 25%", "by 40%", "by 60%", "by 30%", "by 50%", "by 35%", "by 20%", "by 15%"
  ],
  addScale: [
    "serving 100K+ users", "processing 1M+ transactions", "managing team of 8", 
    "handling 500K+ daily requests", "supporting 50+ clients", "reducing costs by $100K"
  ],
  addTimeframes: [
    "within 6 months", "over 2 years", "in 3 months", "annually", "quarterly", "monthly"
  ],
  improveVerbs: {
    "worked on": "developed",
    "helped with": "led",
    "was responsible for": "managed",
    "did": "implemented",
    "made": "created",
    "fixed": "resolved",
    "used": "leveraged",
    "did stuff with": "optimized"
  }
};
