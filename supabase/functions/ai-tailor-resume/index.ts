import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
}

interface TailoringResponse {
  tailoredResume: any;
  analysis: string;
  recommendations: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Parse request body
    const { jobDescription, masterResume }: TailoringRequest = await req.json()

    if (!jobDescription || !masterResume) {
      return new Response(
        JSON.stringify({ error: 'Job description and master resume are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create AI prompt for resume tailoring
    const aiPrompt = createTailoringPrompt(jobDescription, masterResume)

    // Call OpenAI API (you'll need to add your OpenAI API key to Supabase secrets)
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiApiKey) {
      // Return mock response for development
      const mockResponse = generateMockTailoredResume(jobDescription, masterResume)
      return new Response(
        JSON.stringify(mockResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Make request to OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
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
        max_tokens: 2000,
        temperature: 0.7,
      }),
    })

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`)
    }

    const openaiData = await openaiResponse.json()
    const aiResponse = openaiData.choices[0].message.content

    // Parse AI response and structure the tailored resume
    const tailoredResume = parseAIResponse(aiResponse, masterResume)

    return new Response(
      JSON.stringify(tailoredResume),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in AI tailor resume function:', error)
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
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

Step 1: Analyze the job description below. Extract required skills, tools, and role responsibilities.
Step 2: Search the Master Resume JSON (provided from the database API) for matching responsibilities and skills by tag.
Step 3: Select the most relevant achievements that align with the job description.
Step 4: Rewrite selected bullets to mirror the job description's language while staying true to the candidate's real experience.
Step 5: Assemble a tailored resume (prefer 2 pages, fall back to 1 page).
Step 6: Output in JSON format with these sections: contact, summary, skills, experience, education, certifications, projects, volunteer.

Job Description:
${jobDescription}

Master Resume JSON:
${JSON.stringify(masterResume, null, 2)}

Please provide your response in the following JSON format:
{
  "tailoredResume": {
    "contact": { /* contact info */ },
    "summary": "/* tailored professional summary */",
    "skills": [ /* relevant skills with tags */ ],
    "experience": [ /* relevant experience with tailored responsibilities */ ],
    "education": [ /* education */ ],
    "certifications": [ /* relevant certifications */ ],
    "projects": [ /* relevant projects */ ],
    "volunteer": [ /* relevant volunteer work */ ]
  },
  "analysis": "/* analysis of how the resume was tailored */",
  "recommendations": [ /* list of recommendations for improvement */ ]
}
`
}

function generateMockTailoredResume(jobDescription: string, masterResume: any): TailoringResponse {
  // Extract keywords from job description for mock tailoring
  const keywords = extractKeywords(jobDescription)
  
  // Filter and prioritize skills based on keywords
  const relevantSkills = masterResume.skills.filter(skill => 
    keywords.some(keyword => 
      skill.name.toLowerCase().includes(keyword.toLowerCase()) ||
      skill.tags?.some(tag => tag.toLowerCase().includes(keyword.toLowerCase()))
    )
  )

  // Filter experience based on relevance
  const relevantExperience = masterResume.experience.map(exp => ({
    ...exp,
    responsibilities: exp.responsibilities?.filter(resp =>
      keywords.some(keyword =>
        resp.description.toLowerCase().includes(keyword.toLowerCase()) ||
        resp.tags?.some(tag => tag.toLowerCase().includes(keyword.toLowerCase()))
      )
    ) || []
  })).filter(exp => exp.responsibilities.length > 0)

  // Generate tailored summary
  const topKeywords = keywords.slice(0, 3)
  const summary = `Experienced professional with expertise in ${topKeywords.join(', ')}. Proven track record of delivering results and driving innovation in dynamic environments.`

  return {
    tailoredResume: {
      ...masterResume,
      summary,
      skills: relevantSkills,
      experience: relevantExperience
    },
    analysis: `Based on the job description, I've identified key requirements including ${keywords.slice(0, 5).join(', ')}. The tailored resume emphasizes relevant experience and skills that match these requirements.`,
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
  
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word))
    .reduce((acc, word) => {
      const count = acc[word] || 0
      acc[word] = count + 1
      return acc
    }, {} as Record<string, number>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => word)
}

function parseAIResponse(aiResponse: string, masterResume: any): TailoringResponse {
  try {
    // Try to extract JSON from the AI response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed
    }
  } catch (error) {
    console.error('Failed to parse AI response as JSON:', error)
  }

  // Fallback to mock response if parsing fails
  return generateMockTailoredResume('', masterResume)
}
