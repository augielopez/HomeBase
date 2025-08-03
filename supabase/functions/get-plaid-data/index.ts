import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Use test user ID
    const userId = '00000000-0000-0000-0000-000000000000'
    
    // Get linked accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('hb_plaid_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch accounts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get transaction stats
    const { data: transactions, error: transactionsError } = await supabase
      .from('hb_plaid_transactions')
      .select('created_at')
      .eq('user_id', userId)

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch transactions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate transaction stats
    let transactionStats = null
    if (transactions && transactions.length > 0) {
      transactionStats = {
        total_transactions: transactions.length,
        total_accounts: accounts?.length || 0,
        last_sync: new Date(Math.max(...transactions.map(t => new Date(t.created_at).getTime())))
      }
    }

    return new Response(
      JSON.stringify({
        accounts: accounts || [],
        transactionStats
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-plaid-data function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 