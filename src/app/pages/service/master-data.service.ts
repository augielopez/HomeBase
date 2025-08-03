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
    private creditCardTypesSubject = new BehaviorSubject<any[]>([]);


    // Observables for components to subscribe to
    public billCategories$ = this.billCategoriesSubject.asObservable();
    public billTypes$ = this.billTypesSubject.asObservable();
    public frequencyTypes$ = this.frequencyTypesSubject.asObservable();
    public paymentTypes$ = this.paymentTypesSubject.asObservable();
    public priorityTypes$ = this.priorityTypesSubject.asObservable();
    warrantyTypes$ = this.warrantyTypesSubject.asObservable();
    tags$ = this.tagsSubject.asObservable();
    loginTypes$ = this.loginTypesSubject.asObservable();
    creditCardTypes$ = this.creditCardTypesSubject.asObservable();


    // Loading states
    private isLoadingSubject = new BehaviorSubject<boolean>(false);
    public isLoading$ = this.isLoadingSubject.asObservable();

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
            creditCardTypes: this.loadCreditCardTypes(),
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
     * Load credit card types
     */
    private loadCreditCardTypes(): Observable<any[]> {
        return new Observable(observer => {
            this.supabaseService.getClient()
                .from('hb_card_types')
                .select('*')
                .order('name')
                .then(({ data, error }) => {
                    if (error) {
                        console.error('Error loading credit card types:', error);
                        observer.error(error);
                    } else {
                        this.creditCardTypesSubject.next(data || []);
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
}
