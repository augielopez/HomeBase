# Financial Management System

A comprehensive personal finance tracking application with CSV import, AI-powered categorization, bill reconciliation, and intelligent spending insights.

## 🚀 Features

### 📊 CSV Import & Bank Detection
- **Multi-bank Support**: Automatically detects and parses CSV files from major banks (Chase, Wells Fargo, Bank of America, American Express)
- **Smart Field Mapping**: Adapts to different CSV schemas and formats
- **Data Normalization**: Converts various date formats and amount representations into standardized format
- **Import Logging**: Tracks import history with success/failure statistics

### 🏷️ Intelligent Categorization
- **Three-tier Categorization System**:
  1. **CSV-provided categories**: Preserves and normalizes categories from imported files
  2. **Rules-based logic**: User-defined rules for merchant names, keywords, and amount ranges
  3. **AI-powered prediction**: Vector similarity search using OpenAI embeddings
- **Confidence Scoring**: Each categorization includes a confidence level
- **Category Management**: Prevents duplicate categories and maintains consistency

### 🔄 Bill Reconciliation
- **Automatic Matching**: Matches transactions to bills based on:
  - Amount tolerance (±$5)
  - Date proximity (±3 days)
  - Merchant name similarity
- **Manual Override**: Ability to manually match or unmatch transactions
- **Reconciliation Dashboard**: Visual overview of matched vs unmatched items
- **Confidence Indicators**: Shows match confidence with progress bars

### 🧠 AI-Powered Insights
- **Spending Analysis**: Monthly breakdowns by category with visual charts
- **Budget Leak Detection**: Identifies high-spending categories and potential overspending
- **Subscription Detection**: Finds recurring charges and small frequent transactions
- **Trend Analysis**: Tracks spending patterns over time
- **OpenAI Integration**: Generates personalized financial advice and recommendations

### 📈 Visual Analytics
- **Monthly Overview**: Summary cards showing total spent, income, net amount, and transaction count
- **Category Breakdown**: Pie charts and detailed category lists
- **Birthstone Month Selector**: Beautiful UX with colored month indicators
- **Reconciliation Status**: Visual indicators for matched/unmatched items

## 🗄️ Database Schema

### Core Tables

#### `hb_transactions`
Enhanced transaction table with vector support:
```sql
CREATE TABLE hb_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    transaction_id TEXT,
    amount DECIMAL(15,2) NOT NULL,
    date DATE NOT NULL,
    name TEXT NOT NULL,
    merchant_name TEXT,
    description TEXT,
    category_id UUID REFERENCES hb_transaction_categories(id),
    category_confidence DECIMAL(3,2) DEFAULT 0.0,
    embedding vector(1536), -- OpenAI embedding vector
    bank_source VARCHAR(100),
    import_method VARCHAR(50) DEFAULT 'plaid',
    csv_filename TEXT,
    bill_id UUID REFERENCES hb_bills(id),
    is_reconciled BOOLEAN DEFAULT false,
    pending BOOLEAN DEFAULT false,
    payment_channel TEXT,
    location JSONB,
    iso_currency_code TEXT DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, transaction_id, account_id)
);
```

#### `hb_transaction_categories`
Transaction categorization system:
```sql
CREATE TABLE hb_transaction_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    icon VARCHAR(50),
    parent_category_id UUID REFERENCES hb_transaction_categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    updated_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM'
);
```

#### `hb_categorization_rules`
User-defined categorization rules:
```sql
CREATE TABLE hb_categorization_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'keyword', 'merchant', 'amount_range'
    rule_conditions JSONB NOT NULL,
    category_id UUID REFERENCES hb_transaction_categories(id) NOT NULL,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    updated_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM'
);
```

#### `hb_csv_imports`
Import tracking and logging:
```sql
CREATE TABLE hb_csv_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    bank_detected VARCHAR(100),
    total_rows INTEGER,
    imported_rows INTEGER,
    failed_rows INTEGER,
    status VARCHAR(50) DEFAULT 'processing',
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### Vector Search Function
```sql
CREATE OR REPLACE FUNCTION match_transactions(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.8,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    merchant_name TEXT,
    category_id UUID,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.merchant_name,
        t.category_id,
        1 - (t.embedding <=> query_embedding) as similarity
    FROM hb_transactions t
    WHERE t.embedding IS NOT NULL
    AND t.category_id IS NOT NULL
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
    ORDER BY t.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
```

## 🔧 Services

### CsvImportService
Handles CSV file processing and bank detection:
- **Bank Schema Detection**: Automatically identifies bank format from filename and headers
- **Data Parsing**: Handles quoted values, different date formats, and amount representations
- **Transaction Normalization**: Converts to standardized format
- **Import Logging**: Tracks import progress and results

### ReconciliationService
Manages bill-transaction matching:
- **Automatic Matching**: Uses amount, date, and merchant similarity
- **Confidence Scoring**: Calculates match confidence based on multiple factors
- **Manual Override**: Allows users to manually match or unmatch items
- **Reconciliation Statistics**: Provides summary statistics

### AiInsightsService
Generates spending insights and analysis:
- **Monthly Summaries**: Calculates spending breakdowns and statistics
- **AI Integration**: Uses OpenAI API for personalized insights
- **Rule-based Insights**: Identifies budget leaks and subscriptions
- **Trend Analysis**: Tracks spending patterns over time

## 🎨 UI Components

### ReconciliationComponent
Main dashboard for financial management:
- **Month Selector**: Dropdown with birthstone-colored month indicators
- **Summary Cards**: Total spent, income, net amount, and transaction count
- **Reconciliation Tables**: Matched and unmatched items with confidence indicators
- **Category Breakdown**: Pie charts and detailed category lists
- **AI Insights**: Cards showing spending insights and recommendations
- **CSV Upload**: Drag-and-drop file upload with progress tracking

## 🚀 Setup Instructions

### 1. Database Migration
Run the new migration to create the enhanced schema:
```bash
supabase db push
```

### 2. Environment Variables
Add OpenAI API key to your Supabase environment:
```bash
supabase secrets set OPENAI_API_KEY=your_openai_api_key
```

### 3. Enable pgvector Extension
Ensure the pgvector extension is enabled in your Supabase project:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4. Deploy Edge Functions
Deploy the AI categorization function:
```bash
supabase functions deploy ai-categorize-transaction
```

## 📊 Usage Guide

### Importing CSV Files
1. Navigate to the Reconciliation & Insights page
2. Click "Import CSV" button
3. Select your bank's CSV export file
4. The system will automatically detect the bank format
5. Review the import results and categorization

### Setting Up Categorization Rules
1. Create rules in the `hb_categorization_rules` table
2. Rules can be based on:
   - Keywords in transaction descriptions
   - Merchant names
   - Amount ranges
3. Rules are applied in priority order

### Bill Reconciliation
1. Select a month from the dropdown
2. Click "Reconcile Month" to run automatic matching
3. Review matched transactions and their confidence scores
4. Manually match any unmatched items
5. Apply the reconciliation to save matches

### Viewing Insights
1. Monthly insights are automatically generated
2. Review AI-powered recommendations
3. Check category breakdowns and spending trends
4. Monitor budget leaks and subscription detection

## 🔒 Security Features

- **Row Level Security (RLS)**: All tables have RLS policies ensuring users can only access their own data
- **Input Validation**: CSV parsing includes validation and error handling
- **API Key Management**: OpenAI API key is stored securely in Supabase secrets
- **Transaction Logging**: All imports and reconciliations are logged for audit purposes

## 🎯 Performance Considerations

- **Vector Indexing**: Transactions table includes vector indexes for fast similarity search
- **Batch Processing**: CSV imports are processed in batches to handle large files
- **Caching**: Category data is cached to reduce database queries
- **Pagination**: Large datasets are paginated for better performance

## 🔮 Future Enhancements

- **Machine Learning**: Train custom models for better categorization accuracy
- **Budget Planning**: Set and track budget goals by category
- **Expense Forecasting**: Predict future spending based on historical patterns
- **Multi-currency Support**: Handle transactions in different currencies
- **Receipt OCR**: Extract transaction data from receipt images
- **Integration APIs**: Connect with more financial institutions

## 🐛 Troubleshooting

### Common Issues

1. **CSV Import Fails**
   - Check file format and encoding
   - Ensure required columns are present
   - Verify bank format is supported

2. **Poor Categorization Accuracy**
   - Review and update categorization rules
   - Ensure sufficient historical data for AI learning
   - Check OpenAI API key configuration

3. **Slow Performance**
   - Verify vector indexes are created
   - Check database connection limits
   - Monitor API rate limits

### Debug Mode
Enable debug logging by setting environment variables:
```bash
supabase secrets set DEBUG_MODE=true
```

## 📝 API Reference

### Edge Functions

#### `ai-categorize-transaction`
Categorizes a transaction using AI and vector search:
```typescript
POST /functions/v1/ai-categorize-transaction
{
  "transaction_id": "uuid",
  "merchant_name": "string",
  "description": "string", 
  "amount": number
}
```

Response:
```typescript
{
  "category_id": "uuid",
  "confidence": number,
  "method": "vector_search" | "rules" | "default",
  "similar_transactions": [...]
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. 