import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, PlaidApi, PlaidEnvironments } from 'https://esm.sh/plaid@18.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('=== PLAID EXCHANGE TOKEN FUNCTION STARTED ===')
  
  try {
    // Initialize Plaid client
    const configuration = new Configuration({
      basePath: PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': '66751464deb61800190a21a3',
          'PLAID-SECRET': '77546ce7193daa2f731240acd84866',
        },
      },
    })
    
    const plaidClient = new PlaidApi(configuration)

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

    // Get user from request (for testing, allow anonymous access)
    let userId = '00000000-0000-0000-0000-000000000000' // Valid UUID for testing
    
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
        if (!authError && user) {
          userId = user.id
          console.log('Using authenticated user:', userId)
        } else {
          console.log('Auth error, using test user:', authError)
        }
      } catch (error) {
        console.log('Auth error, using test user:', error)
      }
    } else {
      console.log('No auth header, using test user:', userId)
    }

    // Get request body
    let public_token: string
    let metadata: any
    
    try {
      const body = await req.json()
      console.log('Request body received:', JSON.stringify(body, null, 2))
      public_token = body.public_token
      metadata = body.metadata
      
      if (!public_token || !metadata) {
        console.error('Missing parameters:', { public_token: !!public_token, metadata: !!metadata })
        return new Response(
          JSON.stringify({ error: 'Missing required parameters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (error) {
      console.error('Error parsing request body:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Exchange public token for access token
    console.log('Exchanging public token for access token...')
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: public_token
    })

    const accessToken = exchangeResponse.data.access_token
    const itemId = exchangeResponse.data.item_id
    console.log('Token exchange successful:', { itemId, accessToken: accessToken ? '***' : 'null' })

    // Get account information
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken
    })

    const accounts = accountsResponse.data.accounts

    // Store plaid item and accounts in database
    console.log('Storing plaid item in database...')
    const itemData = {
      user_id: userId,
      item_id: itemId,
      access_token: accessToken,
      institution_id: metadata.institution.institution_id,
      institution_name: metadata.institution.name
    }
    console.log('Item data to insert:', { ...itemData, access_token: '***' })
    
    const { error: itemError } = await supabase
      .from('hb_plaid_items')
      .insert(itemData)

    if (itemError) {
      console.error('Error storing plaid item:', itemError)
      return new Response(
        JSON.stringify({ error: 'Failed to store plaid item: ' + itemError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('Plaid item stored successfully')

    // Store accounts
    const accountsToInsert = accounts.map(account => ({
      user_id: userId,
      item_id: itemId,
      account_id: account.account_id,
      name: account.name,
      mask: account.mask,
      type: account.type,
      subtype: account.subtype,
      current_balance: account.balances.current,
      available_balance: account.balances.available,
      iso_currency_code: account.balances.iso_currency_code
    }))

    const { error: accountsError } = await supabase
      .from('hb_plaid_accounts')
      .insert(accountsToInsert)

    if (accountsError) {
      console.error('Error storing plaid accounts:', accountsError)
      return new Response(
        JSON.stringify({ error: 'Failed to store plaid accounts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully linked ${accounts.length} account(s)`,
        accounts: accountsToInsert
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== PLAID EXCHANGE TOKEN FUNCTION ERROR ===')
    console.error('Error details:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to exchange token', 
        details: error.message,
        stack: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 