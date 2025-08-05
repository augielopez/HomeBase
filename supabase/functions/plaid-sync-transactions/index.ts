import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Get user ID from authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabase = createClient(
      Deno.env.get('PROJECT_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      throw new Error('Invalid user')
    }

    const userId = user.id

    // Get all Plaid items for the user
    const { data: items, error: itemsError } = await supabase
      .from('hb_plaid_items')
      .select('*')
      .eq('user_id', userId)

    if (itemsError) {
      throw new Error('Failed to fetch Plaid items')
    }

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No Plaid items found', new_transactions: 0, total_accounts: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let totalNewTransactions = 0
    let totalAccounts = 0

    // Import Plaid client
    const { Configuration, PlaidApi, PlaidEnvironments } = await import('https://esm.sh/plaid@17.0.0')

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

    // Sync transactions for each item
    for (const item of items) {
      try {
        // Get accounts for this item
        const { data: accounts, error: accountsError } = await supabase
          .from('hb_plaid_accounts')
          .select('*')
          .eq('item_id', item.item_id)

        if (accountsError || !accounts) {
          console.error(`Error fetching accounts for item ${item.item_id}:`, accountsError)
          continue
        }

        totalAccounts += accounts.length

        // Sync transactions for each account
        for (const account of accounts) {
          try {
            // Get transactions from Plaid
            const response = await plaidClient.transactionsGet({
              access_token: item.access_token,
              start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
              end_date: new Date().toISOString().split('T')[0],
              options: {
                account_ids: [account.account_id],
                include_personal_finance_category: true,
              },
            })

            const transactions = response.data.transactions

            if (transactions.length === 0) continue

            // Get existing transaction IDs to avoid duplicates
            const { data: existingTransactions, error: existingError } = await supabase
              .from('hb_transactions')
              .select('transaction_id')
              .eq('user_id', userId)
              .eq('account_id', account.account_id)
              .in('transaction_id', transactions.map(t => t.transaction_id))

            if (existingError) {
              console.error('Error fetching existing transactions:', existingError)
              continue
            }

            const existingIds = new Set(existingTransactions?.map(t => t.transaction_id) || [])

            // Filter out existing transactions
            const newTransactions = transactions.filter(t => !existingIds.has(t.transaction_id))

            if (newTransactions.length > 0) {
              // Insert new transactions into unified table
              const transactionsToInsert = newTransactions.map(transaction => ({
                user_id: userId,
                item_id: item.item_id,
                account_id: transaction.account_id,
                transaction_id: transaction.transaction_id,
                amount: transaction.amount,
                date: transaction.date,
                name: transaction.name,
                merchant_name: transaction.merchant_name,
                plaid_category: transaction.category,
                category_id: null, // Will be categorized later
                pending: transaction.pending,
                payment_channel: transaction.payment_channel,
                personal_finance_category: transaction.personal_finance_category,
                location: transaction.location,
                iso_currency_code: transaction.iso_currency_code,
                unofficial_currency_code: transaction.unofficial_currency_code,
                import_method: 'plaid',
                bank_source: 'plaid'
              }))

              const { error: insertError } = await supabase
                .from('hb_transactions')
                .insert(transactionsToInsert)

              if (insertError) {
                console.error('Error inserting transactions:', insertError)
              } else {
                totalNewTransactions += newTransactions.length
              }
            }

          } catch (error) {
            console.error(`Error syncing transactions for account ${account.account_id}:`, error)
            // Continue with other accounts even if one fails
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
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 