import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Transaction, BankAccount, CsvImport, TransactionCategory } from '../../interfaces';
import { Observable, from, map, switchMap } from 'rxjs';

export interface CsvTransaction {
    date: string;
    description: string;
    amount: number;
    merchant?: string;
    category?: string;
    account?: string;
    [key: string]: any; // Allow additional fields
}

export interface BankSchema {
    name: string;
    patterns: string[];
    fieldMapping: {
        date: string;
        description: string;
        amount: string;
        merchant?: string;
        category?: string;
        account?: string;
    };
    dateFormat: string;
    amountFormat: 'positive_negative' | 'debit_credit' | 'single_column';
}

@Injectable({
    providedIn: 'root'
})
export class CsvImportService {
    private bankSchemas: BankSchema[] = [
        {
            name: 'Chase',
            patterns: ['chase', 'jpmorgan'],
            fieldMapping: {
                date: 'Transaction Date',
                description: 'Description',
                amount: 'Amount',
                merchant: 'Description',
                category: 'Category',
                account: 'Account Name'
            },
            dateFormat: 'MM/dd/yyyy',
            amountFormat: 'positive_negative'
        },
        {
            name: 'Wells Fargo',
            patterns: ['wells', 'fargo'],
            fieldMapping: {
                date: 'Date',
                description: 'Description',
                amount: 'Amount',
                merchant: 'Description',
                category: 'Category',
                account: 'Account'
            },
            dateFormat: 'MM/dd/yyyy',
            amountFormat: 'positive_negative'
        },
        {
            name: 'Bank of America',
            patterns: ['bank of america', 'bofa'],
            fieldMapping: {
                date: 'Date',
                description: 'Description',
                amount: 'Amount',
                merchant: 'Description',
                category: 'Category',
                account: 'Account Name'
            },
            dateFormat: 'MM/dd/yyyy',
            amountFormat: 'positive_negative'
        },
        {
            name: 'American Express',
            patterns: ['amex', 'american express'],
            fieldMapping: {
                date: 'Date',
                description: 'Description',
                amount: 'Amount',
                merchant: 'Description',
                category: 'Category',
                account: 'Card Member'
            },
            dateFormat: 'MM/dd/yyyy',
            amountFormat: 'positive_negative'
        }
    ];

    constructor(private supabaseService: SupabaseService) {}

    /**
     * Detect bank from filename and CSV headers
     */
    detectBank(filename: string, headers: string[]): BankSchema | null {
        const filenameLower = filename.toLowerCase();
        
        // First try to match by filename patterns
        for (const schema of this.bankSchemas) {
            for (const pattern of schema.patterns) {
                if (filenameLower.includes(pattern)) {
                    return schema;
                }
            }
        }

        // If no filename match, try to match by header patterns
        const headerString = headers.join(' ').toLowerCase();
        for (const schema of this.bankSchemas) {
            const requiredFields = Object.values(schema.fieldMapping).filter(field => field);
            const matchedFields = requiredFields.filter(field => 
                headers.some(header => header.toLowerCase().includes(field.toLowerCase()))
            );
            
            if (matchedFields.length >= 3) { // At least date, description, and amount
                return schema;
            }
        }

        return null;
    }

    /**
     * Parse CSV file and return normalized transactions
     */
    parseCsvFile(file: File): Observable<{ transactions: CsvTransaction[], bankSchema: BankSchema | null }> {
        return new Observable(observer => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const csv = e.target?.result as string;
                    const lines = csv.split('\n');
                    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                    
                    // Detect bank schema
                    const bankSchema = this.detectBank(file.name, headers);
                    
                    if (!bankSchema) {
                        observer.error(new Error('Unable to detect bank format. Please ensure the CSV has standard transaction fields.'));
                        return;
                    }

                    // Parse transactions
                    const transactions: CsvTransaction[] = [];
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!line) continue;

                        const values = this.parseCsvLine(line);
                        if (values.length < 3) continue; // Skip invalid lines

                        const transaction = this.normalizeTransaction(values, headers, bankSchema);
                        if (transaction) {
                            transactions.push(transaction);
                        }
                    }

                    observer.next({ transactions, bankSchema });
                    observer.complete();
                } catch (error) {
                    observer.error(error);
                }
            };

            reader.onerror = () => observer.error(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Parse CSV line handling quoted values
     */
    private parseCsvLine(line: string): string[] {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }

    /**
     * Normalize transaction data according to bank schema
     */
    private normalizeTransaction(values: string[], headers: string[], schema: BankSchema): CsvTransaction | null {
        try {
            const getValue = (fieldName: string): string => {
                const index = headers.findIndex(h => h.toLowerCase().includes(fieldName.toLowerCase()));
                return index >= 0 ? values[index] : '';
            };

            const dateStr = getValue(schema.fieldMapping.date);
            const description = getValue(schema.fieldMapping.description);
            const amountStr = getValue(schema.fieldMapping.amount);
            const merchant = getValue(schema.fieldMapping.merchant || '');
            const category = getValue(schema.fieldMapping.category || '');
            const account = getValue(schema.fieldMapping.account || '');

            if (!dateStr || !description || !amountStr) {
                return null;
            }

            // Parse date
            const date = this.parseDate(dateStr, schema.dateFormat);
            if (!date) return null;

            // Parse amount
            const amount = this.parseAmount(amountStr, schema.amountFormat);
            if (amount === null) return null;

            return {
                date: date.toISOString().split('T')[0],
                description: description.trim(),
                amount,
                merchant: merchant.trim() || undefined,
                category: category.trim() || undefined,
                account: account.trim() || undefined
            };
        } catch (error) {
            console.error('Error normalizing transaction:', error);
            return null;
        }
    }

    /**
     * Parse date string according to format
     */
    private parseDate(dateStr: string, format: string): Date | null {
        try {
            // Handle common date formats
            if (format === 'MM/dd/yyyy') {
                const [month, day, year] = dateStr.split('/');
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
            
            // Try ISO format
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date;
            }

            return null;
        } catch {
            return null;
        }
    }

    /**
     * Parse amount string according to format
     */
    private parseAmount(amountStr: string, format: string): number | null {
        try {
            // Remove currency symbols and commas
            const cleanAmount = amountStr.replace(/[$,]/g, '');
            const amount = parseFloat(cleanAmount);
            
            if (isNaN(amount)) return null;

            // Handle different amount formats
            switch (format) {
                case 'positive_negative':
                    return amount; // Already signed
                case 'debit_credit':
                    // Assume negative for debits, positive for credits
                    return amount < 0 ? amount : -amount;
                case 'single_column':
                    // Assume all amounts are expenses (negative)
                    return -Math.abs(amount);
                default:
                    return amount;
            }
        } catch {
            return null;
        }
    }

    /**
     * Import transactions from CSV
     */
    importTransactions(file: File): Observable<CsvImport> {
        return this.parseCsvFile(file).pipe(
            switchMap(({ transactions, bankSchema }) => {
                if (!bankSchema) {
                    throw new Error('Unable to detect bank format');
                }

                // Create import record
                const importRecord: Partial<CsvImport> = {
                    filename: file.name,
                    bank_detected: bankSchema.name,
                    total_rows: transactions.length,
                    imported_rows: 0,
                    failed_rows: 0,
                    status: 'processing'
                };

                return from(this.supabaseService.getClient()
                    .from('hb_csv_imports')
                    .insert([importRecord])
                    .select()
                    .single()
                ).pipe(
                    switchMap((result: any) => {
                        if (result.error) {
                            throw new Error(result.error.message);
                        }
                        // Process transactions
                        return this.processTransactions(transactions, result.data.id, bankSchema.name);
                    })
                );
            })
        );
    }

    /**
     * Process and save transactions
     */
    private async processTransactions(transactions: CsvTransaction[], importId: string, bankSource: string): Promise<CsvImport> {
        const supabase = this.supabaseService.getClient();
        let importedCount = 0;
        let failedCount = 0;

        for (const csvTransaction of transactions) {
            try {
                // Categorize transaction
                const categoryId = await this.categorizeTransaction(csvTransaction);
                
                // Create transaction record
                const transaction: Partial<Transaction> = {
                    account_id: csvTransaction.account || 'unknown',
                    amount: csvTransaction.amount,
                    date: csvTransaction.date,
                    name: csvTransaction.description,
                    merchant_name: csvTransaction.merchant,
                    category_id: categoryId || undefined,
                    bank_source: bankSource.toLowerCase().replace(/\s+/g, '_'),
                    import_method: 'csv',
                    csv_filename: importId,
                    pending: false,
                    iso_currency_code: 'USD'
                };

                const { error } = await supabase
                    .from('hb_transactions')
                    .insert([transaction]);

                if (error) {
                    console.error('Error inserting transaction:', error);
                    failedCount++;
                } else {
                    importedCount++;
                }
            } catch (error) {
                console.error('Error processing transaction:', error);
                failedCount++;
            }
        }

        // Update import record
        const { data: updatedImport } = await supabase
            .from('hb_csv_imports')
            .update({
                imported_rows: importedCount,
                failed_rows: failedCount,
                status: failedCount === 0 ? 'completed' : 'completed_with_errors',
                processing_time_ms: Date.now() - new Date().getTime()
            })
            .eq('id', importId)
            .select()
            .single();

        return updatedImport;
    }

    /**
     * Categorize transaction using rules and AI
     */
    private async categorizeTransaction(transaction: CsvTransaction): Promise<string | null> {
        // First, try to use CSV-provided category
        if (transaction.category) {
            const categoryId = await this.findOrCreateCategory(transaction.category);
            if (categoryId) return categoryId;
        }

        // Then try rules-based categorization
        const ruleCategoryId = await this.applyCategorizationRules(transaction);
        if (ruleCategoryId) return ruleCategoryId;

        // Finally, try AI-based categorization
        const aiCategoryId = await this.aiCategorizeTransaction(transaction);
        if (aiCategoryId) return aiCategoryId;

        // Default to "Other" category
        return this.getDefaultCategoryId();
    }

    /**
     * Find or create category by name
     */
    private async findOrCreateCategory(categoryName: string): Promise<string | null> {
        const normalizedName = this.normalizeCategoryName(categoryName);
        
        const { data: existingCategory } = await this.supabaseService.getClient()
            .from('hb_transaction_categories')
            .select('id')
            .ilike('name', normalizedName)
            .single();

        if (existingCategory) {
            return existingCategory.id;
        }

        // Create new category
        const { data: newCategory } = await this.supabaseService.getClient()
            .from('hb_transaction_categories')
            .insert([{
                name: normalizedName,
                description: `Auto-created from CSV import: ${categoryName}`,
                created_by: 'SYSTEM',
                updated_by: 'SYSTEM'
            }])
            .select('id')
            .single();

        return newCategory?.id || null;
    }

    /**
     * Normalize category name
     */
    private normalizeCategoryName(name: string): string {
        return name
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Apply user-defined categorization rules
     */
    private async applyCategorizationRules(transaction: CsvTransaction): Promise<string | null> {
        // This would implement rules-based categorization
        // For now, return null to fall back to AI categorization
        return null;
    }

    /**
     * AI-based transaction categorization
     */
    private async aiCategorizeTransaction(transaction: CsvTransaction): Promise<string | null> {
        // This would implement AI categorization using embeddings
        // For now, return null to use default category
        return null;
    }

    /**
     * Get default category ID
     */
    private async getDefaultCategoryId(): Promise<string | null> {
        const { data: defaultCategory } = await this.supabaseService.getClient()
            .from('hb_transaction_categories')
            .select('id')
            .eq('name', 'Other')
            .single();

        return defaultCategory?.id || null;
    }

    /**
     * Get import history
     */
    getImportHistory(): Observable<CsvImport[]> {
        return from(this.supabaseService.getClient()
            .from('hb_csv_imports')
            .select('*')
            .order('created_at', { ascending: false })
        ).pipe(
            map(result => result.data || [])
        );
    }
} 