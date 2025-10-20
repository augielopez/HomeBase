import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface OptimizeBulletRequest {
  bulletPoint: string;
  jobDescription: string;
  keywords?: string[];
}

interface OptimizeBulletResponse {
  optimizedBullet: string;
  _debug?: {
    method: 'openai' | 'mock';
    timestamp: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400'
      }
    })
  }

  try {
    const { bulletPoint, jobDescription, keywords = [] }: OptimizeBulletRequest = await req.json()

    if (!bulletPoint) {
      return new Response(
        JSON.stringify({ error: 'Bullet point is required' }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    // Truncate job description to avoid API limits (max 2000 chars)
    const truncatedJobDescription = jobDescription && jobDescription.length > 2000
      ? jobDescription.substring(0, 2000) + '...'
      : jobDescription;

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.warn('OpenAI API key not configured, using mock optimization')
      const mockOptimized = generateMockOptimization(bulletPoint, truncatedJobDescription, keywords)
      return new Response(
        JSON.stringify({
          optimizedBullet: mockOptimized,
          _debug: {
            method: 'mock',
            timestamp: new Date().toISOString(),
            reason: 'No OpenAI API key configured'
          }
        } as OptimizeBulletResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create comprehensive STAR method prompt with truncated job description
    const prompt = createOptimizationPrompt(bulletPoint, truncatedJobDescription, keywords)

    // Call OpenAI API directly using fetch with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
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
              content: 'You are an expert resume writer specializing in the STAR method and ATS optimization. Transform bullet points to be more impactful, quantifiable, and ATS-optimized while maintaining authenticity. Always respond with just the optimized bullet point, nothing else.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 200,
          temperature: 0.7,
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text()
        console.error(`OpenAI API error ${openaiResponse.status}:`, errorText)
        throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`)
      }

      const openaiData = await openaiResponse.json()
      const optimizedBullet = openaiData.choices[0].message.content?.trim() || bulletPoint

      return new Response(
        JSON.stringify({
          optimizedBullet,
          _debug: {
            method: 'openai',
            timestamp: new Date().toISOString()
          }
        } as OptimizeBulletResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (openaiError) {
      clearTimeout(timeoutId)
      console.error('OpenAI API call failed:', openaiError)
      
      // Fall back to mock optimization instead of returning error
      const mockOptimized = generateMockOptimization(bulletPoint, truncatedJobDescription, keywords)
      return new Response(
        JSON.stringify({
          optimizedBullet: mockOptimized,
          _debug: {
            method: 'mock',
            timestamp: new Date().toISOString(),
            reason: 'OpenAI API call failed',
            error: openaiError.message
          }
        } as OptimizeBulletResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in AI optimize bullet function:', error)
    
    // Always try to return a mock optimization instead of failing completely
    try {
      const mockOptimized = generateMockOptimization(bulletPoint, jobDescription, keywords)
      return new Response(
        JSON.stringify({
          optimizedBullet: mockOptimized,
          _debug: {
            method: 'mock',
            timestamp: new Date().toISOString(),
            reason: 'General error fallback',
            error: error.message
          }
        } as OptimizeBulletResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (fallbackError) {
      // Last resort: return error
      return new Response(
        JSON.stringify({ error: 'Internal server error', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }
})

function generateMockOptimization(bulletPoint: string, jobDescription: string, keywords: string[]): string {
  let optimized = bulletPoint;
  
  // Extract keywords from job description if not provided
  const extractedKeywords = keywords.length > 0 ? keywords : extractKeywordsFromJob(jobDescription);
  
  // Improve action verbs
  const verbImprovements = {
    'worked on': 'developed',
    'helped with': 'led',
    'was responsible for': 'managed',
    'did': 'implemented',
    'made': 'created',
    'fixed': 'resolved',
    'used': 'leveraged',
    'handled': 'managed',
    'took care of': 'coordinated'
  };
  
  Object.entries(verbImprovements).forEach(([old, new_]) => {
    optimized = optimized.replace(new RegExp(old, 'gi'), new_);
  });
  
  // Add metrics if not present
  if (!/\d+[%$km]?/.test(optimized)) {
    const metrics = ['by 25%', 'by 40%', 'by 60%', 'by 30%', 'by 50%', 'by 35%', 'by 20%'];
    const randomMetric = metrics[Math.floor(Math.random() * metrics.length)];
    optimized += `, improving efficiency ${randomMetric}`;
  }
  
  // Add scale indicators if not present
  if (!/(serving|processing|managing|handling|supporting)/i.test(optimized)) {
    const scaleIndicators = [
      'serving 100K+ users', 'processing 1M+ transactions', 'managing team of 8',
      'handling 500K+ daily requests', 'supporting 50+ clients', 'reducing costs by $100K'
    ];
    const randomScale = scaleIndicators[Math.floor(Math.random() * scaleIndicators.length)];
    optimized = optimized.replace(/\.$/, `, ${randomScale}.`);
  }
  
  // Add relevant keywords from job description intelligently
  if (extractedKeywords.length > 0) {
    const relevantKeyword = extractedKeywords[Math.floor(Math.random() * extractedKeywords.length)];
    if (!optimized.toLowerCase().includes(relevantKeyword.toLowerCase())) {
      // Only add if it makes sense contextually
      if (optimized.toLowerCase().includes('development') || optimized.toLowerCase().includes('software')) {
        optimized = optimized.replace(/\.$/, ` using ${relevantKeyword}.`);
      }
    }
  }
  
  // Ensure it starts with a strong action verb
  const strongVerbs = ['Led', 'Developed', 'Implemented', 'Designed', 'Managed', 'Created', 'Optimized', 'Enhanced'];
  const firstWord = optimized.split(' ')[0];
  if (!strongVerbs.some(verb => firstWord.toLowerCase().includes(verb.toLowerCase()))) {
    optimized = `Developed ${optimized.toLowerCase()}`;
  }
  
  return optimized;
}

function extractKeywordsFromJob(jobDescription: string): string[] {
  const keywords: string[] = []
  const text = jobDescription.toLowerCase()
  
  // Common technical skills
  const skillPatterns = [
    'javascript', 'typescript', 'python', 'java', 'react', 'angular', 'vue',
    'node.js', 'express', 'django', 'flask', 'spring', 'sql', 'mongodb',
    'aws', 'azure', 'docker', 'kubernetes', 'git', 'agile', 'scrum',
    'devops', 'ci/cd', 'microservices', 'api', 'rest', 'graphql'
  ]
  
  skillPatterns.forEach(skill => {
    if (text.includes(skill)) {
      keywords.push(skill.charAt(0).toUpperCase() + skill.slice(1))
    }
  })
  
  return keywords.slice(0, 5) // Return max 5 keywords
}

function createOptimizationPrompt(bulletPoint: string, jobDescription: string, keywords: string[]): string {
  const keywordList = keywords.length > 0 ? keywords.join(', ') : 'Not specified'
  
  return `Transform this resume bullet point using the STAR method (Situation, Task, Action, Result) with ATS optimization:

ORIGINAL BULLET POINT:
"${bulletPoint}"

JOB DESCRIPTION CONTEXT:
"${jobDescription}"

RELEVANT KEYWORDS TO CONSIDER: ${keywordList}

REQUIREMENTS:
1. Start with a strong action verb (Led, Developed, Implemented, Designed, Managed, Created, Optimized, Enhanced, etc.)
2. ALWAYS include at least one quantifiable metric: percentages (20%, 40%), dollar amounts ($100K), time savings (50% faster), scale indicators (100K+ users, team of 8)
3. Include 1-2 relevant keywords from the job description naturally integrated (DO NOT just append them)
4. Follow STAR structure implicitly: show the situation/task, your action, and measurable results
5. Keep output to 1-2 lines maximum
6. Focus on achievements and measurable outcomes, not just responsibilities
7. Use industry-specific terminology when appropriate

CRITICAL RULES:
- DO NOT just append keywords - integrate them naturally into the sentence
- DO NOT repeat keywords multiple times
- DO NOT use phrases like "using [keyword]" unless it's natural
- ALWAYS include at least one quantifiable metric (%, $, numbers, timeframes)
- Return ONLY the optimized bullet point, no explanations or additional text

Transform the bullet point now:`
}