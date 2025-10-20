import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface IdealResumeRequest {
  jobDescription: string;
}

interface IdealResumeResponse {
  idealResume: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    console.log('AI Generate Ideal Resume function called')
    
    // Parse request body
    const { jobDescription }: IdealResumeRequest = await req.json()
    console.log('Request parsed, jobDescription length:', jobDescription?.length)

    if (!jobDescription) {
      console.error('Missing job description')
      return new Response(
        JSON.stringify({ error: 'Job description is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create AI prompt for ideal resume generation
    const aiPrompt = createIdealResumePrompt(jobDescription)
    console.log('AI prompt created, length:', aiPrompt.length)

    // Call OpenAI API
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    console.log('OpenAI API key exists:', !!openaiApiKey)
    
    if (!openaiApiKey) {
      // Return mock response for development if no API key
      console.log('No API key found, generating mock response...')
      const mockResponse = generateMockIdealResume(jobDescription)
      console.log('Mock response generated successfully')
      return new Response(
        JSON.stringify(mockResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
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
            content: 'You are a recruiting expert and resume writer. You create the resume of the perfect candidate based on job descriptions.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
    })

    console.log('OpenAI response status:', openaiResponse.status)
    
    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text()
      console.error('OpenAI API error body:', errorBody)
      throw new Error(`OpenAI API error: ${openaiResponse.status}`)
    }

    const openaiData = await openaiResponse.json()
    console.log('OpenAI response received')
    
    if (!openaiData.choices || !openaiData.choices[0]) {
      throw new Error('OpenAI response missing choices array')
    }
    
    const aiResponse = openaiData.choices[0].message.content
    console.log('AI response content length:', aiResponse?.length)

    // Parse AI response
    const idealResume = parseAIResponse(aiResponse)

    return new Response(
      JSON.stringify({ idealResume }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in AI generate ideal resume function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function createIdealResumePrompt(jobDescription: string): string {
  return `
You are a recruiting expert. Based on the following job description, create the resume of the PERFECT candidate who would be hired immediately for this position.

Job Description:
${jobDescription}

Create a complete, comprehensive resume for the ideal candidate including:

1. **Contact Information**: Use placeholder name "Ideal Candidate" with generic email/phone
2. **Professional Summary**: 3-4 sentences highlighting expertise that perfectly matches this job
3. **Skills**: List ALL required and preferred skills mentioned in the job description (15-20 skills)
4. **Work Experience**: Create 3-5 relevant positions with:
   - Job titles and companies that make sense for this career path
   - 4-5 achievement-focused bullet points per job
   - Each bullet should have action verb + quantifiable metric + business impact
   - Include all keywords from job description naturally
5. **Education**: Degree(s) matching job requirements
6. **Certifications**: Any certifications mentioned in job description
7. **Projects**: 2-3 relevant projects if applicable to the role

CRITICAL REQUIREMENTS:
- Every bullet point MUST start with an action verb
- Every bullet point MUST include numbers/metrics (%, $, users, time saved, etc.)
- Every bullet point MUST show business impact
- Incorporate ALL keywords from the job description naturally
- Make experience dates recent (within last 10 years)
- Use proper resume formatting and professional language

Output ONLY valid JSON in this EXACT structure:

{
  "idealResume": {
    "contact": {
      "name": "Ideal Candidate",
      "email": "ideal@example.com",
      "phone": "555-0100",
      "location": "City, State",
      "linkedin": "linkedin.com/in/ideal-candidate",
      "github": "github.com/ideal-candidate"
    },
    "summary": "Professional summary here...",
    "skills": [
      {
        "id": "skill-1",
        "name": "Skill Name",
        "category": "Category",
        "is_featured": true,
        "display_order": 1,
        "tags": ["tag1", "tag2"]
      }
    ],
    "experience": [
      {
        "id": "exp-1",
        "role": "Job Title",
        "company": "Company Name",
        "start_date": "2020-01-01",
        "end_date": null,
        "responsibilities": [
          {
            "id": "resp-1",
            "description": "Action verb + achievement with metrics (%, $, users) + business impact",
            "tags": ["keyword1", "keyword2"]
          }
        ]
      }
    ],
    "education": [
      {
        "id": "edu-1",
        "degree": "Bachelor of Science",
        "school": "University Name",
        "start_date": "2012-09-01",
        "end_date": "2016-05-01"
      }
    ],
    "certifications": [],
    "projects": [],
    "volunteer": []
  }
}

REMEMBER: Respond with ONLY the JSON object, no additional text before or after.
`
}

function generateMockIdealResume(jobDescription: string): IdealResumeResponse {
  // Extract keywords for mock data
  const keywords = extractKeywords(jobDescription)
  const skills = extractSkills(jobDescription)
  
  return {
    idealResume: {
      contact: {
        name: "Ideal Candidate",
        email: "ideal.candidate@example.com",
        phone: "555-0100",
        location: "Remote, USA",
        linkedin: "linkedin.com/in/ideal-candidate",
        github: "github.com/ideal-candidate"
      },
      summary: `Highly accomplished professional with 10+ years of experience in ${keywords.slice(0, 3).join(', ')}. Proven track record of delivering exceptional results through ${keywords.slice(3, 6).join(', ')}. Expert in ${skills.slice(0, 5).join(', ')} with strong background in modern development practices and agile methodologies.`,
      skills: skills.slice(0, 20).map((skill, idx) => ({
        id: `skill-${idx}`,
        name: skill,
        category: idx < 5 ? 'Languages & Frameworks' : (idx < 10 ? 'Cloud & DevOps' : 'Practices & Methodologies'),
        is_featured: idx < 10,
        display_order: idx,
        tags: [skill]
      })),
      experience: [
        {
          id: 'exp-1',
          role: 'Senior ' + (skills[0] || 'Software') + ' Engineer',
          company: 'Tech Company Inc',
          start_date: '2020-01-01',
          end_date: null,
          responsibilities: [
            {
              id: 'resp-1',
              description: `Architected and deployed enterprise-scale applications using ${skills.slice(0, 3).join(', ')}, serving 500K+ active users and improving system performance by 45%`,
              tags: skills.slice(0, 3)
            },
            {
              id: 'resp-2',
              description: `Led cross-functional team of 8 engineers to deliver ${keywords[0]} solutions, reducing deployment time by 60% through automated CI/CD pipelines`,
              tags: ['Leadership', 'CI/CD', 'DevOps']
            },
            {
              id: 'resp-3',
              description: `Implemented ${skills[1] || 'modern'} architecture patterns resulting in 99.9% uptime and $2M annual cost savings through optimized cloud infrastructure`,
              tags: ['Architecture', 'Cloud', 'Cost Optimization']
            },
            {
              id: 'resp-4',
              description: `Mentored junior developers and established best practices for code quality, increasing team velocity by 40% and reducing bug rate by 55%`,
              tags: ['Mentorship', 'Best Practices', 'Quality']
            }
          ]
        },
        {
          id: 'exp-2',
          role: (skills[0] || 'Software') + ' Engineer',
          company: 'Innovation Labs',
          start_date: '2017-06-01',
          end_date: '2019-12-31',
          responsibilities: [
            {
              id: 'resp-5',
              description: `Developed scalable ${skills[0] || 'web'} applications processing 1M+ transactions daily with 99.99% reliability`,
              tags: [skills[0] || 'Development', 'Scalability']
            },
            {
              id: 'resp-6',
              description: `Collaborated with product team to deliver features used by 250K+ customers, increasing user engagement by 35%`,
              tags: ['Collaboration', 'Product Development']
            },
            {
              id: 'resp-7',
              description: `Optimized database queries and caching strategies, reducing API response time from 2s to 200ms (90% improvement)`,
              tags: ['Performance', 'Database', 'Optimization']
            }
          ]
        },
        {
          id: 'exp-3',
          role: 'Junior Software Developer',
          company: 'StartUp Solutions',
          start_date: '2015-01-01',
          end_date: '2017-05-31',
          responsibilities: [
            {
              id: 'resp-8',
              description: `Built and maintained ${skills[1] || 'applications'} serving 50K+ users with focus on user experience and performance`,
              tags: ['Development', 'UI/UX']
            },
            {
              id: 'resp-9',
              description: `Participated in agile development process, completing 95% of sprint commitments on time`,
              tags: ['Agile', 'Scrum']
            },
            {
              id: 'resp-10',
              description: `Contributed to codebase with ${keywords[2] || 'modern'} patterns, maintaining 90%+ test coverage`,
              tags: ['Testing', 'Best Practices']
            }
          ]
        }
      ],
      education: [
        {
          id: 'edu-1',
          degree: 'Bachelor of Science in Computer Science',
          school: 'State University',
          start_date: '2011-09-01',
          end_date: '2015-05-01'
        }
      ],
      certifications: [],
      projects: [],
      volunteer: []
    }
  }
}

function extractKeywords(text: string): string[] {
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 4 && !commonWords.includes(word))
  
  const wordCounts = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => word)
}

function extractSkills(text: string): string[] {
  const textLower = text.toLowerCase()
  const foundSkills = new Set<string>()
  
  const skillPatterns = [
    'javascript', 'typescript', 'python', 'java', 'c#', 'csharp',
    'react', 'angular', 'vue', 'node', 'express', 'django', 'spring',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'ci/cd', 'devops',
    'sql', 'postgresql', 'mongodb', 'redis',
    'git', 'agile', 'scrum', 'rest', 'api', 'microservices'
  ]
  
  skillPatterns.forEach(skill => {
    if (textLower.includes(skill)) {
      const formatted = skill.charAt(0).toUpperCase() + skill.slice(1)
      foundSkills.add(formatted)
    }
  })
  
  // Add some default skills if none found
  if (foundSkills.size < 10) {
    ['Problem Solving', 'Communication', 'Leadership', 'Teamwork', 'Analytical Thinking'].forEach(s => foundSkills.add(s))
  }
  
  return Array.from(foundSkills).slice(0, 20)
}

function parseAIResponse(aiResponse: string): any {
  try {
    console.log('Parsing AI response, length:', aiResponse?.length)
    
    let parsed: any = null
    
    // Try to parse the entire response as JSON
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
    
    // Return the idealResume object
    return parsed.idealResume || parsed
    
  } catch (error) {
    console.error('Failed to parse AI response:', error)
    throw error
  }
}

