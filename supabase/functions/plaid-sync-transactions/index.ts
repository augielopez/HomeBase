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
    const supabaseUrl = Deno.env.get('PROJECT_URL')!
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!
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

    // Get user's plaid items
    const { data: plaidItems, error: itemsError } = await supabase
      .from('hb_plaid_items')
      .select('*')
      .eq('user_id', userId)

    if (itemsError || !plaidItems || plaidItems.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No linked accounts found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let totalNewTransactions = 0
    let totalAccounts = 0

    // Sync transactions for each item
    for (const item of plaidItems) {
      try {
        // Get transactions for the last 30 days
        const endDate = new Date().toISOString().split('T')[0]
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        const transactionsResponse = await plaidClient.transactionsGet({
          access_token: item.access_token,
          start_date: startDate,
          end_date: endDate,
          options: {
            include_personal_finance_category: true
          }
        })

        const transactions = transactionsResponse.data.transactions
        const accounts = transactionsResponse.data.accounts

        totalAccounts += accounts.length

        // Get existing transaction IDs to avoid duplicates
        const { data: existingTransactions } = await supabase
          .from('hb_plaid_transactions')
          .select('transaction_id')
          .eq('user_id', userId)
          .in('transaction_id', transactions.map(t => t.transaction_id))

        const existingIds = new Set(existingTransactions?.map(t => t.transaction_id) || [])

        // Filter out existing transactions
        const newTransactions = transactions.filter(t => !existingIds.has(t.transaction_id))

        if (newTransactions.length > 0) {
          // Insert new transactions
          const transactionsToInsert = newTransactions.map(transaction => ({
            user_id: userId,
            item_id: item.item_id,
            account_id: transaction.account_id,
            transaction_id: transaction.transaction_id,
            amount: transaction.amount,
            date: transaction.date,
            name: transaction.name,
            merchant_name: transaction.merchant_name,
            category: transaction.category,
            category_id: transaction.category_id,
            pending: transaction.pending,
            payment_channel: transaction.payment_channel,
            personal_finance_category: transaction.personal_finance_category,
            location: transaction.location,
            iso_currency_code: transaction.iso_currency_code,
            unofficial_currency_code: transaction.unofficial_currency_code
          }))

          const { error: insertError } = await supabase
            .from('hb_plaid_transactions')
            .insert(transactionsToInsert)

          if (insertError) {
            console.error('Error inserting transactions:', insertError)
          } else {
            totalNewTransactions += newTransactions.length
          }
        }

      } catch (error) {
        console.error(`Error syncing transactions for item ${item.item_id}:`, error)
        // Continue with other items even if one fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synced ${totalNewTransactions} new transactions from ${totalAccounts} account(s)`,
        new_transactions: totalNewTransactions,
        total_accounts: totalAccounts
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error syncing transactions:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to sync transactions' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 