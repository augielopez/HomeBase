import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Transaction, BankAccount, CsvImport, TransactionCategory } from '../../interfaces';
import { Observable, from, map, switchMap, forkJoin, catchError } from 'rxjs';
import { AiCategorizationService, CategorizationResult } from './ai-categorization.service';
import { ErrorLogService } from './error-log.service';
import { DuplicateCheckService } from './duplicate-check.service';

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
        },
        {
            name: 'Fidelity Bank',
            patterns: ['fidelity', 'history_for_account', 'x66402850', 'x67992518'],
            fieldMapping: {
                date: 'Run Date',
                description: 'Action',
                amount: 'Amount'
            },
            dateFormat: 'MM/dd/yyyy',
            amountFormat: 'positive_negative'
        },
        {
            name: 'US Bank',
            patterns: ['credit card'],
            fieldMapping: {
                date: 'Date',
                description: 'Name',
                amount: 'Amount',
                merchant: 'Name'
            },
            dateFormat: 'yyyy-MM-dd',
            amountFormat: 'positive_negative'
        },
        {
            name: 'FirstTech CU',
            patterns: ['firsttech', 'exportedtransactions'],
            fieldMapping: {
                date: 'Effective Date',
                description: 'Description',
                amount: 'Amount',
                merchant: 'Extended Description',
                category: 'Transaction Category'
            },
            dateFormat: 'MM/dd/yyyy',
            amountFormat: 'positive_negative'
        },
        {
            name: 'Marcus',
            patterns: ['marcus'],
            fieldMapping: {
                date: 'Date',
                description: 'Description',
                amount: 'Amount',
                merchant: 'Description'
            },
            dateFormat: 'MMM dd, yyyy',
            amountFormat: 'positive_negative'
        }
    ];

    constructor(
        private supabaseService: SupabaseService,
        private aiCategorizationService: AiCategorizationService,
        private errorLogService: ErrorLogService,
        private duplicateCheckService: DuplicateCheckService
    ) {}

    /**
     * Detect bank from filename and CSV headers
     */
    detectBank(filename: string, headers: string[]): BankSchema | null {
        const filenameLower = filename.toLowerCase();
        
        console.log('Detecting bank for file:', filename);
        console.log('CSV headers:', headers);
        
        // Check for specific filename patterns first
        if (filenameLower.startsWith('credit card')) {
            console.log('Matched Credit Card pattern');
            return {
                name: 'US Bank',
                patterns: ['credit card'],
                fieldMapping: {
                    date: 'Date',
                    description: 'Name',
                    amount: 'Amount',
                    merchant: 'Name'
                },
                dateFormat: 'yyyy-MM-dd',
                amountFormat: 'positive_negative'
            };
        }
        
        if (filenameLower.startsWith('exportedtransactions')) {
            console.log('Matched ExportedTransactions pattern');
            return {
                name: 'FirstTech CU',
                patterns: ['exportedtransactions'],
                fieldMapping: {
                    date: 'Posting Date',
                    description: 'Description',
                    amount: 'Amount',
                    merchant: 'Description',
                    category: 'Transaction Category',
                    account: 'Account Name'
                },
                dateFormat: 'M/d/yyyy',
                amountFormat: 'positive_negative'
            };
        }
        
        if (filenameLower.startsWith('history_for_account')) {
            console.log('Matched History_for_Account pattern');
            console.log('CSV headers for History_for_Account:', headers);
            
            // Based on the actual CSV structure, map the correct fields
            return {
                name: 'Fidelity Bank',
                patterns: ['fidelity', 'history_for_account', 'x66402850', 'x67992518'],
                fieldMapping: {
                    date: 'Run Date',
                    description: 'Action',
                    amount: 'Amount'
                },
                dateFormat: 'MM/dd/yyyy',
                amountFormat: 'positive_negative'
            };
        }
        
        if (filenameLower === 'marcus') {
            console.log('Matched Marcus pattern');
            return {
                name: 'Marcus',
                patterns: ['marcus'],
                fieldMapping: {
                    date: 'Date',
                    description: 'Description',
                    amount: 'Amount',
                    merchant: 'Description',
                    account: 'Account Name'
                },
                dateFormat: 'MMM dd, yyyy',
                amountFormat: 'positive_negative'
            };
        }

        // Check for Marcus by headers if filename doesn't match exactly
        if (filenameLower.includes('marcus')) {
            console.log('Matched Marcus pattern by filename');
            return {
                name: 'Marcus',
                patterns: ['marcus'],
                fieldMapping: {
                    date: 'Date',
                    description: 'Description',
                    amount: 'Amount',
                    merchant: 'Description',
                    account: 'Account Name'
                },
                dateFormat: 'MMM dd, yyyy',
                amountFormat: 'positive_negative'
            };
        }
        
        // If no specific pattern matches, try generic bank schemas
        for (const schema of this.bankSchemas) {
            for (const pattern of schema.patterns) {
                if (filenameLower.includes(pattern)) {
                    console.log('Matched bank schema by filename pattern:', schema.name);
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
            
            console.log(`Checking schema ${schema.name}:`, {
                requiredFields,
                matchedFields,
                matchCount: matchedFields.length
            });
            
            if (matchedFields.length >= 3) { // At least date, description, and amount
                console.log('Matched bank schema by headers:', schema.name);
                return schema;
            }
        }

        console.log('No bank schema matched - file type not configured for import');
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
                    console.log('CSV file loaded, length:', csv.length);
                    
                    const lines = csv.split('\n');
                    console.log('CSV lines split, total lines:', lines.length);
                    
                    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                    console.log('CSV headers extracted:', headers);
                    
                    // Detect bank schema
                    console.log('Detecting bank schema for file:', file.name);
                    let bankSchema = this.detectBank(file.name, headers);
                    console.log('Bank schema detection result:', bankSchema?.name || 'No schema matched');
                    
                    if (!bankSchema) {
                        // Try to create a generic schema as fallback
                        console.log('No predefined schema matched, attempting to create generic schema');
                        const genericSchema = this.createGenericSchema(headers, file.name);
                        if (genericSchema) {
                            console.log('Created generic schema:', genericSchema);
                            bankSchema = genericSchema;
                        } else {
                            observer.error(new Error('This type of file is not configured to be imported. Please check the filename format and try again.'));
                            return;
                        }
                    }

                    // Parse transactions
                    const transactions: CsvTransaction[] = [];
                    const parsingErrors: string[] = [];
                    
                    // Log detailed information about the CSV file
                    console.log('CSV File Analysis:', {
                        filename: file.name,
                        totalLines: lines.length,
                        headers: headers,
                        bankSchema: bankSchema?.name,
                        fieldMapping: bankSchema?.fieldMapping
                    });
                    
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!line) continue;

                        try {
                            const values = this.parseCsvLine(line);
                            if (values.length < 3) {
                                parsingErrors.push(`Row ${i + 1}: Insufficient columns (${values.length} found, need at least 3)`);
                                continue; // Skip invalid lines
                            }

                            // Log first few rows for debugging
                            if (i <= 3) {
                                console.log(`Row ${i + 1} data:`, {
                                    headers,
                                    values,
                                    bankSchema: bankSchema?.name,
                                    fieldMapping: bankSchema?.fieldMapping
                                });
                            }

                            const transaction = this.normalizeTransaction(values, headers, bankSchema);
                            if (transaction) {
                                transactions.push(transaction);
                            } else {
                                parsingErrors.push(`Row ${i + 1}: Failed to normalize transaction data`);
                                // Log detailed failure info for first few rows
                                if (i <= 3) {
                                    console.log(`Row ${i + 1} normalization failed:`, {
                                        headers,
                                        values,
                                        bankSchema: bankSchema?.name,
                                        fieldMapping: bankSchema?.fieldMapping
                                    });
                                }
                            }
                        } catch (error: any) {
                            parsingErrors.push(`Row ${i + 1}: ${error.message || error}`);
                            console.error(`Error parsing line ${i + 1}:`, error);
                        }
                    }

                    // Log parsing errors if any
                    if (parsingErrors.length > 0) {
                        console.warn(`CSV parsing completed with ${parsingErrors.length} errors:`, parsingErrors);
                        
                        // Log parsing errors to error log (async, but don't await in this context)
                        this.errorLogService.logErrorAsync({
                            error_type: 'csv_import',
                            error_category: 'warning',
                            error_code: 'PARSING_ERRORS',
                            error_message: `CSV parsing completed with ${parsingErrors.length} errors`,
                            operation: 'csv_import',
                            component: 'csv-import.service',
                            function_name: 'parseCsvFile',
                            error_data: {
                                filename: file.name,
                                totalLines: lines.length - 1,
                                parsedTransactions: transactions.length,
                                parsingErrors: parsingErrors.slice(0, 10) // Log first 10 errors
                            },
                            file_name: file.name
                        }).catch(error => console.error('Failed to log parsing errors:', error));
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
        
        // Debug logging for CSV parsing
        console.log('CSV line parsed:', {
            originalLine: line,
            parsedValues: values,
            valueCount: values.length
        });
        
        return values;
    }

    /**
     * Normalize transaction data according to bank schema
     */
    private normalizeTransaction(values: string[], headers: string[], schema: BankSchema): CsvTransaction | null {
        try {
            const getValue = (fieldName: string): string => {
                const index = headers.findIndex(h => h.toLowerCase().includes(fieldName.toLowerCase()));
                const value = index >= 0 ? values[index] : '';
                
                // Debug logging for field extraction
                if (schema.name.includes('Fidelity')) {
                    console.log(`Field extraction: ${fieldName}`, {
                        headerIndex: index,
                        headerName: index >= 0 ? headers[index] : 'NOT_FOUND',
                        extractedValue: value,
                        allHeaders: headers,
                        allValues: values
                    });
                }
                
                return value;
            };

            const dateStr = getValue(schema.fieldMapping.date);
            const description = getValue(schema.fieldMapping.description);
            const amountStr = getValue(schema.fieldMapping.amount);
            const merchant = getValue(schema.fieldMapping.merchant || '');
            const category = getValue(schema.fieldMapping.category || '');
            const account = getValue(schema.fieldMapping.account || '');

            // Debug logging for Fidelity files
            if (schema.name.includes('Fidelity')) {
                console.log('Fidelity transaction parsing:', {
                    schemaName: schema.name,
                    headers,
                    values,
                    fieldMapping: schema.fieldMapping,
                    extracted: {
                        dateStr,
                        description,
                        amountStr,
                        merchant,
                        category,
                        account
                    },
                    fieldLookup: {
                        dateIndex: headers.findIndex(h => h === schema.fieldMapping.date),
                        descriptionIndex: headers.findIndex(h => h === schema.fieldMapping.description),
                        amountIndex: headers.findIndex(h => h === schema.fieldMapping.amount)
                    }
                });
            }

            // Debug logging for Marcus files
            if (schema.name === 'Marcus') {
                console.log('Marcus transaction parsing:', {
                    headers,
                    values,
                    fieldMapping: schema.fieldMapping,
                    extracted: {
                        dateStr,
                        description,
                        amountStr,
                        merchant,
                        category,
                        account
                    }
                });
            }

            // Special handling for Augie Export Format - parse concatenated Transaction ID
            if (schema.name === 'Augie Export Format' && dateStr) {
                const parsedData = this.parseAugieTransactionId(dateStr);
                if (parsedData) {
                    console.log('Augie transaction parsing:', {
                        originalTransactionId: dateStr,
                        parsedData
                    });
                    
                    return {
                        date: parsedData.date,
                        description: `Transaction ${parsedData.referenceNumber}`,
                        amount: parsedData.amount,
                        merchant: `Transaction ${parsedData.referenceNumber}`,
                        category: category.trim() || undefined,
                        account: 'Augie Account'
                    };
                }
            }

            if (!dateStr || !description || !amountStr) {
                console.log('Missing required fields:', { 
                    dateStr, 
                    description, 
                    amountStr, 
                    schema: schema.name,
                    fieldMapping: schema.fieldMapping,
                    headers,
                    values
                });
                return null;
            }

            // Parse date
            const date = this.parseDate(dateStr, schema.dateFormat);
            if (!date) {
                console.log('Date parsing failed:', { 
                    dateStr, 
                    format: schema.dateFormat, 
                    schema: schema.name 
                });
                return null;
            }

            // Parse amount
            const amount = this.parseAmount(amountStr, schema.amountFormat);
            if (amount === null) {
                console.log('Amount parsing failed:', { 
                    amountStr, 
                    format: schema.amountFormat, 
                    schema: schema.name 
                });
                return null;
            }

            return {
                date: date.toISOString().split('T')[0],
                description: description.trim(),
                amount,
                merchant: merchant.trim() || undefined,
                category: this.parseCategory(category, schema.name),
                account: account.trim() || undefined
            };
        } catch (error) {
            console.error('Error normalizing transaction:', error);
            return null;
        }
    }

    /**
     * Parse Augie Export Format Transaction ID
     * Format: YYYYMMDD 2787083 2,500 202,509,035,305
     */
    private parseAugieTransactionId(transactionId: string): { date: string; referenceNumber: string; amount: number } | null {
        try {
            const parts = transactionId.trim().split(' ');
            if (parts.length < 4) {
                console.log('Invalid Augie transaction ID format:', transactionId);
                return null;
            }

            const dateStr = parts[0]; // YYYYMMDD
            const referenceNumber = parts[1]; // 2787083
            const amountStr = parts[2]; // 2,500
            // parts[3] is the long reference number (202,509,035,305)

            // Parse date from YYYYMMDD format
            if (dateStr.length !== 8 || !/^\d{8}$/.test(dateStr)) {
                console.log('Invalid date format in Augie transaction ID:', dateStr);
                return null;
            }

            const year = parseInt(dateStr.substring(0, 4));
            const month = parseInt(dateStr.substring(4, 6)) - 1; // JavaScript months are 0-based
            const day = parseInt(dateStr.substring(6, 8));
            const date = new Date(year, month, day);

            if (isNaN(date.getTime())) {
                console.log('Invalid date:', dateStr);
                return null;
            }

            // Parse amount (remove commas and convert to number)
            const amount = parseFloat(amountStr.replace(/,/g, ''));
            if (isNaN(amount)) {
                console.log('Invalid amount:', amountStr);
                return null;
            }

            return {
                date: date.toISOString().split('T')[0], // YYYY-MM-DD format
                referenceNumber,
                amount
            };
        } catch (error) {
            console.error('Error parsing Augie transaction ID:', error);
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
            
            if (format === 'yyyy-MM-dd') {
                // Handle ISO format like 2025-09-12
                const [year, month, day] = dateStr.split('-');
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
            
            if (format === 'M/d/yyyy') {
                // Handle format like 9/3/2025
                const [month, day, year] = dateStr.split('/');
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
            
            if (format === 'MMM dd, yyyy') {
                // Handle format like Sep 15, 2025
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
            
            if (format === 'MMM d, yyyy') {
                // Handle format like Sep 5, 2025 (single digit day)
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
            
            if (format === 'MMM dd yyyy') {
                // Handle format like Sep 15 2025 (no comma)
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
            
            // Try ISO format as fallback
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
     * Parse category string according to bank schema
     */
    private parseCategory(categoryStr: string, bankName: string): string | undefined {
        if (!categoryStr || !categoryStr.trim()) {
            return undefined;
        }

        const category = categoryStr.trim();

        // Handle US Bank numeric category codes
        if (bankName === 'US Bank') {
            // If category is purely numeric, it's likely a category code
            if (/^\d+$/.test(category)) {
                console.log(`US Bank numeric category code detected: ${category}`);
                // Return undefined to let AI categorization handle it
                return undefined;
            }
            
            // If category contains semicolons and numbers, it's likely malformed
            if (category.includes(';') && /\d+/.test(category)) {
                console.log(`US Bank malformed category detected: ${category}`);
                // Extract the first meaningful part or return undefined
                const parts = category.split(';').map(p => p.trim()).filter(p => p && !/^\d+$/.test(p));
                return parts.length > 0 ? parts[0] : undefined;
            }
        }

        // For other banks, return the category as-is
        return category;
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

                // Create import record with user_id
                return from(this.supabaseService.getCurrentUserId()).pipe(
                    switchMap(userId => {
                        const importRecord: Partial<CsvImport> = {
                            user_id: userId,
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
                                return this.processTransactions(transactions, result.data.id, bankSchema.name, file.name);
                            })
                        );
                    }),
                    catchError((error: any) => {
                        if (error.message?.includes('No user is currently authenticated')) {
                            throw new Error('Please log in to import CSV files');
                        }
                        throw error;
                    })
                );
            })
        );
    }

    /**
     * Process and save transactions with enhanced AI categorization
     */
    private async processTransactions(transactions: CsvTransaction[], importId: string, bankSource: string, filename?: string): Promise<CsvImport> {
        const supabase = this.supabaseService.getClient();
        const startTime = Date.now();
        let importedCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        // Extract account owner from filename for specific banks
        const accountOwner = this.extractAccountOwnerFromFilename(filename, bankSource);

        // Process transactions in batches for better performance
        const batchSize = 50; // Increased batch size for better performance
        for (let i = 0; i < transactions.length; i += batchSize) {
            const batch = transactions.slice(i, i + batchSize);
            
            try {
                // Categorize batch of transactions using AI service
                const categorizationResults = await this.aiCategorizationService.batchCategorize(batch).toPromise();
                
                // Prepare all transactions for batch insert
                const transactionsToInsert: Partial<Transaction>[] = [];
                const transactionMetadata: Array<{csvTransaction: CsvTransaction, categorization: any, rowIndex: number}> = [];
                
                for (let j = 0; j < batch.length; j++) {
                    const csvTransaction = batch[j];
                    const categorization = categorizationResults?.[j];
                    
                    try {
                        // Determine account_id - use filename-based owner for specific banks, otherwise use CSV field
                        const accountId = accountOwner || csvTransaction.account || 'unknown';
                        
                        // Check for duplicates before creating transaction record
                        const duplicateCheck = await this.duplicateCheckService.checkForDuplicate(
                            accountId,
                            csvTransaction.date,
                            csvTransaction.amount,
                            csvTransaction.description,
                            'csv',
                            filename || 'unknown.csv'
                        );

                        if (duplicateCheck.isDuplicate) {
                            console.log(`Skipping duplicate transaction: ${csvTransaction.description} on ${csvTransaction.date}`);
                            continue; // Skip this transaction
                        }

                        // Create transaction record
                        const transaction: Partial<Transaction> = {
                            user_id: await this.supabaseService.getCurrentUserId(),
                            account_id: accountId,
                            amount: csvTransaction.amount,
                            date: csvTransaction.date,
                            name: csvTransaction.description,
                            merchant_name: csvTransaction.merchant,
                            category_id: categorization?.categoryId || undefined,
                            category_confidence: categorization?.confidence || 0,
                            bank_source: bankSource.toLowerCase().replace(/\s+/g, '_'),
                            import_method: 'csv',
                            csv_filename: filename || 'unknown.csv',
                            pending: false,
                            iso_currency_code: 'USD'
                        };

                        transactionsToInsert.push(transaction);
                        transactionMetadata.push({
                            csvTransaction,
                            categorization,
                            rowIndex: j
                        });
                    } catch (error: any) {
                        console.error('Error preparing transaction:', error);
                        failedCount++;
                        errors.push(`Transaction ${csvTransaction.description}: ${error.message || error}`);
                        
                        // Log the error to the error log table
                        await this.errorLogService.logErrorAsync({
                            error_type: 'csv_import',
                            error_category: 'error',
                            error_code: error.code,
                            error_message: `Error preparing transaction: ${error.message || error}`,
                            error_stack: error.stack,
                            operation: 'csv_import',
                            component: 'csv-import.service',
                            function_name: 'processTransactions',
                            error_data: {
                                csvTransaction,
                                rowIndex: j,
                                batchIndex: i,
                                originalError: error
                            },
                            file_name: filename,
                            row_number: (i * batchSize) + j + 1,
                            batch_id: importId
                        });
                    }
                }

                // Batch insert all transactions
                if (transactionsToInsert.length > 0) {
                    try {
                        const { data: insertedTransactions, error: insertError } = await supabase
                            .from('hb_transactions')
                            .insert(transactionsToInsert)
                            .select('id');

                        if (insertError) {
                            console.error('Error inserting batch:', insertError);
                            failedCount += transactionsToInsert.length;
                            errors.push(`Batch insert error: ${insertError.message}`);
                            
                            // Log the batch error to the error log table
                            await this.errorLogService.logErrorAsync({
                                error_type: 'csv_import',
                                error_category: 'error',
                                error_code: insertError.code,
                                error_message: `Batch insert error: ${insertError.message}`,
                                error_stack: insertError.stack,
                                operation: 'csv_import',
                                component: 'csv-import.service',
                                function_name: 'processTransactions',
                                error_data: {
                                    batchSize: transactionsToInsert.length,
                                    batchIndex: i,
                                    originalError: insertError
                                },
                                file_name: filename,
                                batch_id: importId
                            });
                        } else {
                            importedCount += insertedTransactions.length;
                            
                            // Store embeddings for AI-categorized transactions
                            for (let k = 0; k < insertedTransactions.length; k++) {
                                const insertedTransaction = insertedTransactions[k];
                                const metadata = transactionMetadata[k];
                                
                                if (metadata.categorization?.method === 'ai_similarity' && insertedTransaction?.id) {
                                    try {
                                        const embedding = await this.aiCategorizationService['generateEmbedding'](metadata.csvTransaction);
                                        if (embedding) {
                                            await this.aiCategorizationService.storeTransactionEmbedding(insertedTransaction.id, embedding);
                                        }
                                    } catch (embeddingError) {
                                        console.error('Error storing embedding:', embeddingError);
                                        // Log embedding error but don't fail the transaction
                                        await this.errorLogService.logErrorAsync({
                                            error_type: 'csv_import',
                                            error_category: 'warning',
                                            error_code: 'EMBEDDING_ERROR',
                                            error_message: `Failed to store embedding for transaction: ${embeddingError}`,
                                            operation: 'csv_import',
                                            component: 'csv-import.service',
                                            function_name: 'processTransactions',
                                            error_data: {
                                                transactionId: insertedTransaction.id,
                                                csvTransaction: metadata.csvTransaction,
                                                originalError: embeddingError
                                            },
                                            file_name: filename,
                                            batch_id: importId
                                        });
                                    }
                                }
                            }
                        }
                    } catch (error: any) {
                        console.error('Error in batch insert:', error);
                        failedCount += transactionsToInsert.length;
                        errors.push(`Batch insert error: ${error.message || error}`);
                        
                        // Log the batch error to the error log table
                        await this.errorLogService.logErrorAsync({
                            error_type: 'csv_import',
                            error_category: 'error',
                            error_code: error.code,
                            error_message: `Batch insert error: ${error.message || error}`,
                            error_stack: error.stack,
                            operation: 'csv_import',
                            component: 'csv-import.service',
                            function_name: 'processTransactions',
                            error_data: {
                                batchSize: transactionsToInsert.length,
                                batchIndex: i,
                                originalError: error
                            },
                            file_name: filename,
                            batch_id: importId
                        });
                    }
                }
            } catch (error: any) {
                console.error('Error processing batch:', error);
                failedCount += batch.length;
                errors.push(`Batch processing error: ${error.message || error}`);
                
                // Log the batch error to the error log table
                await this.errorLogService.logErrorAsync({
                    error_type: 'csv_import',
                    error_category: 'error',
                    error_code: error.code,
                    error_message: `Batch processing error: ${error.message || error}`,
                    error_stack: error.stack,
                    operation: 'csv_import',
                    component: 'csv-import.service',
                    function_name: 'processTransactions',
                    error_data: {
                        batch,
                        batchIndex: i,
                        batchSize: batch.length,
                        originalError: error
                    },
                    file_name: filename,
                    batch_id: importId
                });
            }
        }

        // Check for potential missing transactions
        const expectedRows = transactions.length;
        const actualImported = importedCount + failedCount;
        const missingRows = expectedRows - actualImported;
        
        if (missingRows > 0) {
            const missingMessage = `Warning: ${missingRows} transactions were not processed (expected ${expectedRows}, processed ${actualImported})`;
            errors.push(missingMessage);
            console.warn(missingMessage);
            
            // Log missing transactions warning
            await this.errorLogService.logErrorAsync({
                error_type: 'csv_import',
                error_category: 'warning',
                error_code: 'MISSING_TRANSACTIONS',
                error_message: missingMessage,
                operation: 'csv_import',
                component: 'csv-import.service',
                function_name: 'processTransactions',
                error_data: {
                    expectedRows,
                    actualImported,
                    missingRows,
                    importedCount,
                    failedCount
                },
                file_name: filename,
                batch_id: importId
            });
        }

        // Update import record
        const { data: updatedImport, error: updateError } = await supabase
            .from('hb_csv_imports')
            .update({
                imported_rows: importedCount,
                failed_rows: failedCount,
                status: failedCount === 0 && missingRows === 0 ? 'completed' : 'completed_with_errors',
                error_message: errors.length > 0 ? errors.join('; ') : null,
                processing_time_ms: Date.now() - startTime
            })
            .eq('id', importId)
            .select()
            .single();

        if (updateError || !updatedImport) {
            console.error('Error updating import record:', updateError);
            // Return a fallback object with the counts
            return {
                id: importId,
                imported_rows: importedCount,
                failed_rows: failedCount,
                status: failedCount === 0 ? 'completed' : 'completed_with_errors',
                error_message: errors.length > 0 ? errors.join('; ') : null
            } as CsvImport;
        }

        return updatedImport;
    }

    /**
     * Categorize transaction using rules and AI
     */
    private async categorizeTransaction(transaction: CsvTransaction): Promise<string | null> {
        // First, try to use CSV-provided category
        if (transaction.category) {
            const categoryId = await this.findExistingCategory(transaction.category);
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
     * Find existing category by name - NO AUTO-CREATION
     */
    private async findExistingCategory(categoryName: string): Promise<string | null> {
        const normalizedName = this.normalizeCategoryName(categoryName);
        
        try {
            // Only look for existing categories - never create new ones
            const { data: existingCategory, error: selectError } = await this.supabaseService.getClient()
                .from('hb_transaction_categories')
                .select('id')
                .ilike('name', normalizedName)
                .single();

            if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows found
                console.error('Error finding category:', selectError);
                
                // Log the error to the error log table
                this.errorLogService.logErrorAsync({
                    error_type: 'category_management',
                    error_category: 'warning',
                    error_code: selectError.code,
                    error_message: `Error finding category: ${selectError.message}`,
                    operation: 'category_lookup',
                    component: 'csv-import.service',
                    function_name: 'findExistingCategory',
                    error_data: {
                        categoryName: normalizedName,
                        originalCategoryName: categoryName,
                        selectError
                    }
                }).catch(error => console.error('Failed to log category lookup error:', error));
            }

            if (existingCategory) {
                return existingCategory.id;
            }

            // If no exact match found, try to find a similar category
            console.log(`Category '${normalizedName}' not found, trying to find similar category`);
            return await this.findSimilarCategory(normalizedName);
            
        } catch (error: any) {
            console.error('Unexpected error in findExistingCategory:', error);
            
            // Log the error to the error log table
            this.errorLogService.logErrorAsync({
                error_type: 'category_management',
                error_category: 'error',
                error_code: error.code,
                error_message: `Unexpected error in findExistingCategory: ${error.message || error}`,
                operation: 'category_lookup',
                component: 'csv-import.service',
                function_name: 'findExistingCategory',
                error_data: {
                    categoryName: normalizedName,
                    originalCategoryName: categoryName,
                    error
                }
            }).catch(logError => console.error('Failed to log category lookup error:', logError));
            
            return null;
        }
    }

    /**
     * Find a similar existing category when exact match not found
     */
    private async findSimilarCategory(categoryName: string): Promise<string | null> {
        try {
            // Try to find a category that contains the normalized name or vice versa
            const { data: similarCategories } = await this.supabaseService.getClient()
                .from('hb_transaction_categories')
                .select('id, name')
                .or(`name.ilike.%${categoryName}%,name.ilike.${categoryName}%`)
                .limit(1);

            if (similarCategories && similarCategories.length > 0) {
                console.log(`Found similar category: ${similarCategories[0].name} for ${categoryName}`);
                return similarCategories[0].id;
            }

            // If no similar category found, return null (uncategorized)
            console.log(`No similar category found for: ${categoryName}`);
            return null;
        } catch (error: any) {
            console.error('Error finding similar category:', error);
            return null;
        }
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
     * Create a generic schema when no predefined schema matches
     */
    private createGenericSchema(headers: string[], filename: string): BankSchema | null {
        console.log('Creating generic schema for headers:', headers);
        
        // Try to find common field patterns
        const findField = (patterns: string[]): string | null => {
            for (const pattern of patterns) {
                const found = headers.find(h => h.toLowerCase().includes(pattern.toLowerCase()));
                if (found) return found;
            }
            return null;
        };

        const dateField = findField(['date', 'transaction date', 'run date', 'posting date']);
        const descriptionField = findField(['description', 'action', 'transaction description', 'name', 'memo']);
        const amountField = findField(['amount', 'amount ($)', 'transaction amount', 'value']);
        const categoryField = findField(['category', 'type', 'action', 'memo']);
        const accountField = findField(['account', 'account name', 'account number']);

        if (!dateField || !descriptionField || !amountField) {
            console.log('Generic schema creation failed - missing required fields:', {
                dateField,
                descriptionField,
                amountField,
                headers
            });
            return null;
        }

        // Determine date format by looking at sample data
        let dateFormat = 'MM/dd/yyyy'; // Default
        if (filename.toLowerCase().includes('fidelity') || filename.toLowerCase().includes('history_for_account')) {
            dateFormat = 'MM/dd/yyyy';
        }

        const schema: BankSchema = {
            name: 'Generic Schema',
            patterns: ['generic'],
            fieldMapping: {
                date: dateField,
                description: descriptionField,
                amount: amountField,
                merchant: descriptionField,
                category: categoryField || undefined,
                account: accountField || undefined
            },
            dateFormat: dateFormat,
            amountFormat: 'positive_negative'
        };

        console.log('Created generic schema:', schema);
        return schema;
    }

    /**
     * Extract account owner from filename for specific banks
     */
    private extractAccountOwnerFromFilename(filename: string | undefined, bankSource: string): string | null {
        if (!filename) return null;

        const filenameLower = filename.toLowerCase();

        // Handle Credit Card files
        if (filenameLower.startsWith('credit card')) {
            return 'Credit Card';
        }

        // Handle ExportedTransactions files (FirstTech CU)
        if (filenameLower.startsWith('exportedtransactions')) {
            // Extract name from "ExportedTransactionsMelissa.csv" -> "Melissa"
            const match = filename.match(/ExportedTransactions(.+)\.csv$/i);
            if (match && match[1]) {
                const extractedName = match[1].trim();
                // Special case for Augie files - return a formatted account name
                if (extractedName.toLowerCase() === 'augie') {
                    return 'FirstTech CU - Augie';
                }
                return extractedName;
            }
        }

        // Handle History_for_Account files (Fidelity Bank)
        if (filenameLower.startsWith('history_for_account')) {
            // Extract account type from filename based on account number patterns
            if (filenameLower.includes('x66402850')) {
                return 'CHECKING';
            } else if (filenameLower.includes('x67992518')) {
                return 'BACK UP CHECKING';
            }
            // Fallback for other Fidelity files
            return 'Fidelity Account';
        }

        // Handle Marcus files
        if (filenameLower === 'marcus' || filenameLower.includes('marcus')) {
            return 'Saving';
        }

        // Handle legacy FirstTech CU files
        if (bankSource.toLowerCase().includes('firsttech')) {
            // Extract name from "ExportedTransactionsMelissa.csv" -> "Melissa"
            const match = filename.match(/ExportedTransactions(.+)\.csv$/i);
            if (match && match[1]) {
                const extractedName = match[1].trim();
                // Special case for Augie files - return a formatted account name
                if (extractedName.toLowerCase() === 'augie') {
                    return 'FirstTech CU - Augie';
                }
                return extractedName;
            }
        }

        // Handle legacy Fidelity Bank files
        if (bankSource.toLowerCase().includes('fidelity')) {
            // Extract account type from filename based on account number patterns
            if (filenameLower.includes('x66402850')) {
                return 'CHECKING';
            } else if (filenameLower.includes('x67992518')) {
                return 'BACK UP CHECKING';
            }
            // Fallback for other Fidelity files
            return 'Fidelity Account';
        }

        // Handle Marcus files by bank source
        if (bankSource.toLowerCase().includes('marcus')) {
            return 'Saving';
        }

        return null;
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