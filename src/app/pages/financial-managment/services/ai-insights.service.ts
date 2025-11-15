import { Injectable } from '@angular/core';
import { SupabaseService } from '../../service/supabase.service';
import { Transaction, TransactionCategory } from '../interfaces';
import { Observable, from, map, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface SpendingInsight {
    type: 'budget_leak' | 'subscription' | 'anomaly' | 'trend' | 'recommendation';
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    amount?: number;
    percentage?: number;
    category?: string;
    transactions?: Transaction[];
}

export interface MonthlySpendingSummary {
    totalSpent: number;
    totalIncome: number;
    netAmount: number;
    transactionCount: number;
    categoryBreakdown: {
        category: string;
        amount: number;
        percentage: number;
        transactionCount: number;
    }[];
    topCategories: string[];
    insights: SpendingInsight[];
}

@Injectable({
    providedIn: 'root'
})
export class AiInsightsService {
    private readonly OPENAI_API_KEY = environment.openaiApiKey;
    private readonly OPENAI_API_URL = environment.openaiApiUrl + '/chat/completions';
    private lastApiCall = 0;
    private readonly RATE_LIMIT_DELAY = 2000; // 2 seconds between calls
    private aiInsightsDisabled = false;
    private disableUntil = 0;

    constructor(private supabaseService: SupabaseService) {}

    /**
     * Generate comprehensive spending insights for a month
     */
    generateMonthlyInsights(year: number, month: number): Observable<MonthlySpendingSummary> {
        const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        return from(this.getTransactionsForPeriod(startDate, endDate)).pipe(
            switchMap(transactions => {
                const summary = this.calculateSpendingSummary(transactions);
                return from(this.generateAiInsights(summary)).pipe(
                    map(insights => ({
                        ...summary,
                        insights
                    }))
                );
            })
        );
    }

    /**
     * Get transactions for a date period
     */
    private async getTransactionsForPeriod(startDate: string, endDate: string): Promise<Transaction[]> {
        const { data: transactions, error } = await this.supabaseService.getClient()
            .from('hb_transactions')
            .select(`
                *,
                category:category_id(*)
            `)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });

        if (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }

        return transactions || [];
    }

    /**
     * Calculate basic spending summary
     */
    private calculateSpendingSummary(transactions: Transaction[]): MonthlySpendingSummary {
        const expenses = transactions.filter(t => t.amount < 0);
        const income = transactions.filter(t => t.amount > 0);

        const totalSpent = Math.abs(expenses.reduce((sum, t) => sum + t.amount, 0));
        const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
        const netAmount = totalIncome - totalSpent;

        // Calculate category breakdown
        const categoryMap = new Map<string, { amount: number; count: number }>();
        
        expenses.forEach(transaction => {
            const categoryName = transaction.category?.name || 'Uncategorized';
            const current = categoryMap.get(categoryName) || { amount: 0, count: 0 };
            categoryMap.set(categoryName, {
                amount: current.amount + Math.abs(transaction.amount),
                count: current.count + 1
            });
        });

        const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
            category,
            amount: data.amount,
            percentage: (data.amount / totalSpent) * 100,
            transactionCount: data.count
        })).sort((a, b) => b.amount - a.amount);

        const topCategories = categoryBreakdown.slice(0, 5).map(c => c.category);

        return {
            totalSpent,
            totalIncome,
            netAmount,
            transactionCount: transactions.length,
            categoryBreakdown,
            topCategories,
            insights: []
        };
    }

    /**
     * Generate AI-powered insights
     */
    private async generateAiInsights(summary: MonthlySpendingSummary): Promise<SpendingInsight[]> {
        const insights: SpendingInsight[] = [];

        // Check if OpenAI API key is configured and AI insights are enabled
        const aiInsightsEnabled = this.OPENAI_API_KEY && 
                                 this.OPENAI_API_KEY !== 'your-openai-api-key' &&
                                 this.OPENAI_API_KEY.length > 10 &&
                                 !this.aiInsightsDisabled &&
                                 Date.now() > this.disableUntil;

        if (!aiInsightsEnabled) {
            if (this.aiInsightsDisabled) {
                console.warn('AI insights temporarily disabled due to rate limits');
            } else {
                console.warn('OpenAI API key not configured, using rule-based insights only');
            }
        } else {
            // Generate spending analysis prompt
            const prompt = this.buildAnalysisPrompt(summary);
            
            try {
                const aiResponse = await this.callOpenAI(prompt);
                const parsedInsights = this.parseAiResponse(aiResponse, summary);
                insights.push(...parsedInsights);
            } catch (error: any) {
                console.error('Error generating AI insights:', error);
                
                // If rate limit error, temporarily disable AI insights
                if (error?.message?.includes('rate limit')) {
                    this.aiInsightsDisabled = true;
                    this.disableUntil = Date.now() + (5 * 60 * 1000); // Disable for 5 minutes
                    console.warn('AI insights temporarily disabled for 5 minutes due to rate limits');
                }
                
                // Don't throw error, just fall back to rule-based insights
            }
        }

        // Add rule-based insights (always available)
        insights.push(...this.generateRuleBasedInsights(summary));

        return insights;
    }

    /**
     * Build analysis prompt for OpenAI
     */
    private buildAnalysisPrompt(summary: MonthlySpendingSummary): string {
        const categoryDetails = summary.categoryBreakdown
            .map(c => `${c.category}: $${c.amount.toFixed(2)} (${c.percentage.toFixed(1)}%)`)
            .join('\n');

        return `Analyze this monthly spending data and provide financial insights:

Total Spent: $${summary.totalSpent.toFixed(2)}
Total Income: $${summary.totalIncome.toFixed(2)}
Net Amount: $${summary.netAmount.toFixed(2)}
Transaction Count: ${summary.transactionCount}

Category Breakdown:
${categoryDetails}

Please provide insights on:
1. Potential budget leaks or overspending areas
2. Recurring subscriptions or charges
3. Unusual spending patterns or anomalies
4. Recommendations for optimization
5. Spending trends compared to typical patterns

Format your response as JSON with this structure:
{
  "insights": [
    {
      "type": "budget_leak|subscription|anomaly|trend|recommendation",
      "title": "Brief title",
      "description": "Detailed description",
      "severity": "low|medium|high",
      "category": "category name if applicable",
      "amount": "amount if applicable"
    }
  ]
}`;
    }

    /**
     * Call OpenAI API with rate limiting
     */
    private async callOpenAI(prompt: string): Promise<string> {
        // Rate limiting: ensure at least 2 seconds between API calls
        const now = Date.now();
        const timeSinceLastCall = now - this.lastApiCall;
        
        if (timeSinceLastCall < this.RATE_LIMIT_DELAY) {
            const delay = this.RATE_LIMIT_DELAY - timeSinceLastCall;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        this.lastApiCall = Date.now();

        const response = await fetch(this.OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // Use cheaper model to reduce rate limits
                messages: [
                    {
                        role: 'system',
                        content: 'You are a financial advisor analyzing spending patterns. Provide concise, actionable insights.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 800, // Reduced tokens to avoid rate limits
                temperature: 0.3
            })
        });

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('OpenAI API rate limit exceeded. Please wait a moment and try again.');
            } else if (response.status === 401) {
                throw new Error('OpenAI API key is invalid or expired.');
            } else {
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
            }
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * Parse AI response into structured insights
     */
    private parseAiResponse(response: string, summary: MonthlySpendingSummary): SpendingInsight[] {
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return [];
            }

            const parsed = JSON.parse(jsonMatch[0]);
            return parsed.insights || [];
        } catch (error) {
            console.error('Error parsing AI response:', error);
            return [];
        }
    }

    /**
     * Generate rule-based insights
     */
    private generateRuleBasedInsights(summary: MonthlySpendingSummary): SpendingInsight[] {
        const insights: SpendingInsight[] = [];

        // Check for high spending categories (>30% of total)
        const highSpendingCategories = summary.categoryBreakdown.filter(c => c.percentage > 30);
        highSpendingCategories.forEach(category => {
            insights.push({
                type: 'budget_leak',
                title: `High Spending in ${category.category}`,
                description: `${category.category} represents ${category.percentage.toFixed(1)}% of your total spending. Consider reviewing this category for potential savings.`,
                severity: 'medium',
                amount: category.amount,
                percentage: category.percentage,
                category: category.category
            });
        });

        // Check for negative net amount
        if (summary.netAmount < 0) {
            insights.push({
                type: 'budget_leak',
                title: 'Spending Exceeds Income',
                description: `Your spending ($${summary.totalSpent.toFixed(2)}) exceeds your income ($${summary.totalIncome.toFixed(2)}) by $${Math.abs(summary.netAmount).toFixed(2)}.`,
                severity: 'high',
                amount: Math.abs(summary.netAmount)
            });
        }

        // Check for many small transactions (potential subscription detection)
        const smallTransactions = summary.categoryBreakdown.filter(c => 
            c.transactionCount > 5 && c.amount / c.transactionCount < 50
        );
        
        smallTransactions.forEach(category => {
            insights.push({
                type: 'subscription',
                title: `Potential Subscriptions in ${category.category}`,
                description: `${category.category} has ${category.transactionCount} transactions averaging $${(category.amount / category.transactionCount).toFixed(2)}. Review for recurring charges.`,
                severity: 'low',
                category: category.category,
                amount: category.amount
            });
        });

        return insights;
    }

    /**
     * Get spending trends over multiple months
     */
    getSpendingTrends(months: number = 6): Observable<any[]> {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        return from(this.supabaseService.getClient()
            .from('hb_transactions')
            .select('date, amount, category:category_id(name)')
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0])
            .order('date', { ascending: true })
        ).pipe(
            map(result => {
                const transactions = result.data || [];
                return this.calculateTrends(transactions);
            })
        );
    }

    /**
     * Calculate spending trends
     */
    private calculateTrends(transactions: any[]): any[] {
        const monthlyData = new Map<string, { spent: number; income: number; count: number }>();

        transactions.forEach(transaction => {
            const monthKey = transaction.date.substring(0, 7); // YYYY-MM
            const current = monthlyData.get(monthKey) || { spent: 0, income: 0, count: 0 };
            
            if (transaction.amount < 0) {
                current.spent += Math.abs(transaction.amount);
            } else {
                current.income += transaction.amount;
            }
            current.count++;

            monthlyData.set(monthKey, current);
        });

        return Array.from(monthlyData.entries()).map(([month, data]) => ({
            month,
            spent: data.spent,
            income: data.income,
            net: data.income - data.spent,
            transactionCount: data.count
        }));
    }

    /**
     * Get category spending comparison
     */
    getCategoryComparison(year: number, month: number): Observable<any> {
        const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        return from(this.supabaseService.getClient()
            .from('hb_transactions')
            .select('amount, category:category_id(name)')
            .gte('date', startDate)
            .lte('date', endDate)
        ).pipe(
            map(result => {
                const transactions = result.data || [];
                return this.calculateCategoryComparison(transactions);
            })
        );
    }

    /**
     * Calculate category spending comparison
     */
    private calculateCategoryComparison(transactions: any[]): any {
        const categoryMap = new Map<string, { amount: number; count: number }>();

        transactions.forEach(transaction => {
            if (transaction.amount < 0) { // Only expenses
                const categoryName = transaction.category?.name || 'Uncategorized';
                const current = categoryMap.get(categoryName) || { amount: 0, count: 0 };
                categoryMap.set(categoryName, {
                    amount: current.amount + Math.abs(transaction.amount),
                    count: current.count + 1
                });
            }
        });

        const totalSpent = Array.from(categoryMap.values()).reduce((sum, data) => sum + data.amount, 0);

        return {
            categories: Array.from(categoryMap.entries()).map(([name, data]) => ({
                name,
                amount: data.amount,
                percentage: (data.amount / totalSpent) * 100,
                count: data.count,
                average: data.amount / data.count
            })).sort((a, b) => b.amount - a.amount),
            totalSpent,
            totalTransactions: transactions.length
        };
    }
} 