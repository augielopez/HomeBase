# Plaid Integration Setup Instructions

## Overview
This guide will help you set up Plaid integration for transaction data in your HomeBase application.

## Prerequisites
- Supabase project with Edge Functions enabled
- Plaid account with sandbox credentials
- Angular application with the provided code

## Step 1: Deploy Supabase Edge Functions

### 1.1 Install Supabase CLI (macOS)
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Supabase CLI via Homebrew
brew install supabase/tap/supabase
```

### 1.2 Login to Supabase
```bash
supabase login
```

### 1.3 Link your project
```bash
supabase link --project-ref yoagkjezyhjetbyfbtpm
```

### 1.4 Deploy Edge Functions
```bash
supabase functions deploy plaid-link-token
supabase functions deploy plaid-exchange-token
supabase functions deploy plaid-sync-transactions
```

## Step 2: Set Environment Variables

### 2.1 Set Supabase Environment Variables
```bash
supabase secrets set PROJECT_URL=https://yoagkjezyhjetbyfbtpm.supabase.co
supabase secrets set SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvYWdramV6eWhqZXRieWZidHBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY3NjA0OTU1MCwiZXhwIjoxOTkxNjI1NTUwfQ.7WjZZTj-x9YQh2faOeNWt4lhipPHjzl3HdrBlb18Oh8
```

### 2.2 Update Plaid Credentials
The Edge Functions are already configured with your Plaid credentials:
- Client ID: `66751464deb61800190a21a3`
- Secret: `77546ce7193daa2f731240acd84866`

## Step 3: Run Database Migration

### 3.1 Deploy the migration
```bash
supabase db push
```

This will create the following tables:
- `hb_plaid_items` - Stores Plaid item information
- `hb_plaid_accounts` - Stores linked bank accounts
- `hb_plaid_transactions` - Stores transaction data

## Step 4: Add Settings Route

### 4.1 Update your routing
Add the settings route to your `app.routes.ts`:

```typescript
import { SettingsComponent } from './pages/settings/settings.component';

// Add this to your routes array
{
  path: 'settings',
  component: SettingsComponent
}
```

### 4.2 Add to navigation menu
Update your menu component to include a link to settings.

## Step 5: Test the Integration

### 5.1 Test Bank Linking
1. Navigate to Settings page
2. Click "Link Bank Account"
3. Use Plaid sandbox credentials:
   - Username: `user_good`
   - Password: `pass_good`

### 5.2 Test Transaction Sync
1. After linking an account
2. Click "Sync Transactions"
3. Verify transactions appear in the database

## Step 6: Create Transactions Page (Optional)

You can create a dedicated transactions page to view and manage imported transactions:

```typescript
// src/app/pages/transactions/transactions.component.ts
@Component({
  selector: 'app-transactions',
  template: `
    <div class="card">
      <h1>Transactions</h1>
      <p-table [value]="transactions" [paginator]="true" [rows]="20">
        <ng-template pTemplate="header">
          <tr>
            <th>Date</th>
            <th>Name</th>
            <th>Merchant</th>
            <th>Amount</th>
            <th>Category</th>
            <th>Status</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-transaction>
          <tr>
            <td>{{ transaction.date | date }}</td>
            <td>{{ transaction.name }}</td>
            <td>{{ transaction.merchant_name }}</td>
            <td [class.text-red-600]="transaction.amount < 0">
              {{ transaction.amount | currency }}
            </td>
            <td>{{ transaction.category?.join(' > ') }}</td>
            <td>
              <p-tag [value]="transaction.pending ? 'Pending' : 'Posted'" 
                     [severity]="transaction.pending ? 'warning' : 'success'">
              </p-tag>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `
})
export class TransactionsComponent {
  transactions: any[] = [];

  async ngOnInit() {
    await this.loadTransactions();
  }

  private async loadTransactions() {
    const { data, error } = await this.supabaseService.getClient()
      .from('hb_plaid_transactions')
      .select('*')
      .order('date', { ascending: false });
    
    if (!error) {
      this.transactions = data || [];
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure your Supabase project allows your domain
2. **Authentication Errors**: Verify your service role key is correct
3. **Plaid API Errors**: Check that your Plaid credentials are valid
4. **Database Errors**: Ensure the migration ran successfully

### Debug Steps

1. Check browser console for errors
2. Check Supabase Edge Function logs:
   ```bash
   supabase functions logs plaid-link-token
   supabase functions logs plaid-exchange-token
   supabase functions logs plaid-sync-transactions
   ```

## Security Considerations

1. **Access Tokens**: Never expose access tokens in client-side code
2. **Service Role Key**: Keep your service role key secure
3. **Row Level Security**: RLS policies are already configured
4. **Data Encryption**: Consider encrypting sensitive data

## Next Steps

1. **Production Setup**: Update Plaid credentials for production
2. **Webhooks**: Set up webhooks for real-time transaction updates
3. **Categorization**: Implement custom transaction categorization
4. **Analytics**: Add spending analytics and reports
5. **Budgeting**: Integrate with budgeting features

## Support

If you encounter issues:
1. Check the Supabase documentation
2. Review Plaid API documentation
3. Check the browser console for errors
4. Verify all environment variables are set correctly 