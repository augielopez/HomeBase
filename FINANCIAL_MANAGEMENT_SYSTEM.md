# Financial Management System with AI-Powered Insights

A comprehensive personal finance tracking application built with Angular, Supabase, and AI-powered categorization and insights.

## 🚀 Features

### 📊 Core Functionality
- **CSV Import & Processing**: Import transactions from multiple banks with automatic schema detection
- **AI-Powered Categorization**: Multi-method categorization using rules, vector similarity, and OpenAI
- **Bill Reconciliation**: Automatic matching of transactions to bills with configurable tolerances
- **Financial Insights**: AI-generated spending analysis and recommendations
- **Interactive Dashboards**: Charts, graphs, and visual analytics

### 🧠 AI Capabilities
- **Vector Similarity Search**: Using pgvector for semantic transaction matching
- **OpenAI Integration**: GPT-4 powered categorization and insights
- **Rule-Based Engine**: Configurable categorization rules with priority system
- **Confidence Scoring**: Multi-level confidence assessment for categorization accuracy

## 🏗️ Architecture

### Database Schema (Supabase + pgvector)

#### Core Tables
- `hb_transactions`: Main transaction table with vector embeddings
- `hb_transaction_categories`: Transaction categories with hierarchy support
- `hb_bills`: Bill management and tracking
- `hb_bank_accounts`: Bank account mapping for CSV imports
- `hb_csv_imports`: Import history and processing logs
- `hb_categorization_rules`: User-defined categorization rules

#### AI/ML Features
- **Vector Embeddings**: 1536-dimensional OpenAI embeddings stored in pgvector
- **Similarity Search**: KNN search for transaction matching
- **Confidence Tracking**: Categorization confidence scores

### Frontend Architecture (Angular)

#### Services
- `AiCategorizationService`: Multi-method categorization engine
- `CsvImportService`: CSV processing with bank detection
- `ReconciliationService`: Bill-to-transaction matching
- `AiInsightsService`: AI-powered financial insights
- `SupabaseService`: Database connectivity

#### Components
- `ReconciliationComponent`: Main reconciliation dashboard
- `FinancialInsightsComponent`: Analytics and insights
- `CategorizationRulesComponent`: Rule management interface

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 18+ and npm
- Supabase account with pgvector extension
- OpenAI API key (optional, for enhanced AI features)

### 1. Database Setup

Run the migration script in your Supabase project:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Run the complete migration from: supabase/migrations/20241201000002_create_financial_management_tables.sql
```

### 2. Environment Configuration

Update `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'your-supabase-url',
  supabaseKey: 'your-supabase-anon-key',
  openaiApiKey: '<REDACTED>', // Optional
  openaiApiUrl: 'https://api.openai.com/v1',
}
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Development Server

```bash
npm start
```

## 📁 Project Structure

```
src/
├── app/
│   ├── interfaces/           # TypeScript interfaces
│   ├── pages/
│   │   ├── service/         # Core services
│   │   │   ├── ai-categorization.service.ts
│   │   │   ├── csv-import.service.ts
│   │   │   ├── reconciliation.service.ts
│   │   │   └── ai-insights.service.ts
│   │   ├── reconciliation/  # Main reconciliation component
│   │   ├── financial-insights/ # Analytics dashboard
│   │   └── categorization-rules/ # Rule management
│   └── app.component.ts
├── environments/
│   └── environment.ts       # Configuration
└── assets/
    └── images/             # Static assets

supabase/
├── migrations/             # Database migrations
└── functions/             # Edge functions (if needed)
```

## 🔧 Configuration

### Categorization Rules

Create rules in the UI or via API:

```typescript
// Example rule structure
{
  rule_name: "Starbucks Coffee",
  rule_type: "keyword",
  rule_conditions: {
    keywords: ["starbucks", "coffee", "cafe"]
  },
  category_id: "food-dining-category-id",
  priority: 10,
  is_active: true
}
```

### Bank Schema Configuration

Add new bank schemas in `CsvImportService`:

```typescript
{
  name: 'Your Bank',
  patterns: ['yourbank', 'your-bank'],
  fieldMapping: {
    date: 'Transaction Date',
    description: 'Description',
    amount: 'Amount',
    merchant: 'Merchant',
    category: 'Category'
  },
  dateFormat: 'MM/dd/yyyy',
  amountFormat: 'positive_negative'
}
```

## 🚀 Usage Guide

### 1. CSV Import Process

1. **Upload CSV**: Navigate to Reconciliation page
2. **Automatic Detection**: System detects bank and schema
3. **AI Categorization**: Transactions are automatically categorized
4. **Review & Confirm**: Review results and apply

### 2. Bill Reconciliation

1. **Select Month**: Choose month to reconcile
2. **Automatic Matching**: System matches transactions to bills
3. **Manual Review**: Review unmatched items
4. **Apply Matches**: Confirm and apply reconciliation

### 3. Financial Insights

1. **Select Period**: Choose month for analysis
2. **View Analytics**: Charts, trends, and breakdowns
3. **AI Insights**: Review AI-generated recommendations
4. **Export Data**: Download reports if needed

### 4. Categorization Rules

1. **Create Rules**: Add keyword, merchant, or amount-based rules
2. **Set Priority**: Higher priority rules apply first
3. **Test Rules**: Verify rule effectiveness
4. **Manage Rules**: Edit, disable, or delete rules

## 🤖 AI Features

### Vector Similarity Search

```typescript
// Example: Find similar transactions
const similarTransactions = await supabase.rpc('match_transactions', {
  query_embedding: embedding,
  match_threshold: 0.8,
  match_count: 5
});
```

### OpenAI Integration

```typescript
// Example: AI categorization
const result = await aiCategorizationService.categorizeTransaction(transaction);
// Returns: { categoryId, confidence, method }
```

### Confidence Scoring

- **1.0**: CSV-provided category
- **0.9**: Rule-based match
- **0.7-0.9**: AI similarity match
- **0.8**: OpenAI categorization
- **0.0**: Default category

## 📊 Analytics & Reporting

### Available Charts
- **Pie Chart**: Category spending breakdown
- **Line Chart**: Monthly spending trends
- **Bar Chart**: Category comparisons
- **Summary Cards**: Key metrics

### AI Insights Types
- **Budget Leaks**: Unusual spending patterns
- **Subscriptions**: Recurring charges identification
- **Anomalies**: Spending spikes and outliers
- **Trends**: Month-over-month analysis
- **Recommendations**: Optimization suggestions

## 🔒 Security & Performance

### Security Features
- **Row Level Security (RLS)**: User data isolation
- **API Key Management**: Secure environment configuration
- **Input Validation**: Comprehensive data validation
- **Error Handling**: Graceful error management

### Performance Optimizations
- **Batch Processing**: Efficient CSV import processing
- **Vector Indexing**: Optimized similarity search
- **Caching**: Chart data and insights caching
- **Lazy Loading**: Component and data lazy loading

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run e2e
```

### Database Tests
```bash
# Test vector similarity function
SELECT * FROM match_transactions(
  query_embedding := '[0.1, 0.2, ...]'::vector,
  match_threshold := 0.8,
  match_count := 5
);
```

## 🚀 Deployment

### Vercel Deployment
```bash
npm run build
vercel --prod
```

### Environment Variables
Set in Vercel dashboard:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` (optional)

## 📈 Monitoring & Analytics

### Performance Metrics
- CSV import processing time
- AI categorization accuracy
- Vector search performance
- User engagement metrics

### Error Tracking
- Import failures
- Categorization errors
- API rate limits
- Database connection issues

## 🔮 Future Enhancements

### Planned Features
- **Budget Tracking**: Monthly budget management
- **Goal Setting**: Financial goal tracking
- **Export Features**: PDF reports and data export
- **Mobile App**: React Native mobile application
- **Advanced AI**: Custom model fine-tuning

### Technical Improvements
- **Real-time Updates**: WebSocket integration
- **Offline Support**: Service worker implementation
- **Advanced Analytics**: Machine learning insights
- **Multi-currency**: International currency support

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Implement changes
4. Add tests
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check documentation
2. Review existing issues
3. Create new issue with details
4. Contact maintainers

---

**Built with ❤️ using Angular, Supabase, and OpenAI** 