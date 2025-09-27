import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import {
    BillCategory,
    BillType,
    FrequencyType,
    PaymentType,
    PriorityType
} from '../../interfaces';

@Injectable({
    providedIn: 'root'
})
export class MasterDataService {
    // BehaviorSubjects to hold the data
    private billCategoriesSubject = new BehaviorSubject<BillCategory[]>([]);
    private billTypesSubject = new BehaviorSubject<BillType[]>([]);
    private frequencyTypesSubject = new BehaviorSubject<FrequencyType[]>([]);
    private paymentTypesSubject = new BehaviorSubject<PaymentType[]>([]);
    private priorityTypesSubject = new BehaviorSubject<PriorityType[]>([]);
    private warrantyTypesSubject = new BehaviorSubject<any[]>([]);
    private tagsSubject = new BehaviorSubject<any[]>([]);
    private loginTypesSubject = new BehaviorSubject<any[]>([]);
    private billStatusTypesSubject = new BehaviorSubject<any[]>([]);
    private cardTypesSubject = new BehaviorSubject<any[]>([]);
    private ownerTypesSubject = new BehaviorSubject<any[]>([]);


    // Observables for components to subscribe to
    billCategories$ = this.billCategoriesSubject.asObservable();
    billTypes$ = this.billTypesSubject.asObservable();
    frequencyTypes$ = this.frequencyTypesSubject.asObservable();
    paymentTypes$ = this.paymentTypesSubject.asObservable();
    priorityTypes$ = this.priorityTypesSubject.asObservable();
    warrantyTypes$ = this.warrantyTypesSubject.asObservable();
    tags$ = this.tagsSubject.asObservable();
    loginTypes$ = this.loginTypesSubject.asObservable();
    billStatusTypes$ = this.billStatusTypesSubject.asObservable();
    cardTypes$ = this.cardTypesSubject.asObservable();
    ownerTypes$ = this.ownerTypesSubject.asObservable();


    // Loading states
    private isLoadingSubject = new BehaviorSubject<boolean>(false);
    isLoading$ = this.isLoadingSubject.asObservable();

    constructor(private supabaseService: SupabaseService) {}

    /**
     * Load all master data from the database
     */
    loadAllMasterData(): Observable<boolean> {
        this.isLoadingSubject.next(true);

        return forkJoin({
            billCategories: this.loadBillCategories(),
            billTypes: this.loadBillTypes(),
            frequencyTypes: this.loadFrequencyTypes(),
            paymentTypes: this.loadPaymentTypes(),
            priorityTypes: this.loadPriorityTypes(),
            warrantyTypes: this.loadWarrantyTypes(),
            tags: this.loadTags(),
            loginTypes: this.loadLoginTypes(),
            billStatusTypes: this.loadBillStatusTypes(),
            cardTypes: this.loadCardTypes(),
            ownerTypes: this.loadOwnerTypes(),
        }).pipe(
            tap(() => {
                this.isLoadingSubject.next(false);
                console.log('All master data loaded successfully');
            }),
            catchError(error => {
                console.error('Error loading master data:', error);
                this.isLoadingSubject.next(false);
                return of(false);
            }),
            tap(() => true),
            map(() => true)
        );
    }

    /**
     * Load bill categories
     */
    private loadBillCategories(): Observable<BillCategory[]> {
        return new Observable(observer => {
            this.supabaseService.getClient()
                .from('hb_bill_categories')
                .select('*')
                .order('name')
                .then(({ data, error }: { data: BillCategory[] | null; error: any }) => {
                    if (error) {
                        console.error('Error loading bill categories:', error);
                        observer.error(error);
                    } else {
                        this.billCategoriesSubject.next(data || []);
                        observer.next(data || []);
                        observer.complete();
                    }
                });
        });
    }

    /**
     * Load bill types
     */
    private loadBillTypes(): Observable<BillType[]> {
        return new Observable(observer => {
            this.supabaseService.getClient()
                .from('hb_bill_types')
                .select('*')
                .order('name')
                .then(({ data, error }: { data: BillType[] | null; error: any }) => {
                    if (error) {
                        console.error('Error loading bill types:', error);
                        observer.error(error);
                    } else {
                        this.billTypesSubject.next(data || []);
                        observer.next(data || []);
                        observer.complete();
                    }
                });
        });
    }

    /**
     * Load frequency types
     */
    private loadFrequencyTypes(): Observable<FrequencyType[]> {
        return new Observable(observer => {
            this.supabaseService.getClient()
                .from('hb_frequency_types')
                .select('*')
                .order('name')
                .then(({ data, error }: { data: FrequencyType[] | null; error: any }) => {
                    if (error) {
                        console.error('Error loading frequency types:', error);
                        observer.error(error);
                    } else {
                        this.frequencyTypesSubject.next(data || []);
                        observer.next(data || []);
                        observer.complete();
                    }
                });
        });
    }

    /**
     * Load payment types
     */
    private loadPaymentTypes(): Observable<PaymentType[]> {
        return new Observable(observer => {
            this.supabaseService.getClient()
                .from('hb_payment_types')
                .select('*')
                .order('name')
                .then(({ data, error }: { data: PaymentType[] | null; error: any }) => {
                    if (error) {
                        console.error('Error loading payment types:', error);
                        observer.error(error);
                    } else {
                        this.paymentTypesSubject.next(data || []);
                        observer.next(data || []);
                        observer.complete();
                    }
                });
        });
    }

    /**
     * Load priority types
     */
    private loadPriorityTypes(): Observable<PriorityType[]> {
        return new Observable(observer => {
            this.supabaseService.getClient()
                .from('hb_priority_types')
                .select('*')
                .order('name')
                .then(({ data, error }: { data: PriorityType[] | null; error: any }) => {
                    if (error) {
                        console.error('Error loading priority types:', error);
                        observer.error(error);
                    } else {
                        this.priorityTypesSubject.next(data || []);
                        observer.next(data || []);
                        observer.complete();
                    }
                });
        });
    }


    /**
     * Load warranty types
     */
    private loadWarrantyTypes(): Observable<any[]> {
        return new Observable(observer => {
            this.supabaseService.getClient()
                .from('hb_warranty_types')
                .select('*')
                .order('name')
                .then(({ data, error }) => {
                    if (error) {
                        console.error('Error loading warranty types:', error);
                        observer.error(error);
                    } else {
                        this.warrantyTypesSubject.next(data || []);
                        observer.next(data || []);
                        observer.complete();
                    }
                });
        });
    }

    /**
     * Load tags
     */
    private loadTags(): Observable<any[]> {
        return new Observable(observer => {
            this.supabaseService.getClient()
                .from('hb_tags')
                .select('*')
                .order('name')
                .then(({ data, error }) => {
                    if (error) {
                        console.error('Error loading tags:', error);
                        observer.error(error);
                    } else {
                        this.tagsSubject.next(data || []);
                        observer.next(data || []);
                        observer.complete();
                    }
                });
        });
    }

    /**
     * Load login types
     */
    private loadLoginTypes(): Observable<any[]> {
        return new Observable(observer => {
            this.supabaseService.getClient()
                .from('hb_logins')
                .select('*')
                .order('username')
                .then(({ data, error }) => {
                    if (error) {
                        console.error('Error loading login types:', error);
                        observer.error(error);
                    } else {
                        this.loginTypesSubject.next(data || []);
                        observer.next(data || []);
                        observer.complete();
                    }
                });
        });
    }


    /**
     * Get current values (synchronous)
     */
    getBillCategories(): BillCategory[] {
        return this.billCategoriesSubject.value;
    }

    getBillTypes(): BillType[] {
        return this.billTypesSubject.value;
    }

    getFrequencyTypes(): FrequencyType[] {
        return this.frequencyTypesSubject.value;
    }

    getPaymentTypes(): PaymentType[] {
        return this.paymentTypesSubject.value;
    }

    getPriorityTypes(): PriorityType[] {
        return this.priorityTypesSubject.value;
    }

    /**
     * Refresh specific data
     */
    refreshBillCategories(): Observable<BillCategory[]> {
        return this.loadBillCategories();
    }

    refreshBillTypes(): Observable<BillType[]> {
        return this.loadBillTypes();
    }

    refreshFrequencyTypes(): Observable<FrequencyType[]> {
        return this.loadFrequencyTypes();
    }

    refreshPaymentTypes(): Observable<PaymentType[]> {
        return this.loadPaymentTypes();
    }

    refreshPriorityTypes(): Observable<PriorityType[]> {
        return this.loadPriorityTypes();
    }

    /**
     * Load bill status types
     */
    loadBillStatusTypes(): Observable<any[]> {
        return new Observable(observer => {
            this.supabaseService.getClient()
                .from('hb_bill_status_types')
                .select('*')
                .order('name')
                .then(({ data, error }) => {
                    if (error) {
                        console.error('Error loading bill status types:', error);
                        this.billStatusTypesSubject.next([]);
                        observer.next([]);
                        observer.complete();
                        return;
                    }
                    this.billStatusTypesSubject.next(data || []);
                    observer.next(data || []);
                    observer.complete();
                });
        });
    }

    /**
     * Load card types
     */
    loadCardTypes(): Observable<any[]> {
        return new Observable(observer => {
            this.supabaseService.getClient()
                .from('hb_card_types')
                .select('*')
                .order('name')
                .then(({ data, error }) => {
                    if (error) {
                        console.error('Error loading card types:', error);
                        this.cardTypesSubject.next([]);
                        observer.next([]);
                        observer.complete();
                        return;
                    }
                    this.cardTypesSubject.next(data || []);
                    observer.next(data || []);
                    observer.complete();
                });
        });
    }

    /**
     * Load owner types
     */
    loadOwnerTypes(): Observable<any[]> {
        return new Observable(observer => {
            this.supabaseService.getClient()
                .from('hb_owner_types')
                .select('*')
                .order('name')
                .then(({ data, error }) => {
                    if (error) {
                        console.error('Error loading owner types:', error);
                        this.ownerTypesSubject.next([]);
                        observer.next([]);
                        observer.complete();
                        return;
                    }
                    this.ownerTypesSubject.next(data || []);
                    observer.next(data || []);
                    observer.complete();
                });
        });
    }

    /**
     * Get current values
     */
    getBillStatusTypes(): any[] {
        return this.billStatusTypesSubject.value;
    }

    getCardTypes(): any[] {
        return this.cardTypesSubject.value;
    }

    getOwnerTypes(): any[] {
        return this.ownerTypesSubject.value;
    }

    /**
     * Refresh methods
     */
    refreshBillStatusTypes(): Observable<any[]> {
        return this.loadBillStatusTypes();
    }

    refreshCardTypes(): Observable<any[]> {
        return this.loadCardTypes();
    }

    refreshOwnerTypes(): Observable<any[]> {
        return this.loadOwnerTypes();
    }

    /*
     * Dashboard-specific methods
     */
    
    /**
     * Get credit cards for dashboard carousel
     */
    async getCreditCards(): Promise<any[]> {
        const userId = await this.supabaseService.getCurrentUserId();
        const { data, error } = await this.supabaseService.getClient()
            .from('hb_credit_cards')
            .select(`
                id,
                brand,
                last_four,
                cardholder_name,
                balance,
                credit_limit,
                expiration_month,
                expiration_year,
                account_id
            `)
            .eq('user_id', userId)
            .order('brand, last_four');
        
        if (error) {
            console.error('Error loading credit cards:', error);
            throw error;
        }
        
        return data || [];
    }

    /**
     * Get accounts for dashboard summary
     */
    async getAccounts(): Promise<any[]> {
        const userId = await this.supabaseService.getCurrentUserId();
        const { data, error } = await this.supabaseService.getClient()
            .from('hb_accounts')
            .select(`
                id,
                name,
                account_type,
                balance,
                last_updated,
                institution,
                account_number,
                routing_number,
                is_active
            `)
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('account_type, name');
        
        if (error) {
            console.error('Error loading accounts:', error);
            throw error;
        }
        
        return data || [];
    }

    /**
     * Get recent transactions for dashboard
     */
    async getRecentTransactions(options: { limit?: number; offset?: number; filters?: any } = {}): Promise<any[]> {
        const { limit = 100, offset = 0, filters = {} } = options;
        const userId = await this.supabaseService.getCurrentUserId();
        
        let query = this.supabaseService.getClient()
            .from('hb_transactions')
            .select(`
                id,
                name,
                amount,
                date,
                description,
                account_name,
                import_method,
                bill_id,
                category:category_id (
                    name
                )
            `)
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply filters
        if (filters.search) {
            query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }
        
        if (filters.account) {
            query = query.eq('account_name', filters.account);
        }
        
        if (filters.category) {
            query = query.eq('category_id', filters.category);
        }
        
        if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
            query = query.gte('date', filters.dateRange[0]).lte('date', filters.dateRange[1]);
        }
        
        if (filters.importMethod) {
            query = query.eq('import_method', filters.importMethod);
        }

        const { data, error } = await query;
        
        if (error) {
            console.error('Error loading recent transactions:', error);
            throw error;
        }
        
        return data || [];
    }

    /**
     * Get upcoming bills for dashboard
     */
    async getUpcomingBills(): Promise<any[]> {
        const userId = await this.supabaseService.getCurrentUserId();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        
        const { data, error } = await this.supabaseService.getClient()
            .from('hb_bills')
            .select(`
                id,
                name,
                amount,
                due_date,
                status,
                notes,
                category:category_id (
                    name
                ),
                account:account_id (
                    name
                ),
                frequency:frequency_id (
                    name
                )
            `)
            .eq('user_id', userId)
            .eq('status', 'Active')
            .lte('due_date', thirtyDaysFromNow.toISOString())
            .order('due_date', { ascending: true });
        
        if (error) {
            console.error('Error loading upcoming bills:', error);
            throw error;
        }
        
        return data || [];
    }

    /**
     * Get spending by category for charts
     */
    async getSpendingByCategory(monthRange: { start: string; end: string }): Promise<any[]> {
        const userId = await this.supabaseService.getCurrentUserId();
        
        const { data, error } = await this.supabaseService.getClient()
            .from('hb_transactions')
            .select(`
                amount,
                category:category_id (
                    name
                )
            `)
            .eq('user_id', userId)
            .gte('date', monthRange.start)
            .lte('date', monthRange.end)
            .lt('amount', 0) // Only spending
            .not('category_id', 'is', null);
        
        if (error) {
            console.error('Error loading spending by category:', error);
            throw error;
        }

        // Group by category
        const categoryData = new Map<string, number>();
        let totalSpending = 0;

        data?.forEach(transaction => {
          const categoryName = (transaction.category as any)?.name || 'Uncategorized';
            const amount = Math.abs(transaction.amount);
            
            categoryData.set(categoryName, (categoryData.get(categoryName) || 0) + amount);
            totalSpending += amount;
        });

        // Convert to array and calculate percentages
        return Array.from(categoryData.entries()).map(([category, amount]) => ({
            category,
            amount,
            percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0
        })).sort((a, b) => b.amount - a.amount);
    }

    /**
     * Get monthly spending trends
     */
    async getMonthlySpendingTrends(monthsBack: number = 12): Promise<any[]> {
        const userId = await this.supabaseService.getCurrentUserId();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - monthsBack);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);

        const { data, error } = await this.supabaseService.getClient()
            .from('hb_transactions')
            .select('amount, date')
            .eq('user_id', userId)
            .gte('date', startDate.toISOString())
            .order('date', { ascending: true });
        
        if (error) {
            console.error('Error loading monthly spending trends:', error);
            throw error;
        }

        // Group by month
        const monthlyData = new Map<string, { spending: number; income: number }>();
        
        data?.forEach(transaction => {
            const date = new Date(transaction.date);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            
            if (!monthlyData.has(monthKey)) {
                monthlyData.set(monthKey, { spending: 0, income: 0 });
            }
            
            const monthData = monthlyData.get(monthKey)!;
            if (transaction.amount < 0) {
                monthData.spending += Math.abs(transaction.amount);
            } else {
                monthData.income += transaction.amount;
            }
        });

        // Convert to array and format
        return Array.from(monthlyData.entries()).map(([month, data]) => ({
            month: this.formatMonthLabel(month),
            spending: data.spending,
            income: data.income,
            net: data.income - data.spending
        })).sort((a, b) => a.month.localeCompare(b.month));
    }

    /**
     * Get top merchants
     */
    async getTopMerchants(monthRange: { start: string; end: string }, limit: number = 10): Promise<any[]> {
        const userId = await this.supabaseService.getCurrentUserId();
        
        const { data, error } = await this.supabaseService.getClient()
            .from('hb_transactions')
            .select('name, amount')
            .eq('user_id', userId)
            .gte('date', monthRange.start)
            .lte('date', monthRange.end)
            .lt('amount', 0); // Only spending
        
        if (error) {
            console.error('Error loading top merchants:', error);
            throw error;
        }

        // Group by merchant
        const merchantData = new Map<string, { amount: number; count: number }>();

        data?.forEach(transaction => {
            const merchantName = transaction.name;
            const amount = Math.abs(transaction.amount);
            
            if (!merchantData.has(merchantName)) {
                merchantData.set(merchantName, { amount: 0, count: 0 });
            }
            
            const data = merchantData.get(merchantName)!;
            data.amount += amount;
            data.count += 1;
        });

        // Convert to array and sort
        return Array.from(merchantData.entries()).map(([merchant, data]) => ({
            merchant,
            amount: data.amount,
            count: data.count
        })).sort((a, b) => b.amount - a.amount).slice(0, limit);
    }

    /**
     * Get dashboard summary statistics
     */
    async getDashboardSummary(): Promise<any> {
        const userId = await this.supabaseService.getCurrentUserId();
        
        // Load accounts for net worth calculation
        const { data: accounts } = await this.supabaseService.getClient()
            .from('hb_accounts')
            .select('balance, account_type')
            .eq('user_id', userId)
            .eq('is_active', true);

        // Load credit cards for balance calculation
        const { data: creditCards } = await this.supabaseService.getClient()
            .from('hb_credit_cards')
            .select('balance, credit_limit')
            .eq('user_id', userId);

        // Load upcoming bills (next 30 days)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        
        const { data: upcomingBills } = await this.supabaseService.getClient()
            .from('hb_bills')
            .select('amount, due_date')
            .eq('user_id', userId)
            .eq('status', 'Active')
            .lte('due_date', thirtyDaysFromNow.toISOString())
            .gte('due_date', new Date().toISOString());

        // Load monthly spending (current month)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        const { data: monthlyTransactions } = await this.supabaseService.getClient()
            .from('hb_transactions')
            .select('amount')
            .eq('user_id', userId)
            .gte('date', startOfMonth.toISOString())
            .lte('date', endOfMonth.toISOString())
            .lt('amount', 0); // Only spending

        // Calculate summary metrics
        const totalCash = (accounts || [])
            .filter(acc => acc.account_type === 'Checking' || acc.account_type === 'Savings')
            .reduce((sum, acc) => sum + (acc.balance || 0), 0);

        const totalCreditCardBalance = (creditCards || [])
            .reduce((sum, card) => sum + (card.balance || 0), 0);

        const totalNetWorth = (accounts || [])
            .reduce((sum, acc) => sum + (acc.balance || 0), 0) - totalCreditCardBalance;

        const upcomingBillsCount = (upcomingBills || []).length;
        const upcomingBillsTotal = (upcomingBills || [])
            .reduce((sum, bill) => sum + (bill.amount || 0), 0);

        const monthlySpending = Math.abs((monthlyTransactions || [])
            .reduce((sum, tx) => sum + (tx.amount || 0), 0));

        return {
            totalNetWorth,
            totalCash,
            totalCreditCardBalance,
            upcomingBillsCount,
            upcomingBillsTotal,
            monthlySpending
        };
    }

    private formatMonthLabel(monthKey: string): string {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
}
