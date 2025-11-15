import { Injectable } from '@angular/core';
import { SupabaseService } from '../../service/supabase.service';
import { Bill } from '../interfaces/bill.interface';
import { Observable, from, map, switchMap } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class BillsService {
    constructor(private supabaseService: SupabaseService) {}

    /**
     * Get all bills for the current user
     */
    getBills(): Observable<Bill[]> {
        return from(this.supabaseService.getClient()
            .from('hb_bills')
            .select('*')
            .order('created_at', { ascending: false })
        ).pipe(
            map(result => result.data || [])
        );
    }

    /**
     * Get a single bill by ID
     */
    getBill(id: string): Observable<Bill | null> {
        return from(this.supabaseService.getClient()
            .from('hb_bills')
            .select('*')
            .eq('id', id)
            .single()
        ).pipe(
            map(result => result.data || null)
        );
    }

    /**
     * Create a new bill
     */
    createBill(bill: Partial<Bill>): Observable<Bill> {
        return from(this.supabaseService.getCurrentUserId()).pipe(
            switchMap(userId => {
                const billData = {
                    ...bill,
                    created_by: userId,
                    updated_by: userId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                return from(this.supabaseService.getClient()
                    .from('hb_bills')
                    .insert([billData])
                    .select()
                    .single()
                );
            }),
            map(result => result.data)
        );
    }

    /**
     * Update an existing bill
     */
    updateBill(id: string, bill: Partial<Bill>): Observable<Bill> {
        return from(this.supabaseService.getCurrentUserId()).pipe(
            switchMap(userId => {
                const billData = {
                    ...bill,
                    updated_by: userId,
                    updated_at: new Date().toISOString()
                };

                return from(this.supabaseService.getClient()
                    .from('hb_bills')
                    .update(billData)
                    .eq('id', id)
                    .select()
                    .single()
                );
            }),
            map(result => result.data)
        );
    }

    /**
     * Delete a bill
     */
    deleteBill(id: string): Observable<boolean> {
        return from(this.supabaseService.getClient()
            .from('hb_bills')
            .delete()
            .eq('id', id)
        ).pipe(
            map(result => !result.error)
        );
    }

    /**
     * Delete multiple bills
     */
    deleteBills(ids: string[]): Observable<boolean> {
        return from(this.supabaseService.getClient()
            .from('hb_bills')
            .delete()
            .in('id', ids)
        ).pipe(
            map(result => !result.error)
        );
    }
}
