import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface MatchingPattern {
    id?: string;
    transaction_pattern: string;
    bill_pattern: string;
    confidence_score: number;
    match_count: number;
    created_at?: string;
    updated_at?: string;
}

export interface MatchResult {
    transactionId: string;
    billId: string;
    confidence: number;
    reason: string;
    transactionDescription: string;
    billName: string;
    amountMatch: boolean;
}

export interface AutoMatchConfig {
    confidenceThreshold: number;
    batchSize: number;
    enableAmountMatching: boolean;
    amountTolerance: number;
    enableDateMatching: boolean;
    dateToleranceDays: number;
}

@Injectable({
    providedIn: 'root'
})
export class AiMatchingService {
    private defaultConfig: AutoMatchConfig = {
        confidenceThreshold: 80,
        batchSize: 500,
        enableAmountMatching: true,
        amountTolerance: 0.01, // $0.01 tolerance
        enableDateMatching: false,
        dateToleranceDays: 7
    };

    constructor(private supabaseService: SupabaseService) {}

    /**
     * Get current matching configuration
     */
    getConfig(): AutoMatchConfig {
        return { ...this.defaultConfig };
    }

    /**
     * Update matching configuration
     */
    updateConfig(config: Partial<AutoMatchConfig>): void {
        this.defaultConfig = { ...this.defaultConfig, ...config };
    }

    /**
     * Process transactions for auto-matching in batches
     */
    async processTransactionsForMatching(
        transactions: any[], 
        bills: any[], 
        config?: Partial<AutoMatchConfig>
    ): Promise<MatchResult[]> {
        const finalConfig = { ...this.defaultConfig, ...config };
        const results: MatchResult[] = [];
        
        // Process in batches
        for (let i = 0; i < transactions.length; i += finalConfig.batchSize) {
            const batch = transactions.slice(i, i + finalConfig.batchSize);
            const batchResults = await this.processBatch(batch, bills, finalConfig);
            results.push(...batchResults);
        }
        
        return results;
    }

    /**
     * Process a batch of transactions
     */
    private async processBatch(
        transactions: any[], 
        bills: any[], 
        config: AutoMatchConfig
    ): Promise<MatchResult[]> {
        const results: MatchResult[] = [];
        
        for (const transaction of transactions) {
            if (transaction.bill_id) {
                continue; // Skip already matched transactions
            }
            
            const bestMatch = await this.findBestMatch(transaction, bills, config);
            if (bestMatch && bestMatch.confidence >= config.confidenceThreshold) {
                results.push(bestMatch);
            }
        }
        
        return results;
    }

    /**
     * Find the best matching bill for a transaction
     */
    private async findBestMatch(
        transaction: any, 
        bills: any[], 
        config: AutoMatchConfig
    ): Promise<MatchResult | null> {
        let bestMatch: MatchResult | null = null;
        let highestConfidence = 0;
        
        for (const bill of bills) {
            const confidence = await this.calculateMatchingConfidence(transaction, bill, config);
            
            if (confidence > highestConfidence && confidence >= config.confidenceThreshold) {
                highestConfidence = confidence;
                bestMatch = {
                    transactionId: transaction.id,
                    billId: bill.id,
                    confidence,
                    reason: this.generateMatchReason(transaction, bill, confidence),
                    transactionDescription: transaction.name || transaction.description,
                    billName: bill.account?.name || bill.merchant,
                    amountMatch: this.checkAmountMatch(transaction, bill, config)
                };
            }
        }
        
        return bestMatch;
    }

    /**
     * Calculate matching confidence between transaction and bill
     */
    private async calculateMatchingConfidence(
        transaction: any, 
        bill: any, 
        config: AutoMatchConfig
    ): Promise<number> {
        let totalScore = 0;
        let maxScore = 0;
        
        // 1. Description similarity (40% weight)
        const descriptionScore = this.calculateDescriptionSimilarity(
            transaction.name || transaction.description,
            bill.account?.name || bill.merchant
        );
        totalScore += descriptionScore * 0.4;
        maxScore += 0.4;
        
        // 2. Amount matching (30% weight)
        if (config.enableAmountMatching) {
            const amountScore = this.checkAmountMatch(transaction, bill, config) ? 1 : 0;
            totalScore += amountScore * 0.3;
        }
        maxScore += 0.3;
        
        // 3. Historical pattern matching (20% weight)
        const patternScore = await this.calculatePatternMatch(transaction, bill);
        totalScore += patternScore * 0.2;
        maxScore += 0.2;
        
        // 4. Date proximity (10% weight)
        if (config.enableDateMatching) {
            const dateScore = this.calculateDateProximity(transaction, bill, config);
            totalScore += dateScore * 0.1;
        }
        maxScore += 0.1;
        
        // Normalize to 0-100 scale
        return Math.round((totalScore / maxScore) * 100);
    }

    /**
     * Calculate description similarity using fuzzy string matching
     */
    private calculateDescriptionSimilarity(desc1: string, desc2: string): number {
        if (!desc1 || !desc2) return 0;
        
        const str1 = desc1.toLowerCase().trim();
        const str2 = desc2.toLowerCase().trim();
        
        // Exact match
        if (str1 === str2) return 1.0;
        
        // Contains match
        if (str1.includes(str2) || str2.includes(str1)) return 0.8;
        
        // Word overlap scoring
        const words1 = str1.split(/\s+/);
        const words2 = str2.split(/\s+/);
        const commonWords = words1.filter(word => words2.includes(word));
        const overlapRatio = commonWords.length / Math.max(words1.length, words2.length);
        
        // Levenshtein distance similarity
        const levenshteinSimilarity = 1 - (this.levenshteinDistance(str1, str2) / Math.max(str1.length, str2.length));
        
        // Combine word overlap and levenshtein similarity
        return Math.max(overlapRatio * 0.6, levenshteinSimilarity * 0.4);
    }

    /**
     * Check if transaction amount matches bill amount
     */
    private checkAmountMatch(transaction: any, bill: any, config: AutoMatchConfig): boolean {
        if (!config.enableAmountMatching) return false;
        
        const transactionAmount = Math.abs(transaction.amount || 0);
        const billAmount = Math.abs(bill.amount || bill.amount_due || 0);
        
        if (transactionAmount === 0 || billAmount === 0) return false;
        
        const difference = Math.abs(transactionAmount - billAmount);
        return difference <= config.amountTolerance;
    }

    /**
     * Calculate pattern match based on historical data
     */
    private async calculatePatternMatch(transaction: any, bill: any): Promise<number> {
        try {
            const { data: patterns } = await this.supabaseService.getClient()
                .from('hb_matching_patterns')
                .select('*')
                .or(`transaction_pattern.ilike.%${transaction.name || transaction.description}%,bill_pattern.ilike.%${bill.account?.name || bill.merchant}%`);
            
            if (!patterns || patterns.length === 0) return 0;
            
            // Calculate average confidence of matching patterns
            const avgConfidence = patterns.reduce((sum: number, pattern: any) => sum + pattern.confidence_score, 0) / patterns.length;
            return avgConfidence / 100; // Normalize to 0-1 scale
        } catch (error) {
            console.error('Error calculating pattern match:', error);
            return 0;
        }
    }

    /**
     * Calculate date proximity score
     */
    private calculateDateProximity(transaction: any, bill: any, config: AutoMatchConfig): number {
        if (!config.enableDateMatching) return 0;
        
        const transactionDate = new Date(transaction.date);
        const billDueDate = new Date(bill.due_date);
        
        const diffDays = Math.abs((transactionDate.getTime() - billDueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays <= config.dateToleranceDays) {
            return 1 - (diffDays / config.dateToleranceDays);
        }
        
        return 0;
    }

    /**
     * Generate human-readable reason for match
     */
    private generateMatchReason(transaction: any, bill: any, confidence: number): string {
        const reasons = [];
        
        if (confidence >= 90) reasons.push('Strong similarity');
        else if (confidence >= 80) reasons.push('Good similarity');
        else reasons.push('Moderate similarity');
        
        if (this.checkAmountMatch(transaction, bill, this.defaultConfig)) {
            reasons.push('Amount matches');
        }
        
        return reasons.join(', ');
    }

    /**
     * Learn from existing manual matches to build patterns
     */
    async buildMatchingPatterns(): Promise<void> {
        try {
            const { data: manualMatches } = await this.supabaseService.getClient()
                .from('hb_transactions')
                .select(`
                    name,
                    description,
                    bill:hb_bills!inner(
                        account:hb_accounts!inner(name)
                    )
                `)
                .not('bill_id', 'is', null)
                .eq('match_method', 'manual');
            
            if (!manualMatches) return;
            
            for (const match of manualMatches) {
                await this.createOrUpdatePattern(
                    match.name || match.description,
                    (match.bill as any)?.account?.name || (match.bill as any)?.merchant,
                    95 // High confidence for manual matches
                );
            }
            
            console.log(`Built ${manualMatches.length} matching patterns from manual matches`);
        } catch (error) {
            console.error('Error building matching patterns:', error);
        }
    }

    /**
     * Create or update a matching pattern
     */
    private async createOrUpdatePattern(
        transactionPattern: string, 
        billPattern: string, 
        confidence: number
    ): Promise<void> {
        try {
            const { data: existing } = await this.supabaseService.getClient()
                .from('hb_matching_patterns')
                .select('*')
                .eq('transaction_pattern', transactionPattern)
                .eq('bill_pattern', billPattern);
            
            if (existing && existing.length > 0) {
                // Update existing pattern
                await this.supabaseService.getClient()
                    .from('hb_matching_patterns')
                    .update({
                        confidence_score: Math.max(existing[0].confidence_score, confidence),
                        match_count: existing[0].match_count + 1,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing[0].id);
            } else {
                // Create new pattern
                await this.supabaseService.getClient()
                    .from('hb_matching_patterns')
                    .insert({
                        transaction_pattern: transactionPattern,
                        bill_pattern: billPattern,
                        confidence_score: confidence,
                        match_count: 1
                    });
            }
        } catch (error) {
            console.error('Error creating/updating pattern:', error);
        }
    }

    /**
     * Apply approved matches to transactions
     */
    async applyMatches(matches: MatchResult[]): Promise<void> {
        for (const match of matches) {
            try {
                await this.supabaseService.getClient()
                    .from('hb_transactions')
                    .update({
                        bill_id: match.billId,
                        match_method: 'auto',
                        match_confidence: match.confidence,
                        match_timestamp: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', match.transactionId);
                
                // Update pattern with successful match
                await this.createOrUpdatePattern(
                    match.transactionDescription,
                    match.billName,
                    match.confidence
                );
            } catch (error) {
                console.error(`Error applying match for transaction ${match.transactionId}:`, error);
            }
        }
    }

    /**
     * Levenshtein distance calculation
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
}
