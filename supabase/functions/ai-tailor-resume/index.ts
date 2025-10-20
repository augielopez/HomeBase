import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface TailoringRequest {
  jobDescription: string;
  masterResume: {
    contact: any;
    skills: any[];
    experience: any[];
    education: any[];
    certifications: any[];
    projects: any[];
    volunteer: any[];
  };
  useMockMode?: boolean;
}

interface TailoringResponse {
  jobBreakdown: {
    benefits: string[];
    payRange: string;
    fitRating: number;
    requiredSkills: string[];
    responsibilities: string[];
    matchSummary: string;
  };
  tailoredResume: any;
  analysis: string;
  recommendations: string[];
  _debug?: {
    method: 'mock' | 'openai';
    timestamp: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    console.log('AI Tailor Resume function called')
    
    // Parse request body
    const { jobDescription, masterResume, useMockMode }: TailoringRequest = await req.json()
    console.log('Request parsed, jobDescription length:', jobDescription?.length, 'masterResume exists:', !!masterResume, 'useMockMode:', useMockMode)

    if (!jobDescription || !masterResume) {
      console.error('Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Job description and master resume are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // If user explicitly requests mock mode, use it
    if (useMockMode) {
      console.log('User requested mock mode, generating mock response...')
      try {
        const mockResponse = generateMockTailoredResume(jobDescription, masterResume)
        mockResponse._debug = {
          method: 'mock',
          timestamp: new Date().toISOString()
        }
        console.log('Mock response generated successfully')
        return new Response(
          JSON.stringify(mockResponse),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } catch (mockError) {
        console.error('Error generating mock response:', mockError)
        throw mockError
      }
    }

    // Create AI prompt for resume tailoring
    const aiPrompt = createTailoringPrompt(jobDescription, masterResume)
    console.log('AI prompt created, length:', aiPrompt.length)

    // Call OpenAI API (you'll need to add your OpenAI API key to Supabase secrets)
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    console.log('OpenAI API key exists:', !!openaiApiKey)
    
    if (!openaiApiKey) {
      // Return mock response for development if no API key
      console.log('No API key found, generating mock response...')
      try {
        const mockResponse = generateMockTailoredResume(jobDescription, masterResume)
        mockResponse._debug = {
          method: 'mock',
          timestamp: new Date().toISOString()
        }
        console.log('Mock response generated successfully')
        return new Response(
          JSON.stringify(mockResponse),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } catch (mockError) {
        console.error('Error generating mock response:', mockError)
        throw mockError
      }
    }

    // Make request to OpenAI
    console.log('Calling OpenAI API...')
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional resume tailoring assistant. You help job seekers customize their resumes for specific job applications by analyzing job descriptions and highlighting relevant experience, skills, and achievements.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    })

    console.log('OpenAI response status:', openaiResponse.status)
    
    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text()
      console.error('OpenAI API error body:', errorBody)
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${openaiResponse.statusText} - ${errorBody}`)
    }

    const openaiData = await openaiResponse.json()
    console.log('OpenAI response received, choices:', openaiData.choices?.length)
    
    if (!openaiData.choices || !openaiData.choices[0]) {
      throw new Error('OpenAI response missing choices array')
    }
    
    const aiResponse = openaiData.choices[0].message.content
    console.log('AI response content length:', aiResponse?.length)
    console.log('AI response preview (first 1000 chars):', aiResponse?.substring(0, 1000))
    console.log('AI response preview (last 1000 chars):', aiResponse?.substring(Math.max(0, aiResponse.length - 1000)))

    // Parse AI response and structure the tailored resume
    const tailoredResume = parseAIResponse(aiResponse, masterResume)
    tailoredResume._debug = {
      method: 'openai',
      timestamp: new Date().toISOString()
    }

    return new Response(
      JSON.stringify(tailoredResume),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in AI tailor resume function:', error)
    console.error('Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        type: error.constructor.name 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function createTailoringPrompt(jobDescription: string, masterResume: any): string {
  return `
You are the Job Tailoring Assistant.

Step 1 — Analyze the Job Description: Extract required skills, tools, compensation details, benefits, and role responsibilities from the job description text. Categorize extracted items into core technical skills, soft/leadership skills, responsibilities or impact areas, and job offering details such as pay and benefits.

Step 2 — Generate Job Breakdown: Before tailoring the resume, provide a breakdown of the job that includes the extracted benefits, pay range, required skills, and responsibilities. Compare these details with the candidate's master resume data and calculate a star rating (1–5) representing how well the candidate aligns with the job requirements.

Step 3 — Search the Master Resume JSON: Search for matching responsibilities, projects, and skills in the master resume by tag, skill name or synonym, and context match with job responsibilities or industry keywords.

Step 4 — Select and Expand Relevant Achievements: For EACH work experience in the master resume (unless excluded), you MUST include AT LEAST 3-4 bullet points. First, select the most relevant achievements that align with the target job. If a job has fewer than 3 matching bullets from the master resume, include additional bullets from that same job's responsibilities to meet the minimum of 3 bullets. Only generate new bullets if the master resume truly has insufficient bullets for a given experience. Ensure all bullets are action-oriented and quantifiable when possible.

Step 5 — Build Comprehensive Skill List: Extract explicit skills mentioned in the job description. For each extracted skill, identify related and complementary skills from the master resume (e.g., if Angular is mentioned, include TypeScript, RxJS, HTML, CSS, etc.). Recognize transferable skills (Angular/React are interchangeable, AWS/Azure/GCP are cloud equivalents). Organize skills by category: Frontend, Backend, Cloud/DevOps, Databases, Tools, Soft Skills. Ensure each category contains at least 3-4 representative skills to demonstrate breadth. Prioritize skills with most relevant tags and recent usage. Include 15-20 total skills even if job description lacks technical detail.

Step 6 — Rewrite and Align Language: Rewrite the selected and approved bullets to mirror the tone and phrasing of the job description while maintaining truthfulness to the candidate's experience. Optimize for ATS keyword matching and enhance with impact metrics if present or inferable.

Step 7 — Tailor the Professional Summary: Use the professional summary from the master resume's contact information. Adapt the language and emphasis to align with the target job's key requirements and industry terminology. Maintain the candidate's voice and core qualifications while emphasizing the most relevant aspects for this specific role. If no summary is provided in the master resume, create a professional summary consisting of three to four sentences highlighting overall experience, technical expertise, domain strengths, and alignment with the target role's focus.

Step 8 — Assemble the Tailored Resume: Compile into a cohesive document with a target length of two pages, falling back to one if needed. Follow the structure: summary, skills, experience, projects, education. Prioritize recency and relevance and remove empty sections.

Step 9 — Output in JSON Format: Structure the final output as { contact, summary, skills, experience, projects, education } with consistent keys and formats.

Step 10 — Validation & Review Check (optional): Compare total resume length, number of bullets, and skill coverage to ensure completeness. Offer a review prompt for optional inclusion of generated bullets, confirm accuracy of job-to-resume alignment, and log matches and expansions for transparency.

Job Description:
${jobDescription}

Master Resume JSON:
${JSON.stringify(masterResume, null, 2)}

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any text before or after the JSON object.

Your response must follow this EXACT structure with ALL fields populated:

{
  "jobBreakdown": {
    "benefits": ["Health Insurance", "401k", "Remote Work", "PTO"],
    "payRange": "$75,000 - $120,000 per year",
    "fitRating": 4,
    "requiredSkills": ["Angular", "TypeScript", "REST APIs", "Azure", "CI/CD"],
    "responsibilities": ["Design and develop applications", "Work with cross-functional teams", "Maintain code quality"],
    "matchSummary": "Strong match with 8+ years of full-stack development experience including Angular, TypeScript, and cloud platforms."
  },
  "tailoredResume": {
    "contact": {
      "name": "Full Name",
      "email": "email@example.com",
      "phone": "123-456-7890",
      "location": "City, State",
      "linkedin": "linkedin.com/in/profile",
      "github": "github.com/username"
    },
    "summary": "Senior Software Engineer with 9+ years of experience in full-stack development...",
    "skills": [
      {
        "id": "skill-uuid-1",
        "name": "Angular",
        "category": "Frontend",
        "is_featured": true,
        "display_order": 1,
        "tags": ["Frontend", "Framework", "TypeScript"]
      },
      {
        "id": "skill-uuid-2",
        "name": "TypeScript",
        "category": "Languages",
        "is_featured": true,
        "display_order": 2,
        "tags": ["Language", "JavaScript", "Frontend"]
      }
    ],
    "experience": [
      {
        "id": "exp-uuid-1",
        "role": "Senior Software Engineer",
        "company": "Company Name",
        "start_date": "2023-06-01",
        "end_date": null,
        "responsibilities": [
          {
            "id": "resp-uuid-1",
            "description": "Designed and deployed enterprise applications ensuring HIPAA compliance",
            "tags": ["Compliance", "Security", "Enterprise"]
          },
          {
            "id": "resp-uuid-2",
            "description": "Implemented CI/CD pipelines using Azure DevOps and Jenkins",
            "tags": ["DevOps", "CI/CD", "Azure"]
          }
        ]
      }
    ],
    "education": [
      {
        "id": "edu-uuid-1",
        "degree": "Bachelor of Science",
        "field_of_study": "Computer Science",
        "institution": "University Name",
        "start_date": "2010-09-01",
        "end_date": "2014-05-01",
        "minor": "Database Management",
        "notes": "Summa Cum Laude"
      }
    ],
    "projects": [
      {
        "id": "proj-uuid-1",
        "name": "Project Name",
        "description": "Description of the project and technologies used",
        "technologies": "Angular, .NET Core, PostgreSQL",
        "tags": ["Frontend", "Backend", "Database"]
      }
    ],
    "certifications": [],
    "volunteer": []
  },
  "analysis": "The resume has been tailored to emphasize Angular development, cloud experience, and enterprise application development which align with the job requirements.",
  "recommendations": [
    "Emphasize your experience with Outsystems or low-code platforms if available",
    "Highlight specific examples of working in Agile/Scrum environments",
    "Include quantifiable metrics for application performance improvements"
  ]
}

REMEMBER: 
- Respond with ONLY the JSON object, no additional text
- Include ALL fields even if some are empty arrays
- Ensure skills array has at least 10-15 items organized by category
- Each experience must have at least 3-4 responsibility bullet points
- Use the actual data from the master resume, don't make up fake UUIDs or data
`
}

function generateMockTailoredResume(jobDescription: string, masterResume: any): TailoringResponse {
  console.log('generateMockTailoredResume called')
  
  // Extract keywords from job description for mock tailoring
  const keywords = extractKeywords(jobDescription || '')
  console.log('Keywords extracted:', keywords.length)
  
  // Extract benefits and pay from job description
  const benefits = extractBenefits(jobDescription || '')
  const payRange = extractPayRange(jobDescription || '')
  
  // Enhanced skill matching with relationships and category breadth
  const skills = masterResume.skills || []
  const skillRelationships = getSkillRelationships()
  const skillCategories = getSkillCategories()
  
  // Find directly matched skills
  const directMatches = skills.filter((skill: any) => 
    keywords.some(keyword => 
      skill?.name?.toLowerCase().includes(keyword.toLowerCase()) ||
      (Array.isArray(skill?.tags) && skill.tags.some((tag: any) => 
        typeof tag === 'string' && tag.toLowerCase().includes(keyword.toLowerCase())
      ))
    )
  )
  console.log('Direct skill matches:', directMatches.length)
  
  // Find related/complementary skills
  const relatedSkills = new Set<any>()
  keywords.forEach(keyword => {
    const keywordLower = keyword.toLowerCase()
    const relatedTerms = skillRelationships[keywordLower] || []
    
    skills.forEach((skill: any) => {
      const skillNameLower = skill?.name?.toLowerCase() || ''
      const skillTags = Array.isArray(skill?.tags) ? skill.tags : []
      
      // Check if skill name or tags match related terms
      const matchesRelated = relatedTerms.some(term => 
        skillNameLower.includes(term) || 
        skillTags.some((tag: any) => {
          const tagName = typeof tag === 'string' ? tag : tag?.name || ''
          return tagName.toLowerCase().includes(term)
        })
      )
      
      if (matchesRelated && !directMatches.includes(skill)) {
        relatedSkills.add(skill)
      }
    })
  })
  console.log('Related/complementary skills:', relatedSkills.size)
  
  // Ensure category breadth - minimum 3 skills per category
  const categorizedSkills = new Map<string, any[]>()
  Object.entries(skillCategories).forEach(([category, categoryTerms]) => {
    const categorySkills = skills.filter((skill: any) => {
      const skillNameLower = skill?.name?.toLowerCase() || ''
      const skillTags = Array.isArray(skill?.tags) ? skill.tags : []
      
      return categoryTerms.some(term => {
        const termLower = term.toLowerCase()
        return skillNameLower.includes(termLower) || 
          skillTags.some((tag: any) => {
            const tagName = typeof tag === 'string' ? tag : tag?.name || ''
            return tagName.toLowerCase().includes(termLower)
          })
      })
    })
    if (categorySkills.length > 0) {
      categorizedSkills.set(category, categorySkills.slice(0, 4))
    }
  })
  console.log('Categories with skills:', categorizedSkills.size)
  
  // Combine all skills: direct matches + related + category balance
  const allRelevantSkills = new Set([
    ...directMatches,
    ...Array.from(relatedSkills),
    ...Array.from(categorizedSkills.values()).flat()
  ])
  
  // Separate featured skills from other skills
  const featuredSkills = skills.filter((skill: any) => skill.is_featured === true)
  const nonFeaturedSkills = [
    ...directMatches,
    ...Array.from(allRelevantSkills).filter(s => !directMatches.includes(s) && !featuredSkills.includes(s))
  ]
  
  // Always include featured skills first (sorted by display_order), then fill with matched skills up to 20 total
  const relevantSkills = [
    ...featuredSkills.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)),
    ...nonFeaturedSkills
  ].slice(0, 20)
  
  console.log('Featured skills included:', featuredSkills.length, 'Other skills:', nonFeaturedSkills.length)
  console.log('Total relevant skills after enhancement:', relevantSkills.length)

  // Safely filter experience - ensure minimum 3-4 bullets per experience
  const experience = masterResume.experience || []
  const relevantExperience = experience.map((exp: any) => {
    // Filter for relevant responsibilities
    const allResponsibilities = exp.responsibilities || []
    const matchedResponsibilities = allResponsibilities.filter((resp: any) =>
      keywords.some(keyword =>
        resp?.description?.toLowerCase().includes(keyword.toLowerCase()) ||
        (Array.isArray(resp?.tags) && resp.tags.some((tag: string) => 
          typeof tag === 'string' && tag.toLowerCase().includes(keyword.toLowerCase())
        ))
      )
    )
    
    // Ensure minimum 3 bullets per job
    let finalResponsibilities = matchedResponsibilities
    if (matchedResponsibilities.length < 3 && allResponsibilities.length >= 3) {
      const needed = 3 - matchedResponsibilities.length
      const unmatchedResponsibilities = allResponsibilities.filter(
        (r: any) => !matchedResponsibilities.includes(r)
      )
      finalResponsibilities = [
        ...matchedResponsibilities,
        ...unmatchedResponsibilities.slice(0, needed)
      ]
    } else if (allResponsibilities.length < 3) {
      // If job has less than 3 total bullets, include all
      finalResponsibilities = allResponsibilities
    }
    
    return {
      ...exp,
      responsibilities: finalResponsibilities
    }
  }).filter((exp: any) => exp.responsibilities.length > 0)
  console.log('Relevant experience filtered:', relevantExperience.length)

  // Calculate fit rating accounting for transferable skills
  const totalSkills = skills.length
  const directSkillMatches = directMatches.length
  const transferableSkillMatches = relatedSkills.size
  const totalMatchedSkills = directSkillMatches + (transferableSkillMatches * 0.75) // Transferable skills count 75%
  const totalExperience = experience.length
  const matchedExperience = relevantExperience.length
  
  let fitRating = 3 // default to middle rating
  if (totalSkills > 0 || totalExperience > 0) {
    // Calculate skill match percentage based on job requirements
    const estimatedRequiredSkills = Math.max(keywords.length * 2, 10)
    const skillMatchPercentage = Math.min(totalMatchedSkills / estimatedRequiredSkills, 1)
    
    // Calculate experience match percentage
    const experienceMatchPercentage = totalExperience > 0 ? matchedExperience / totalExperience : 0.5
    
    // Weight skills 60%, experience 40%
    const averageMatch = (skillMatchPercentage * 0.6) + (experienceMatchPercentage * 0.4)
    
    if (averageMatch >= 0.7) fitRating = 5
    else if (averageMatch >= 0.55) fitRating = 4
    else if (averageMatch >= 0.35) fitRating = 3
    else if (averageMatch >= 0.2) fitRating = 2
    else fitRating = 1
  }
  
  console.log('Fit rating calculated:', fitRating, 'Direct:', directSkillMatches, 'Transferable:', transferableSkillMatches)

  // Use the master resume's professional summary (will be tailored by AI prompt in real implementation)
  // For mock, just use the provided summary or a default if none exists
  const summary = masterResume.contact?.professional_summary 
    || 'Experienced professional with a proven track record of delivering results and driving innovation in dynamic environments.'

  // Generate match summary
  const matchSummary = fitRating >= 4
    ? `Strong match: You have ${directSkillMatches} direct skill matches and ${transferableSkillMatches} complementary skills. Your ${matchedExperience} relevant experience areas align well with the job requirements.`
    : fitRating === 3
    ? `Moderate match: You have ${directSkillMatches} direct and ${transferableSkillMatches} transferable skills with ${matchedExperience} relevant experience areas. Your diverse skill set provides a solid foundation for this role.`
    : `Developing match: You have ${directSkillMatches + transferableSkillMatches} relevant skills and ${matchedExperience} experience areas. Emphasize transferable experience and complementary technical abilities.`

  return {
    jobBreakdown: {
      benefits: benefits,
      payRange: payRange,
      fitRating: fitRating,
      requiredSkills: extractRequiredSkills(jobDescription || ''),
      responsibilities: extractResponsibilities(jobDescription || ''),
      matchSummary: matchSummary
    },
    tailoredResume: {
      contact: masterResume.contact || {},
      summary,
      skills: relevantSkills,
      experience: relevantExperience,
      education: masterResume.education || [],
      certifications: masterResume.certifications || [],
      projects: masterResume.projects || [],
      volunteer: masterResume.volunteer || []
    },
    analysis: keywords.length > 0 
      ? `Based on the job description, I've identified key requirements including ${keywords.slice(0, 5).join(', ')}. The tailored resume emphasizes relevant experience and skills that match these requirements.`
      : 'Resume has been structured and formatted. Add more details to the job description for better tailoring.',
    recommendations: [
      'Emphasize leadership experience',
      'Highlight relevant technical skills',
      'Include quantifiable achievements',
      'Align language with job posting keywords'
    ]
  }
}

function extractKeywords(text: string): string[] {
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those']
  
  const wordCounts = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word))
    .reduce((acc, word) => {
      const count = acc[word] || 0
      acc[word] = count + 1
      return acc
    }, {} as Record<string, number>)
  
  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => word)
}

function extractRequiredSkills(text: string): string[] {
  const textLower = text.toLowerCase()
  const foundSkills = new Set<string>()
  
  // Define comprehensive skill patterns
  const skillPatterns = {
    // Programming Languages
    languages: ['javascript', 'typescript', 'python', 'java', 'c#', 'csharp', 'c\\+\\+', 'ruby', 'php', 'go', 'golang', 'rust', 'swift', 'kotlin', 'scala', 'r\\b', 'perl', 'sql', 'pl/sql', 'pl\\\\sql', 't-sql'],
    
    // Frontend Technologies
    frontend: ['react', 'angular', 'vue\\.js', 'vue', 'next\\.js', 'nextjs', 'svelte', 'html5?', 'css3?', 'sass', 'scss', 'less', 'tailwind', 'bootstrap', 'material[-\\s]?ui', 'webpack', 'vite', 'parcel', 'jquery', 'redux', 'mobx', 'rxjs', 'primeng', 'primefaces'],
    
    // Backend & Frameworks
    backend: ['node\\.js', 'nodejs', 'express\\.?js', 'nestjs', 'django', 'flask', 'fastapi', 'spring', 'spring[-\\s]?boot', '\\.net', 'asp\\.net', 'entity[-\\s]?framework', 'rails', 'laravel', 'symfony', 'hibernate'],
    
    // Databases
    databases: ['sql[-\\s]?server', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'elasticsearch', 'cassandra', 'dynamodb', 'oracle', 'sqlite', 'mariadb', 'couchdb', 'neo4j'],
    
    // Cloud & Infrastructure
    cloud: ['aws', 'azure', 'gcp', 'google[-\\s]?cloud', 'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins', 'ci/cd', 'devops', 'microservices', 'serverless', 'lambda', 'fargate', 'ecs', 'ec2', 's3'],
    
    // Version Control & Tools
    tools: ['git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence', 'slack', 'trello', 'npm', 'yarn', 'maven', 'gradle', 'webpack', 'vscode', 'visual[-\\s]?studio'],
    
    // Methodologies & Practices
    methodologies: ['agile', 'scrum', 'kanban', 'waterfall', 'tdd', 'bdd', 'ci/cd', 'continuous[-\\s]?integration', 'continuous[-\\s]?deployment', 'solid', 'dry', 'rest', 'restful', 'graphql', 'soap', 'grpc', 'microservices', 'monolith', 'mvc', 'mvvm'],
    
    // Testing
    testing: ['jest', 'mocha', 'jasmine', 'karma', 'cypress', 'selenium', 'junit', 'nunit', 'pytest', 'rspec', 'cucumber', 'unit[-\\s]?test', 'integration[-\\s]?test', 'e2e', 'test[-\\s]?automation'],
    
    // Security & Compliance
    security: ['oauth', 'oauth2', 'jwt', 'saml', 'ssl', 'tls', 'https', 'rbac', 'hipaa', 'gdpr', 'soc[-\\s]?2', 'pci[-\\s]?dss', 'encryption', 'authentication', 'authorization'],
    
    // Monitoring & Logging
    monitoring: ['splunk', 'datadog', 'new[-\\s]?relic', 'prometheus', 'grafana', 'elk', 'elasticsearch', 'logstash', 'kibana', 'sentry', 'cloudwatch'],
    
    // Message Queues & Event Streaming
    messaging: ['rabbitmq', 'kafka', 'activemq', 'redis', 'pub/sub', 'event[-\\s]?driven', 'message[-\\s]?queue'],
    
    // Soft Skills & Competencies
    softSkills: ['leadership', 'communication', 'collaboration', 'problem[-\\s]?solving', 'analytical', 'mentoring', 'team[-\\s]?player', 'self[-\\s]?motivated', 'detail[-\\s]?oriented', 'critical[-\\s]?thinking']
  }
  
  // Check for each pattern in the text
  Object.values(skillPatterns).flat().forEach(pattern => {
    const regex = new RegExp(`\\b${pattern}\\b`, 'gi')
    const matches = textLower.match(regex)
    if (matches) {
      // Normalize the skill name (capitalize properly)
      const normalizedSkill = matches[0]
        .replace(/\./g, '')
        .replace(/[-\s]+/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .replace(/\bJs\b/g, 'JS')
        .replace(/\bCss\b/g, 'CSS')
        .replace(/\bHtml\b/g, 'HTML')
        .replace(/\bSql\b/g, 'SQL')
        .replace(/\bApi\b/g, 'API')
        .replace(/\bRest\b/g, 'REST')
        .replace(/\bGraphql\b/g, 'GraphQL')
        .replace(/\bOauth\b/g, 'OAuth')
        .replace(/\bJwt\b/g, 'JWT')
        .replace(/\bUi\b/g, 'UI')
        .replace(/\bAws\b/g, 'AWS')
        .replace(/\bGcp\b/g, 'GCP')
        .replace(/\bCi Cd\b/g, 'CI/CD')
        .replace(/\bTdd\b/g, 'TDD')
        .replace(/\bBdd\b/g, 'BDD')
        .replace(/\bE2e\b/g, 'E2E')
        .replace(/\bRbac\b/g, 'RBAC')
        .replace(/\bHipaa\b/g, 'HIPAA')
        .replace(/\bGdpr\b/g, 'GDPR')
        .replace(/\bSsl\b/g, 'SSL')
        .replace(/\bTls\b/g, 'TLS')
        .replace(/\bHttps\b/g, 'HTTPS')
        .replace(/\bElk\b/g, 'ELK')
        .replace(/\bK8s\b/g, 'K8s')
      
      foundSkills.add(normalizedSkill)
    }
  })
  
  return Array.from(foundSkills).slice(0, 20)
}

function getSkillRelationships(): Record<string, string[]> {
  return {
    // Frontend Frameworks
    'angular': ['typescript', 'rxjs', 'html', 'css', 'javascript', 'webpack', 'jasmine', 'karma', 'ngrx', 'primeng'],
    'react': ['typescript', 'javascript', 'jsx', 'html', 'css', 'redux', 'jest', 'webpack', 'hooks', 'next'],
    'vue': ['typescript', 'javascript', 'html', 'css', 'vuex', 'webpack', 'nuxt'],
    
    // Backend
    'node': ['javascript', 'typescript', 'express', 'npm', 'rest', 'api', 'nestjs'],
    'dotnet': ['c#', 'csharp', 'asp.net', 'entity framework', 'sql server', 'azure'],
    'java': ['spring', 'maven', 'gradle', 'junit', 'sql', 'hibernate'],
    'python': ['django', 'flask', 'fastapi', 'pandas', 'pytest', 'sqlalchemy'],
    
    // Cloud
    'aws': ['ec2', 's3', 'lambda', 'cloudformation', 'terraform', 'docker', 'kubernetes', 'cloud'],
    'azure': ['azure functions', 'azure devops', 'arm templates', 'terraform', 'docker', 'cloud'],
    'gcp': ['cloud functions', 'cloud run', 'terraform', 'docker', 'kubernetes', 'cloud'],
    
    // DevOps
    'docker': ['kubernetes', 'containers', 'ci/cd', 'jenkins', 'gitlab', 'devops'],
    'kubernetes': ['docker', 'helm', 'containers', 'devops', 'k8s'],
    'terraform': ['infrastructure as code', 'aws', 'azure', 'gcp', 'devops', 'iac'],
    'ci/cd': ['jenkins', 'gitlab', 'github actions', 'azure devops', 'docker', 'devops'],
    
    // Databases
    'sql': ['postgresql', 'mysql', 'sql server', 'database design', 'queries', 'tsql'],
    'nosql': ['mongodb', 'dynamodb', 'redis', 'document database', 'cosmosdb'],
    'postgresql': ['sql', 'database', 'queries', 'plpgsql'],
    'mongodb': ['nosql', 'database', 'document database', 'queries'],
    
    // Testing
    'testing': ['unit testing', 'integration testing', 'jest', 'jasmine', 'karma', 'selenium', 'qa'],
    'automated testing': ['ci/cd', 'jenkins', 'gitlab', 'jest', 'selenium', 'testing'],
    'jest': ['testing', 'unit testing', 'javascript', 'typescript', 'react'],
    'jasmine': ['testing', 'unit testing', 'javascript', 'typescript', 'angular', 'karma'],
    
    // Outsystems (for the specific job)
    'outsystems': ['low-code', 'rapid development', 'web applications', 'api integration', 'sql', 'javascript', 'web development'],
    
    // Production/Software Engineering
    'production': ['deployment', 'monitoring', 'ci/cd', 'devops', 'cloud', 'docker'],
    'software': ['programming', 'development', 'coding', 'engineering', 'architecture']
  };
}

function getSkillCategories(): Record<string, string[]> {
  return {
    'Frontend': ['angular', 'react', 'vue', 'typescript', 'javascript', 'html', 'css', 'sass', 'webpack', 'rxjs', 'redux', 'primeng', 'bootstrap'],
    'Backend': ['node', 'dotnet', 'c#', 'csharp', 'java', 'python', 'express', 'spring', 'api', 'rest', 'graphql', 'nestjs', 'asp.net'],
    'Cloud': ['aws', 'azure', 'gcp', 'lambda', 'ec2', 's3', 'cloud functions', 'serverless', 'cloud'],
    'DevOps': ['docker', 'kubernetes', 'terraform', 'ci/cd', 'jenkins', 'gitlab', 'github actions', 'devops', 'deployment'],
    'Databases': ['sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'dynamodb', 'sql server', 'database', 'supabase'],
    'Tools': ['git', 'jira', 'visual studio', 'vscode', 'postman', 'swagger', 'npm', 'github'],
    'Testing': ['unit testing', 'integration testing', 'jest', 'jasmine', 'selenium', 'cypress', 'testing', 'qa', 'karma'],
    'Soft Skills': ['leadership', 'communication', 'problem solving', 'agile', 'scrum', 'mentoring', 'coaching', 'collaboration']
  };
}

function extractBenefits(text: string): string[] {
  const benefits: string[] = []
  const benefitKeywords = [
    'health insurance', 'dental', 'vision', '401k', 'retirement',
    'pto', 'paid time off', 'vacation', 'sick leave', 'parental leave',
    'remote', 'work from home', 'flexible', 'hybrid',
    'stock options', 'equity', 'bonus', 'profit sharing',
    'tuition', 'education', 'professional development', 'training',
    'gym', 'wellness', 'mental health', 'life insurance'
  ]
  
  const lowerText = text.toLowerCase()
  benefitKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      // Capitalize first letter of each word
      const formattedBenefit = keyword.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      if (!benefits.includes(formattedBenefit)) {
        benefits.push(formattedBenefit)
      }
    }
  })
  
  return benefits.length > 0 ? benefits : ['Benefits package available']
}

function extractPayRange(text: string): string {
  // Look for salary patterns like $100k, $100,000, 100k-120k, $75,000.00 /Yr. - $120,000.00 /Yr., etc.
  const salaryPatterns = [
    // Range with full numbers and various year formats: $75,000.00 /Yr. - $120,000.00 /Yr.
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:\/\s*(?:yr\.?|year)|per year|annually)?\s*(?:to|-)\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:\/\s*(?:yr\.?|year)|per year|annually)?/i,
    // Range with k notation: $100k - $120k
    /\$\s*(\d+)k\s*(?:to|-)\s*\$?\s*(\d+)k/i,
    // Single value with year notation: $100,000 /Yr or $100,000 per year
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:\/\s*(?:yr\.?|year)|per year|annually)/i,
    // Single value with k notation: $100k
    /\$\s*(\d+)k/i
  ]
  
  for (const pattern of salaryPatterns) {
    const match = text.match(pattern)
    if (match) {
      if (match[2]) {
        // Range found - clean up the values
        const min = match[1].replace(/\.00$/, '')
        const max = match[2].replace(/\.00$/, '')
        return `$${min} - $${max} per year`
      } else {
        // Single value found
        const value = match[1].replace(/\.00$/, '')
        return `$${value} per year`
      }
    }
  }
  
  return 'Compensation not specified'
}

function extractResponsibilities(text: string): string[] {
  const responsibilities: string[] = []
  
  // Look for bullet points or numbered lists
  const bulletPattern = /(?:^|\n)\s*(?:[-•*]|\d+\.)\s*([^\n]+)/g
  const matches = text.matchAll(bulletPattern)
  
  for (const match of matches) {
    const resp = match[1].trim()
    if (resp.length > 20 && resp.length < 200) {
      responsibilities.push(resp)
    }
  }
  
  // If no bullets found, extract sentences that might be responsibilities
  if (responsibilities.length === 0) {
    const sentences = text.split(/[.!?]+/)
    const responsibilityKeywords = ['responsible', 'manage', 'develop', 'lead', 'design', 'implement', 'maintain', 'collaborate', 'work with']
    
    sentences.forEach(sentence => {
      const cleaned = sentence.trim()
      if (cleaned.length > 30 && cleaned.length < 200) {
        const lowerSentence = cleaned.toLowerCase()
        if (responsibilityKeywords.some(keyword => lowerSentence.includes(keyword))) {
          responsibilities.push(cleaned)
        }
      }
    })
  }
  
  return responsibilities.slice(0, 8) // Limit to top 8 responsibilities
}

function parseAIResponse(aiResponse: string, masterResume: any): TailoringResponse {
  try {
    console.log('Parsing AI response, length:', aiResponse?.length)
    
    let parsed: any = null
    
    // First try to parse the entire response as JSON
    try {
      parsed = JSON.parse(aiResponse)
      console.log('Successfully parsed AI response as direct JSON')
    } catch (directParseError) {
      console.log('Direct JSON parse failed, trying to extract JSON from text')
    }
    
    // Try to extract JSON from markdown code blocks
    if (!parsed) {
      const codeBlockMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/)
      if (codeBlockMatch) {
        parsed = JSON.parse(codeBlockMatch[1])
        console.log('Successfully extracted JSON from code block')
      }
    }
    
    // Try to extract any JSON object from the response
    if (!parsed) {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
        console.log('Successfully extracted JSON from response text')
      }
    }
    
    if (!parsed) {
      console.error('No valid JSON found in AI response')
      throw new Error('No valid JSON found')
    }
    
    // Validate the parsed response structure
    console.log('Validating parsed response structure...')
    console.log('Parsed keys:', Object.keys(parsed))
    console.log('Has jobBreakdown:', !!parsed.jobBreakdown)
    console.log('Has tailoredResume:', !!parsed.tailoredResume)
    
    if (parsed.tailoredResume) {
      console.log('tailoredResume keys:', Object.keys(parsed.tailoredResume))
      console.log('tailoredResume.skills length:', parsed.tailoredResume.skills?.length || 0)
      console.log('tailoredResume.experience length:', parsed.tailoredResume.experience?.length || 0)
      console.log('tailoredResume.education length:', parsed.tailoredResume.education?.length || 0)
      console.log('tailoredResume.summary exists:', !!parsed.tailoredResume.summary)
    }
    
    if (parsed.jobBreakdown) {
      console.log('jobBreakdown keys:', Object.keys(parsed.jobBreakdown))
      console.log('jobBreakdown.requiredSkills length:', parsed.jobBreakdown.requiredSkills?.length || 0)
      console.log('jobBreakdown.fitRating:', parsed.jobBreakdown.fitRating)
    }
    
    // Validate required fields exist
    if (!parsed.jobBreakdown || !parsed.tailoredResume) {
      console.error('Missing required fields in parsed response')
      console.error('Full parsed object:', JSON.stringify(parsed, null, 2).substring(0, 1000))
      throw new Error('Missing required fields: jobBreakdown or tailoredResume')
    }
    
    // Ensure all required nested fields exist with defaults
    const validatedResponse: TailoringResponse = {
      jobBreakdown: {
        benefits: parsed.jobBreakdown.benefits || [],
        payRange: parsed.jobBreakdown.payRange || 'Not specified',
        fitRating: parsed.jobBreakdown.fitRating || 3,
        requiredSkills: parsed.jobBreakdown.requiredSkills || [],
        responsibilities: parsed.jobBreakdown.responsibilities || [],
        matchSummary: parsed.jobBreakdown.matchSummary || 'Analysis pending'
      },
      tailoredResume: {
        contact: parsed.tailoredResume.contact || masterResume.contact || {},
        summary: parsed.tailoredResume.summary || 'Professional summary',
        skills: parsed.tailoredResume.skills || [],
        experience: parsed.tailoredResume.experience || [],
        education: parsed.tailoredResume.education || [],
        certifications: parsed.tailoredResume.certifications || [],
        projects: parsed.tailoredResume.projects || [],
        volunteer: parsed.tailoredResume.volunteer || []
      },
      analysis: parsed.analysis || 'Resume tailored successfully',
      recommendations: parsed.recommendations || []
    }
    
    console.log('Validation complete - returning validated response')
    console.log('Final skills count:', validatedResponse.tailoredResume.skills.length)
    console.log('Final experience count:', validatedResponse.tailoredResume.experience.length)
    
    return validatedResponse
    
  } catch (error) {
    console.error('Failed to parse AI response as JSON:', error)
    console.error('Error message:', error.message)
    console.error('AI response preview (first 500 chars):', aiResponse?.substring(0, 500))
    console.error('AI response preview (last 500 chars):', aiResponse?.substring(Math.max(0, aiResponse.length - 500)))
  }

  // Fallback to mock response if parsing fails
  console.log('Falling back to mock response due to parsing failure')
  return generateMockTailoredResume('', masterResume)
}
