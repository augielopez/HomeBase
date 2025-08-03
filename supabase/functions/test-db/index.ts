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
    console.log('Test function called')
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('PROJECT_URL')
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', { supabaseUrl: !!supabaseUrl, supabaseServiceKey: !!supabaseServiceKey })
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Test if tables exist
    console.log('Testing database connection...')
    
    // Test hb_plaid_items table
    const { data: items, error: itemsError } = await supabase
      .from('hb_plaid_items')
      .select('count(*)')
      .limit(1)
    
    console.log('hb_plaid_items test:', { data: items, error: itemsError })
    
    // Test hb_plaid_accounts table
    const { data: accounts, error: accountsError } = await supabase
      .from('hb_plaid_accounts')
      .select('count(*)')
      .limit(1)
    
    console.log('hb_plaid_accounts test:', { data: accounts, error: accountsError })
    
    // Test hb_plaid_transactions table
    const { data: transactions, error: transactionsError } = await supabase
      .from('hb_plaid_transactions')
      .select('count(*)')
      .limit(1)
    
    console.log('hb_plaid_transactions test:', { data: transactions, error: transactionsError })
    
    return new Response(
      JSON.stringify({
        success: true,
        tables: {
          hb_plaid_items: { exists: !itemsError, error: itemsError?.message },
          hb_plaid_accounts: { exists: !accountsError, error: accountsError?.message },
          hb_plaid_transactions: { exists: !transactionsError, error: transactionsError?.message }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Test function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 