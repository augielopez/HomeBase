import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Transaction, TransactionCategory } from '../../interfaces';
import { Observable, from, map, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ErrorLogService } from './error-log.service';

export interface CategorizationResult {
    categoryId: string | null;
    confidence: number;
    method: 'csv' | 'rules' | 'ai_similarity' | 'openai' | 'default';
    matchedTransaction?: Transaction;
    similarity?: number;
}

export interface EmbeddingRequest {
    text: string;
    model?: string;
}

@Injectable({
    providedIn: 'root'
})
export class AiCategorizationService {
    private readonly OPENAI_API_KEY = environment.openaiApiKey;
    private readonly OPENAI_API_URL = `${environment.openaiApiUrl}/embeddings`;
    private readonly SIMILARITY_THRESHOLD = 0.8;
    private readonly MAX_SIMILAR_RESULTS = 5;

    constructor(
        private supabaseService: SupabaseService,
        private errorLogService: ErrorLogService
    ) {}

    /**
     * Categorize a transaction using multiple methods
     */
    categorizeTransaction(transaction: any): Observable<CategorizationResult> {
        return from(this.categorizeWithMultipleMethods(transaction));
    }

    /**
     * Categorize using multiple methods in order of preference
     */
    private async categorizeWithMultipleMethods(transaction: any): Promise<CategorizationResult> {
        // 1. Check if CSV provided category
        if (transaction.category && typeof transaction.category === 'string' && transaction.category.trim()) {
            try {
                const categoryId = await this.findOrCreateCategory(transaction.category);
                if (categoryId) {
                    return {
                        categoryId,
                        confidence: 1.0,
                        method: 'csv'
                    };
                }
            } catch (error) {
                console.error('Error processing CSV category:', error);
                // Continue to other categorization methods if CSV category fails
            }
        }

        // 2. Apply rules-based categorization
        const rulesResult = await this.applyCategorizationRules(transaction);
        if (rulesResult.categoryId) {
            return rulesResult;
        }

        // 3. AI similarity search
        const similarityResult = await this.aiSimilaritySearch(transaction);
        if (similarityResult.categoryId && similarityResult.confidence > 0.7) {
            return similarityResult;
        }

        // 4. OpenAI categorization (if enabled and API key configured)
        try {
            const openaiResult = await this.openaiCategorization(transaction);
            if (openaiResult.categoryId) {
                return openaiResult;
            }
        } catch (error: any) {
            // If OpenAI fails due to rate limits or other errors, continue to default
            console.log('OpenAI categorization failed, using default category:', error.message);
        }

        // 5. Default category
        return {
            categoryId: await this.getDefaultCategoryId(),
            confidence: 0.0,
            method: 'default'
        };
    }

    /**
     * Apply user-defined categorization rules
     */
    private async applyCategorizationRules(transaction: any): Promise<CategorizationResult> {
        const { data: rules, error } = await this.supabaseService.getClient()
            .from('hb_categorization_rules')
            .select('*')
            .eq('is_active', true)
            .order('priority', { ascending: false });

        if (error || !rules) {
            return { categoryId: null, confidence: 0, method: 'rules' };
        }

        for (const rule of rules) {
            if (this.matchesRule(transaction, rule)) {
                return {
                    categoryId: rule.category_id,
                    confidence: 0.9,
                    method: 'rules'
                };
            }
        }

        return { categoryId: null, confidence: 0, method: 'rules' };
    }

    /**
     * Check if transaction matches a categorization rule
     */
    private matchesRule(transaction: any, rule: any): boolean {
        const conditions = rule.rule_conditions || {};
        
        switch (rule.rule_type) {
            case 'keyword':
                if (!conditions.keywords || !Array.isArray(conditions.keywords)) {
                    return false;
                }
                const searchText = `${transaction.name} ${transaction.description || ''} ${transaction.merchant_name || ''}`.toLowerCase();
                return conditions.keywords.some((keyword: string) => 
                    searchText.includes(keyword.toLowerCase())
                );
            
            case 'merchant':
                if (!conditions.merchants || !Array.isArray(conditions.merchants)) {
                    return false;
                }
                return conditions.merchants.some((merchant: string) => 
                    transaction.merchant_name?.toLowerCase().includes(merchant.toLowerCase()) ||
                    transaction.name.toLowerCase().includes(merchant.toLowerCase())
                );
            
            case 'amount_range':
                if (typeof conditions.min_amount !== 'number' || typeof conditions.max_amount !== 'number') {
                    return false;
                }
                const amount = Math.abs(transaction.amount);
                return amount >= conditions.min_amount && amount <= conditions.max_amount;
            
            default:
                return false;
        }
    }

    /**
     * AI similarity search using vector embeddings
     */
    private async aiSimilaritySearch(transaction: any): Promise<CategorizationResult> {
        try {
            // Generate embedding for the transaction
            const embedding = await this.generateEmbedding(transaction);
            if (!embedding) {
                return { categoryId: null, confidence: 0, method: 'ai_similarity' };
            }

            // Search for similar transactions
            const { data: similarTransactions, error } = await this.supabaseService.getClient()
                .rpc('match_transactions', {
                    query_embedding: embedding,
                    match_threshold: this.SIMILARITY_THRESHOLD,
                    match_count: this.MAX_SIMILAR_RESULTS
                });

            if (error || !similarTransactions || similarTransactions.length === 0) {
                return { categoryId: null, confidence: 0, method: 'ai_similarity' };
            }

            // Find the most common category among similar transactions
            const categoryCounts = new Map<string, { count: number; totalSimilarity: number }>();
            
            similarTransactions.forEach((similar: any) => {
                if (similar.category_id) {
                    const current = categoryCounts.get(similar.category_id) || { count: 0, totalSimilarity: 0 };
                    categoryCounts.set(similar.category_id, {
                        count: current.count + 1,
                        totalSimilarity: current.totalSimilarity + similar.similarity
                    });
                }
            });

            // Find the category with highest count and average similarity
            let bestCategory: string | null = null;
            let bestConfidence = 0;

            categoryCounts.forEach((stats, categoryId) => {
                const avgSimilarity = stats.totalSimilarity / stats.count;
                const confidence = (stats.count / similarTransactions.length) * avgSimilarity;
                
                if (confidence > bestConfidence) {
                    bestConfidence = confidence;
                    bestCategory = categoryId;
                }
            });

            return {
                categoryId: bestCategory,
                confidence: bestConfidence,
                method: 'ai_similarity',
                matchedTransaction: similarTransactions[0],
                similarity: bestConfidence
            };

        } catch (error) {
            console.error('Error in AI similarity search:', error);
            return { categoryId: null, confidence: 0, method: 'ai_similarity' };
        }
    }

    /**
     * Generate embedding for transaction text
     */
    private async generateEmbedding(transaction: any): Promise<number[] | null> {
        try {
            const text = `${transaction.name} ${transaction.description || ''} ${transaction.merchant_name || ''}`.trim();
            
            if (!text) {
                return null;
            }

            const response = await fetch(this.OPENAI_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    input: text,
                    model: 'text-embedding-ada-002'
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            return data.data[0].embedding;

        } catch (error) {
            console.error('Error generating embedding:', error);
            return null;
        }
    }

    /**
     * OpenAI-based categorization
     */
    private async openaiCategorization(transaction: any): Promise<CategorizationResult> {
        // Check if OpenAI API key is properly configured
        if (!this.OPENAI_API_KEY || 
            this.OPENAI_API_KEY === 'your-openai-api-key-here' || 
            this.OPENAI_API_KEY === '<REDACTED>' ||
            this.OPENAI_API_KEY.trim() === '') {
            console.log('OpenAI API key not configured, skipping OpenAI categorization');
            return { categoryId: null, confidence: 0, method: 'openai' };
        }

        const categories = await this.getAvailableCategories();
        if (!categories || categories.length === 0) {
            return { categoryId: null, confidence: 0, method: 'openai' };
        }

        const prompt = this.buildCategorizationPrompt(transaction, categories);
        const response = await this.callOpenAI(prompt);
        
        if (response) {
            const categoryName = this.extractCategoryFromResponse(response);
            const category = categories.find(c => 
                c.name.toLowerCase() === categoryName.toLowerCase()
            );
            
            if (category) {
                return {
                    categoryId: category.id,
                    confidence: 0.8,
                    method: 'openai'
                };
            }
        }
        
        return { categoryId: null, confidence: 0, method: 'openai' };
    }

    /**
     * Build prompt for OpenAI categorization
     */
    private buildCategorizationPrompt(transaction: any, categories: TransactionCategory[]): string {
        const categoryList = categories.map(c => c.name).join(', ');
        
        return `Categorize this transaction into one of the following categories: ${categoryList}

Transaction details:
- Name: ${transaction.name}
- Description: ${transaction.description || 'N/A'}
- Merchant: ${transaction.merchant_name || 'N/A'}
- Amount: $${Math.abs(transaction.amount).toFixed(2)}

Please respond with only the category name from the list above.`;
    }

    /**
     * Call OpenAI API
     */
    private async callOpenAI(prompt: string): Promise<string | null> {
        try {
            const response = await fetch(`${environment.openaiApiUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 50,
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content?.trim() || null;

        } catch (error: any) {
            console.error('Error calling OpenAI:', error);
            
            // Handle specific error types
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                throw new Error('Network error: Unable to connect to OpenAI API');
            } else if (error.message.includes('401')) {
                throw new Error('OpenAI API key is invalid or expired');
            } else if (error.message.includes('429')) {
                throw new Error('OpenAI API rate limit exceeded');
            } else {
                throw error;
            }
        }
    }

    /**
     * Extract category name from OpenAI response
     */
    private extractCategoryFromResponse(response: string): string {
        // Clean up the response and extract just the category name
        return response.replace(/[^\w\s&]/g, '').trim();
    }

    /**
     * Find or create a category by name
     */
    private async findOrCreateCategory(categoryName: string): Promise<string | null> {
        const normalizedName = this.normalizeCategoryName(categoryName);
        
        try {
            // First, try to find existing category
            const { data: existingCategory, error: selectError } = await this.supabaseService.getClient()
                .from('hb_transaction_categories')
                .select('id')
                .ilike('name', normalizedName)
                .single();

            if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows found
                console.error('Error finding category:', selectError);
            }

            if (existingCategory) {
                return existingCategory.id;
            }

            // Create new category if not found
            const { data: newCategory, error: insertError } = await this.supabaseService.getClient()
                .from('hb_transaction_categories')
                .insert({
                    name: normalizedName,
                    description: `Auto-created from CSV import: ${categoryName}`,
                    created_by: 'SYSTEM'
                })
                .select('id')
                .single();

            if (insertError) {
                console.error('Error creating category:', insertError);
                
                // Log the error to the error log table
                await this.errorLogService.logErrorAsync({
                    error_type: 'category_management',
                    error_category: insertError.code === '42501' ? 'critical' : 'error',
                    error_code: insertError.code,
                    error_message: `Failed to create category: ${insertError.message}`,
                    error_stack: insertError.stack || undefined,
                    operation: 'category_creation',
                    component: 'ai-categorization.service',
                    function_name: 'findOrCreateCategory',
                    error_data: {
                        categoryName: normalizedName,
                        originalCategoryName: categoryName,
                        insertError
                    }
                });
                
                // If we can't create a new category due to RLS policy, try to find a similar existing category
                if (insertError.code === '42501' || insertError.message.includes('row-level security')) {
                    console.log('RLS policy violation - trying to find similar existing category');
                    return await this.findSimilarCategory(normalizedName);
                }
                
                return null;
            }

            return newCategory?.id || null;
        } catch (error: any) {
            console.error('Unexpected error in findOrCreateCategory:', error);
            
            // Log the error to the error log table
            await this.errorLogService.logErrorAsync({
                error_type: 'category_management',
                error_category: 'error',
                error_code: error.code,
                error_message: `Unexpected error in findOrCreateCategory: ${error.message || error}`,
                error_stack: error.stack,
                operation: 'category_creation',
                component: 'ai-categorization.service',
                function_name: 'findOrCreateCategory',
                error_data: {
                    categoryName: normalizedName,
                    originalCategoryName: categoryName,
                    originalError: error
                }
            });
            
            return null;
        }
    }

    /**
     * Find a similar existing category when we can't create a new one
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

            // If no similar category found, try to get a default "Other" category
            const { data: defaultCategory } = await this.supabaseService.getClient()
                .from('hb_transaction_categories')
                .select('id')
                .ilike('name', 'Other')
                .single();

            if (defaultCategory) {
                console.log(`Using default "Other" category for ${categoryName}`);
                return defaultCategory.id;
            }

            // If no "Other" category exists, get the first available category
            const { data: anyCategory } = await this.supabaseService.getClient()
                .from('hb_transaction_categories')
                .select('id')
                .limit(1)
                .single();

            if (anyCategory) {
                console.log(`Using fallback category for ${categoryName}`);
                return anyCategory.id;
            }

            return null;
        } catch (error) {
            console.error('Error finding similar category:', error);
            return null;
        }
    }

    /**
     * Normalize category name
     */
    private normalizeCategoryName(name: string): string {
        return name
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Get available categories
     */
    private async getAvailableCategories(): Promise<TransactionCategory[]> {
        const { data: categories, error } = await this.supabaseService.getClient()
            .from('hb_transaction_categories')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) {
            console.error('Error fetching categories:', error);
            return [];
        }

        return categories || [];
    }

    /**
     * Get default category ID
     */
    private async getDefaultCategoryId(): Promise<string | null> {
        const { data: defaultCategory, error } = await this.supabaseService.getClient()
            .from('hb_transaction_categories')
            .select('id')
            .eq('name', 'Other')
            .single();

        if (error) {
            console.error('Error fetching default category:', error);
            return null;
        }

        return defaultCategory?.id || null;
    }

    /**
     * Store embedding for a transaction
     */
    async storeTransactionEmbedding(transactionId: string, embedding: number[]): Promise<boolean> {
        try {
            const { error } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .update({ embedding })
                .eq('id', transactionId);

            if (error) {
                console.error('Error storing embedding:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error storing embedding:', error);
            return false;
        }
    }

    /**
     * Batch categorize multiple transactions
     */
    batchCategorize(transactions: any[]): Observable<CategorizationResult[]> {
        return from(Promise.all(transactions.map(t => this.categorizeWithMultipleMethods(t))));
    }

    /**
     * Re-categorize all existing transactions for the current user
     */
    async recategorizeAllTransactions(): Promise<{ success: boolean; processed: number; errors: number }> {
        try {
            const userId = await this.supabaseService.getCurrentUserId();
            
            // Get all transactions for the current user
            const { data: transactions, error: fetchError } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false });

            if (fetchError) throw fetchError;
            if (!transactions || transactions.length === 0) {
                return { success: true, processed: 0, errors: 0 };
            }

            let processed = 0;
            let errors = 0;
            let openaiRateLimited = false;

            // Process transactions in batches to avoid overwhelming the system
            const batchSize = 5; // Reduced batch size for better rate limiting
            for (let i = 0; i < transactions.length; i += batchSize) {
                const batch = transactions.slice(i, i + batchSize);
                
                for (const transaction of batch) {
                    try {
                        // Skip OpenAI if we've hit rate limits
                        if (openaiRateLimited) {
                            // Temporarily disable OpenAI for this transaction
                            const result = await this.categorizeWithMultipleMethodsRateLimited(transaction);
                            
                            if (result.categoryId) {
                                const { error: updateError } = await this.supabaseService.getClient()
                                    .from('hb_transactions')
                                    .update({ 
                                        category_id: result.categoryId,
                                        updated_at: new Date().toISOString()
                                    })
                                    .eq('id', transaction.id);

                                if (updateError) {
                                    console.error('Error updating transaction:', updateError);
                                    errors++;
                                } else {
                                    processed++;
                                }
                            } else {
                                errors++;
                            }
                        } else {
                            // Normal categorization with OpenAI
                            const result = await this.categorizeWithMultipleMethods(transaction);
                            
                            if (result.categoryId) {
                                const { error: updateError } = await this.supabaseService.getClient()
                                    .from('hb_transactions')
                                    .update({ 
                                        category_id: result.categoryId,
                                        updated_at: new Date().toISOString()
                                    })
                                    .eq('id', transaction.id);

                                if (updateError) {
                                    console.error('Error updating transaction:', updateError);
                                    errors++;
                                } else {
                                    processed++;
                                }
                            } else {
                                errors++;
                            }
                        }
                    } catch (error: any) {
                        console.error('Error processing transaction:', error);
                        
                        // Check if it's a rate limit error
                        if (error.message && error.message.includes('429')) {
                            console.log('OpenAI rate limit hit, switching to rate-limited mode');
                            openaiRateLimited = true;
                        }
                        
                        errors++;
                    }
                }

                // Longer delay between batches to respect rate limits
                if (i + batchSize < transactions.length) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
                }
            }

            return { success: true, processed, errors };
        } catch (error) {
            console.error('Error in recategorizeAllTransactions:', error);
            return { success: false, processed: 0, errors: 1 };
        }
    }

    /**
     * Categorize using multiple methods but skip OpenAI to avoid rate limits
     */
    private async categorizeWithMultipleMethodsRateLimited(transaction: any): Promise<CategorizationResult> {
        // 1. Check if CSV provided category
        if (transaction.category && transaction.category.trim()) {
            const categoryId = await this.findOrCreateCategory(transaction.category);
            if (categoryId) {
                return {
                    categoryId,
                    confidence: 1.0,
                    method: 'csv'
                };
            }
        }

        // 2. Apply rules-based categorization
        const rulesResult = await this.applyCategorizationRules(transaction);
        if (rulesResult.categoryId) {
            return rulesResult;
        }

        // 3. AI similarity search
        const similarityResult = await this.aiSimilaritySearch(transaction);
        if (similarityResult.categoryId && similarityResult.confidence > 0.7) {
            return similarityResult;
        }

        // 4. Skip OpenAI categorization to avoid rate limits
        // 5. Default category
        return {
            categoryId: await this.getDefaultCategoryId(),
            confidence: 0.0,
            method: 'default'
        };
    }
} 