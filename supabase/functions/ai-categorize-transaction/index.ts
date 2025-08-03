import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CategorizationRequest {
  transaction_id: string;
  merchant_name: string;
  description: string;
  amount: number;
}

interface CategorizationResponse {
  category_id: string | null;
  confidence: number;
  method: 'vector_search' | 'rules' | 'default';
  similar_transactions?: Array<{
    id: string;
    name: string;
    category_name: string;
    similarity: number;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('PROJECT_URL')
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
      console.error('Missing environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Parse request body
    const { transaction_id, merchant_name, description, amount }: CategorizationRequest = await req.json()
    
    if (!transaction_id || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate embedding for the transaction
    const embedding = await generateEmbedding(`${merchant_name || ''} ${description}`, openaiApiKey)
    
    if (!embedding) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate embedding' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update transaction with embedding
    const { error: updateError } = await supabase
      .from('hb_transactions')
      .update({ embedding })
      .eq('id', transaction_id)

    if (updateError) {
      console.error('Error updating transaction with embedding:', updateError)
    }

    // Perform vector similarity search
    const similarTransactions = await performVectorSearch(embedding, supabase)
    
    if (similarTransactions.length > 0) {
      // Use majority vote from similar transactions
      const categoryVotes = new Map<string, { count: number; totalSimilarity: number }>()
      
      similarTransactions.forEach(tx => {
        if (tx.category_id) {
          const current = categoryVotes.get(tx.category_id) || { count: 0, totalSimilarity: 0 }
          categoryVotes.set(tx.category_id, {
            count: current.count + 1,
            totalSimilarity: current.totalSimilarity + tx.similarity
          })
        }
      })

      // Find category with highest weighted vote
      let bestCategory = null
      let bestScore = 0

      for (const [categoryId, vote] of categoryVotes) {
        const weightedScore = vote.count * vote.totalSimilarity
        if (weightedScore > bestScore) {
          bestScore = weightedScore
          bestCategory = categoryId
        }
      }

      if (bestCategory && bestScore > 0.5) { // Minimum confidence threshold
        const confidence = Math.min(bestScore / similarTransactions.length, 1)
        
        return new Response(
          JSON.stringify({
            category_id: bestCategory,
            confidence,
            method: 'vector_search',
            similar_transactions: similarTransactions.slice(0, 5)
          } as CategorizationResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Fallback to rules-based categorization
    const ruleCategory = await applyCategorizationRules(merchant_name, description, amount, supabase)
    
    if (ruleCategory) {
      return new Response(
        JSON.stringify({
          category_id: ruleCategory,
          confidence: 0.7,
          method: 'rules'
        } as CategorizationResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Default to "Other" category
    const defaultCategory = await getDefaultCategory(supabase)
    
    return new Response(
      JSON.stringify({
        category_id: defaultCategory,
        confidence: 0.1,
        method: 'default'
      } as CategorizationResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in ai-categorize-transaction function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Generate embedding using OpenAI API
 */
async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-small'
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    return null
  }
}

/**
 * Perform vector similarity search
 */
async function performVectorSearch(embedding: number[], supabase: any): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc('match_transactions', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 10
    })

    if (error) {
      console.error('Error in vector search:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error performing vector search:', error)
    return []
  }
}

/**
 * Apply rules-based categorization
 */
async function applyCategorizationRules(merchant_name: string, description: string, amount: number, supabase: any): Promise<string | null> {
  try {
    // Get user-defined categorization rules
    const { data: rules, error } = await supabase
      .from('hb_categorization_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (error || !rules) {
      return null
    }

    const text = `${merchant_name || ''} ${description}`.toLowerCase()

    for (const rule of rules) {
      if (matchesRule(text, amount, rule)) {
        return rule.category_id
      }
    }

    return null
  } catch (error) {
    console.error('Error applying categorization rules:', error)
    return null
  }
}

/**
 * Check if transaction matches a categorization rule
 */
function matchesRule(text: string, amount: number, rule: any): boolean {
  const conditions = rule.rule_conditions

  switch (rule.rule_type) {
    case 'keyword':
      const keywords = conditions.keywords || []
      return keywords.some((keyword: string) => text.includes(keyword.toLowerCase()))

    case 'merchant':
      const merchants = conditions.merchants || []
      return merchants.some((merchant: string) => text.includes(merchant.toLowerCase()))

    case 'amount_range':
      const minAmount = conditions.min_amount || 0
      const maxAmount = conditions.max_amount || Infinity
      return Math.abs(amount) >= minAmount && Math.abs(amount) <= maxAmount

    default:
      return false
  }
}

/**
 * Get default category ID
 */
async function getDefaultCategory(supabase: any): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('hb_transaction_categories')
      .select('id')
      .eq('name', 'Other')
      .single()

    if (error) {
      console.error('Error getting default category:', error)
      return null
    }

    return data?.id || null
  } catch (error) {
    console.error('Error getting default category:', error)
    return null
  }
} 