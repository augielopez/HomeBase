# HomeBase - Personal Finance Management System

A comprehensive personal finance tracking application built with Angular, Supabase, and AI-powered insights.

## Features

- **CSV Import**: Import transactions from multiple banks with automatic categorization
- **AI-Powered Categorization**: Intelligent transaction categorization using OpenAI
- **Bill Reconciliation**: Match transactions to bills with smart matching algorithms
- **Financial Insights**: AI-generated spending insights and budget analysis
- **Multi-Bank Support**: Fidelity, US Bank, FirstTech CU, and more
- **Real-time Dashboard**: Live financial overview with charts and analytics

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- OpenAI API key (optional, for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/augielopez/HomeBase.git
   cd HomeBase
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```bash
   # OpenAI API Configuration (optional - for AI features)
   OPENAI_API_KEY=your-actual-openai-api-key-here
   
   # Supabase Configuration
   SUPABASE_URL=https://yoagkjezyhjetbyfbtpm.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvYWdramV6eWhqZXRieWZidHBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzYwNDk1NTAsImV4cCI6MTk5MTYyNTU1MH0.DfRRamWCDQjIUlLuUKwHYU8RtZ_p_FD_0LQFpg0R7Ro
   ```

4. **Update the environment file**
   
   Edit `src/environments/environment.ts` and replace the placeholder:
   ```typescript
   export const environment = {
     production: false,
     supabaseUrl: 'https://yoagkjezyhjetbyfbtpm.supabase.co',
     supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvYWdramV6eWhqZXRieWZidHBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzYwNDk1NTAsImV4cCI6MTk5MTYyNTU1MH0.DfRRamWCDQjIUlLuUKwHYU8RtZ_p_FD_0LQFpg0R7Ro',
     openaiApiKey: '<REDACTED>', // Replace with your actual key
     openaiApiUrl: 'https://api.openai.com/v1',
   }
   ```

5. **Run the application**
   ```bash
   npm start
   ```

6. **Access the application**
   
   Open your browser and navigate to `http://localhost:4200`

## Database Setup

The application uses Supabase with the following key features:

- **Row Level Security (RLS)**: Data isolation per user
- **pgvector**: Vector similarity search for AI categorization
- **Real-time subscriptions**: Live updates for collaborative features

### Database Schema

Key tables:
- `hb_transactions`: Transaction data with vector embeddings
- `hb_transaction_categories`: Category definitions
- `hb_bills`: Bill information for reconciliation
- `hb_csv_imports`: Import tracking and metadata
- `hb_categorization_rules`: User-defined categorization rules

## Supported Bank Formats

### Fidelity Bank
- **File Format**: `History_for_Account_X66402850.csv`
- **Account Detection**: Based on filename pattern
- **Fields**: Date, Description, Amount, Category

### US Bank
- **File Format**: `Credit Card - 2448_04-04-2024_08-08-2025.csv`
- **Account Detection**: Credit card transactions
- **Fields**: Date, Description, Amount, Category

### FirstTech CU
- **File Format**: `ExportedTransactionsMelissa.csv`
- **Account Detection**: Name extracted from filename
- **Fields**: Date, Description, Amount, Category

## AI Features

### Categorization
- **Rule-based**: Keyword matching and merchant patterns
- **AI Similarity**: Vector search using transaction embeddings
- **OpenAI Integration**: GPT-4 powered categorization (optional)

### Insights
- **Spending Analysis**: Monthly trends and category breakdowns
- **Budget Leaks**: AI-identified overspending areas
- **Anomaly Detection**: Unusual spending patterns
- **Subscription Tracking**: Recurring payment identification

## Development

### Project Structure
```
src/
├── app/
│   ├── layout/          # Main layout components
│   ├── pages/           # Feature pages
│   │   ├── accounts/    # Account management
│   │   ├── transactions/# Transaction views
│   │   ├── reconciliation/ # Bill reconciliation
│   │   └── service/     # Business logic services
│   └── interfaces/      # TypeScript interfaces
├── environments/        # Environment configuration
└── assets/             # Static assets
```

### Key Services
- `AuthService`: Authentication and user management
- `CsvImportService`: CSV parsing and import logic
- `AiCategorizationService`: Transaction categorization
- `ReconciliationService`: Bill matching algorithms
- `AiInsightsService`: Financial insights generation

## Security

- **API Keys**: Never commit actual API keys to the repository
- **Environment Variables**: Use `.env` files for local development
- **Row Level Security**: Database-level user data isolation
- **Input Validation**: Comprehensive validation on all inputs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues, please open an issue on GitHub or contact the development team.
