# Transaction Table Consolidation Plan

## Overview

This document outlines the strategy to consolidate the two transaction tables (`hb_plaid_transactions` and `hb_transactions`) into a unified transaction management system.

## Current State

### Two Transaction Tables

1. **`hb_plaid_transactions`** (Plaid-specific)
   - Raw Plaid API data storage
   - Plaid-specific fields: `item_id`, `personal_finance_category`
   - Used by Plaid sync functions
   - **Purpose**: Raw data storage from Plaid API

2. **`hb_transactions`** (Unified table)
   - Enhanced with AI features (embeddings, categorization)
   - Supports multiple import methods (Plaid, CSV, manual)
   - Has reconciliation features
   - **Purpose**: Unified transaction management

## Problems with Current Approach

1. **Data Duplication**: Same transactions stored in multiple places
2. **Inconsistent Categorization**: AI features only work on one table
3. **Complex Queries**: Need to UNION multiple tables for reports
4. **Maintenance Overhead**: Two schemas to maintain
5. **Reconciliation Issues**: Bills can't be matched across tables

## Solution: Unified Transaction Architecture

### Benefits

1. **Single Source of Truth**: All transactions in one place
2. **Consistent Categorization**: AI features work across all sources
3. **Unified Reconciliation**: Bills can be matched to any transaction
4. **Simplified Queries**: Single table with proper indexing
5. **Better Performance**: Optimized indexes and queries
6. **Easier Maintenance**: One schema to maintain

### Migration Strategy

#### Phase 1: Schema Enhancement ✅
- Add Plaid-specific columns to `hb_transactions`
- Create migration script to move data
- Add proper indexes for performance

#### Phase 2: Data Migration ✅
- Migrate existing Plaid transactions to unified table
- Preserve all original data in new columns
- Create backward compatibility view

#### Phase 3: Function Updates ✅
- Update Plaid sync functions to use unified table
- Update transaction retrieval functions
- Maintain API compatibility

#### Phase 4: Application Updates
- Update frontend services to use unified table
- Update reconciliation logic
- Update reporting and analytics

#### Phase 5: Cleanup
- Drop old `hb_plaid_transactions` table
- Remove backward compatibility view
- Update documentation

## New Unified Schema

### `hb_transactions` Table

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
    bank_source VARCHAR(100), -- 'plaid', 'fidelity', 'us_bank', etc.
    import_method VARCHAR(50) DEFAULT 'plaid', -- 'plaid', 'csv', 'manual'
    csv_filename TEXT, -- Original CSV filename if imported via CSV
    bill_id UUID REFERENCES hb_bills(id),
    is_reconciled BOOLEAN DEFAULT false,
    pending BOOLEAN DEFAULT false,
    payment_channel TEXT,
    location JSONB,
    iso_currency_code TEXT DEFAULT 'USD',
    
    -- Plaid-specific fields (nullable for non-Plaid transactions)
    item_id TEXT,
    personal_finance_category JSONB,
    unofficial_currency_code TEXT,
    plaid_category JSONB, -- Store original Plaid category data
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, transaction_id, account_id)
);
```

### Key Features

1. **Multi-Source Support**: Handles Plaid, CSV, and manual imports
2. **AI Integration**: Vector embeddings for similarity search
3. **Categorization**: Unified categorization across all sources
4. **Reconciliation**: Bill matching for all transaction types
5. **Audit Trail**: Import method and source tracking

## Migration Steps

### 1. Run Migration Script

```bash
supabase db push
```

This will:
- Add new columns to `hb_transactions`
- Migrate existing Plaid data
- Create indexes and functions
- Set up backward compatibility

### 2. Update Application Code

- Update CSV import service to use unified table
- Update reconciliation service
- Update transaction display components
- Update reporting functions

### 3. Test Migration

- Verify all Plaid transactions migrated correctly
- Test CSV import functionality
- Test reconciliation features
- Test AI categorization

### 4. Deploy Updates

- Deploy updated Edge Functions
- Deploy updated application code
- Monitor for any issues

### 5. Cleanup (After Verification)

- Drop old `hb_plaid_transactions` table
- Remove backward compatibility view
- Update documentation

## API Changes

### Transaction Retrieval

**Before:**
```typescript
// Had to query multiple tables
const plaidTransactions = await supabase.from('hb_plaid_transactions').select('*')
const csvTransactions = await supabase.from('hb_transactions').select('*')
```

**After:**
```typescript
// Single query with optional filtering
const allTransactions = await supabase
  .from('hb_transactions')
  .select('*')
  .eq('user_id', userId)
  .order('date', { ascending: false })

// Filter by source if needed
const plaidOnly = await supabase
  .from('hb_transactions')
  .select('*')
  .eq('import_method', 'plaid')

const csvOnly = await supabase
  .from('hb_transactions')
  .select('*')
  .eq('import_method', 'csv')
```

### New Database Function

```sql
-- Get transactions with flexible filtering
SELECT * FROM get_user_transactions(
  p_user_id := 'user-uuid',
  p_start_date := '2024-01-01',
  p_end_date := '2024-12-31',
  p_import_method := 'plaid' -- or 'csv', or NULL for all
);
```

## Benefits After Migration

1. **Simplified Architecture**: One table, one source of truth
2. **Better Performance**: Optimized indexes and queries
3. **Enhanced Features**: AI categorization works on all transactions
4. **Easier Maintenance**: Single schema to maintain
5. **Improved Analytics**: Unified reporting across all sources
6. **Better Reconciliation**: Bills can match any transaction type

## Risk Mitigation

1. **Backup**: Full database backup before migration
2. **Testing**: Test migration on staging environment first
3. **Rollback Plan**: Keep old table until verification complete
4. **Monitoring**: Monitor application performance after migration
5. **Gradual Rollout**: Deploy changes incrementally

## Timeline

- **Phase 1-3**: Complete (migration script and function updates)
- **Phase 4**: Application updates (1-2 days)
- **Phase 5**: Cleanup (after 1 week of monitoring)

## Conclusion

The unified transaction architecture provides a cleaner, more maintainable, and more feature-rich system. The migration is designed to be safe and reversible, with minimal disruption to existing functionality. 