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
        }
      } catch (error) {
        console.log('Auth error, using test user:', error)
      }
    }

    // Create link token
    const linkTokenResponse = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'HomeBase',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
      account_filters: {
        depository: {
          account_subtypes: ['checking', 'savings']
        }
      },
      // Additional options for better sandbox experience
      webhook: null,
      link_customization_name: null,
      redirect_uri: null
    })

    return new Response(
      JSON.stringify({ link_token: linkTokenResponse.data.link_token }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating link token:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create link token' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 