import { Injectable } from '@angular/core';
import { SupabaseService } from '../../service/supabase.service';
import { Receipt, ReceiptExtended, Store } from '../interfaces';
import { Observable, from, map, switchMap, of } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ReceiptService {
    constructor(private supabaseService: SupabaseService) {}

    /**
     * Get all stores
     */
    getStores(): Observable<Store[]> {
        return from(this.supabaseService.getClient()
            .from('shop_stores')
            .select('*')
            .order('name', { ascending: true })
        ).pipe(
            map(result => {
                if (result.error) throw result.error;
                return (result.data || []).map(this.mapStoreFromDb);
            })
        );
    }

    /**
     * Get a single store by ID
     */
    getStore(id: string): Observable<Store | null> {
        return from(this.supabaseService.getClient()
            .from('shop_stores')
            .select('*')
            .eq('id', id)
            .single()
        ).pipe(
            map(result => {
                if (result.error) throw result.error;
                return result.data ? this.mapStoreFromDb(result.data) : null;
            })
        );
    }

    /**
     * Find or create a store by name and address
     * Uses case-insensitive matching to avoid duplicates
     */
    findOrCreateStore(storeData: {
        name: string;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        zipCode?: string | null;
    }): Observable<Store> {
        console.log('[ReceiptService] Looking up store:', storeData.name);
        
        // First, try to find existing store by name (case-insensitive)
        // Note: Supabase doesn't support case-insensitive eq, so we'll fetch and filter client-side
        return from(this.supabaseService.getClient()
            .from('shop_stores')
            .select('*')
        ).pipe(
            switchMap(result => {
                if (result.error) throw result.error;
                
                // Filter for case-insensitive name match
                const matchingStore = result.data?.find(store => 
                    store.name?.toLowerCase().trim() === storeData.name.toLowerCase().trim()
                );
                
                // If store exists, return it
                if (matchingStore) {
                    console.log('[ReceiptService] Found existing store:', matchingStore.name, 'ID:', matchingStore.id);
                    const existingStore = this.mapStoreFromDb(matchingStore);
                    // Update address if provided and different
                    if (storeData.address && existingStore.address !== storeData.address) {
                        console.log('[ReceiptService] Updating store address');
                        return this.updateStore(existingStore.id, storeData);
                    }
                    return of(existingStore);
                }

                // Store doesn't exist, create it
                console.log('[ReceiptService] Creating new store:', storeData.name);
                return this.createStore({
                    name: storeData.name,
                    address: storeData.address || null,
                    city: storeData.city || null,
                    state: storeData.state || null,
                    zipCode: storeData.zipCode || null
                });
            })
        );
    }

    /**
     * Update an existing store
     */
    updateStore(id: string, storeData: Partial<Store>): Observable<Store> {
        const updateData: any = {};
        if (storeData.name !== undefined) updateData.name = storeData.name;
        if (storeData.address !== undefined) updateData.address = storeData.address;
        if (storeData.city !== undefined) updateData.city = storeData.city;
        if (storeData.state !== undefined) updateData.state = storeData.state;
        if (storeData.zipCode !== undefined) updateData.zip_code = storeData.zipCode;

        return from(this.supabaseService.getClient()
            .from('shop_stores')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()
        ).pipe(
            map(result => {
                if (result.error) throw result.error;
                return this.mapStoreFromDb(result.data);
            })
        );
    }

    /**
     * Create a new store
     */
    createStore(store: Partial<Store>): Observable<Store> {
        const storeData = {
            name: store.name,
            address: store.address || null,
            city: store.city || null,
            state: store.state || null,
            zip_code: store.zipCode || null
        };

        return from(this.supabaseService.getClient()
            .from('shop_stores')
            .insert([storeData])
            .select()
            .single()
        ).pipe(
            map(result => {
                if (result.error) throw result.error;
                return this.mapStoreFromDb(result.data);
            })
        );
    }

    /**
     * Get all receipts with store information
     */
    getReceipts(): Observable<ReceiptExtended[]> {
        return from(this.supabaseService.getClient()
            .from('shop_receipts')
            .select('*')
            .order('receipt_date', { ascending: false })
        ).pipe(
            switchMap(receiptsResult => {
                if (receiptsResult.error) {
                    console.error('ReceiptService.getReceipts error:', receiptsResult.error);
                    console.error('Error details:', JSON.stringify(receiptsResult.error, null, 2));
                    throw receiptsResult.error;
                }
                
                console.log('ReceiptService.getReceipts raw receipts:', receiptsResult.data);
                console.log('ReceiptService.getReceipts count:', receiptsResult.data?.length || 0);
                
                const receipts = receiptsResult.data || [];
                if (receipts.length === 0) {
                    return of([]);
                }

                // Get unique store IDs
                const storeIds = [...new Set(receipts.map((r: any) => r.store_id).filter(Boolean))];
                
                if (storeIds.length === 0) {
                    // No stores to load, just map receipts
                    return of(receipts.map((r: any) => this.mapReceiptFromDb(r)));
                }

                // Load all stores
                return from(this.supabaseService.getClient()
                    .from('shop_stores')
                    .select('*')
                    .in('id', storeIds)
                ).pipe(
                    map(storesResult => {
                        const stores = storesResult.data || [];
                        const storesMap = new Map(stores.map((s: any) => [s.id, this.mapStoreFromDb(s)]));
                        
                        // Map receipts with their stores
                        return receipts.map((r: any) => {
                            const receipt = this.mapReceiptFromDb(r);
                            receipt.store = storesMap.get(r.store_id) || null;
                            return receipt;
                        });
                    })
                );
            })
        );
    }

    /**
     * Get a single receipt by ID with store information
     */
    getReceipt(id: string): Observable<ReceiptExtended | null> {
        return from(this.supabaseService.getClient()
            .from('shop_receipts')
            .select('*')
            .eq('id', id)
            .single()
        ).pipe(
            switchMap(receiptResult => {
                if (receiptResult.error) {
                    console.error('ReceiptService.getReceipt error:', receiptResult.error);
                    throw receiptResult.error;
                }
                
                if (!receiptResult.data) {
                    return of(null);
                }

                const receipt = receiptResult.data;
                const receiptMapped = this.mapReceiptFromDb(receipt);

                // Load store if store_id exists
                if (receipt.store_id) {
                    return from(this.supabaseService.getClient()
                        .from('shop_stores')
                        .select('*')
                        .eq('id', receipt.store_id)
                        .single()
                    ).pipe(
                        map(storeResult => {
                            if (storeResult.data) {
                                receiptMapped.store = this.mapStoreFromDb(storeResult.data);
                            }
                            return receiptMapped;
                        })
                    );
                }

                return of(receiptMapped);
            })
        );
    }

    /**
     * Create a new receipt
     */
    createReceipt(receipt: Partial<Receipt>): Observable<ReceiptExtended> {
        const receiptData = {
            store_id: receipt.storeId,
            receipt_date: receipt.receiptDate ? this.formatDateForDb(receipt.receiptDate) : this.formatDateForDb(new Date()),
            subtotal: receipt.subtotal,
            tax: receipt.tax || 0,
            total: receipt.total,
            payment_method: receipt.paymentMethod || null,
            card_last_four: receipt.cardLastFour || null,
            notes: receipt.notes || null
        };

        return from(this.supabaseService.getClient()
            .from('shop_receipts')
            .insert([receiptData])
            .select(`
                *,
                shop_stores(*)
            `)
            .single()
        ).pipe(
            map(result => {
                if (result.error) throw result.error;
                return this.mapReceiptFromDb(result.data);
            })
        );
    }

    /**
     * Update an existing receipt
     */
    updateReceipt(id: string, receipt: Partial<Receipt>): Observable<ReceiptExtended> {
        const receiptData: any = {};
        if (receipt.storeId !== undefined) receiptData.store_id = receipt.storeId;
        if (receipt.receiptDate !== undefined) receiptData.receipt_date = this.formatDateForDb(receipt.receiptDate);
        if (receipt.subtotal !== undefined) receiptData.subtotal = receipt.subtotal;
        if (receipt.tax !== undefined) receiptData.tax = receipt.tax;
        if (receipt.total !== undefined) receiptData.total = receipt.total;
        if (receipt.paymentMethod !== undefined) receiptData.payment_method = receipt.paymentMethod;
        if (receipt.cardLastFour !== undefined) receiptData.card_last_four = receipt.cardLastFour;
        if (receipt.notes !== undefined) receiptData.notes = receipt.notes;

        return from(this.supabaseService.getClient()
            .from('shop_receipts')
            .update(receiptData)
            .eq('id', id)
            .select(`
                *,
                shop_stores(*)
            `)
            .single()
        ).pipe(
            map(result => {
                if (result.error) throw result.error;
                return this.mapReceiptFromDb(result.data);
            })
        );
    }

    /**
     * Delete a receipt
     */
    deleteReceipt(id: string): Observable<boolean> {
        return from(this.supabaseService.getClient()
            .from('shop_receipts')
            .delete()
            .eq('id', id)
        ).pipe(
            map(result => {
                if (result.error) throw result.error;
                return true;
            })
        );
    }

    /**
     * Map database store to Store interface
     */
    private mapStoreFromDb(data: any): Store {
        return {
            id: data.id,
            name: data.name,
            address: data.address || null,
            city: data.city || null,
            state: data.state || null,
            zipCode: data.zip_code || null,
            createdAt: new Date(data.created_at)
        };
    }

    /**
     * Map database receipt to ReceiptExtended interface
     */
    private mapReceiptFromDb(data: any): ReceiptExtended {
        // Handle store - Supabase returns it as shop_stores (array) when using select with join
        let store = null;
        if (data.shop_stores) {
            if (Array.isArray(data.shop_stores) && data.shop_stores.length > 0) {
                store = this.mapStoreFromDb(data.shop_stores[0]);
            } else if (typeof data.shop_stores === 'object') {
                store = this.mapStoreFromDb(data.shop_stores);
            }
        }

        return {
            id: data.id,
            storeId: data.store_id,
            receiptDate: this.parseLocalDate(data.receipt_date),
            subtotal: parseFloat(data.subtotal),
            tax: parseFloat(data.tax || 0),
            total: parseFloat(data.total),
            paymentMethod: data.payment_method || null,
            cardLastFour: data.card_last_four || null,
            notes: data.notes || null,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            store: store
        };
    }

    /**
     * Parse a date string (YYYY-MM-DD) as a local date to avoid timezone issues
     */
    private parseLocalDate(dateString: string): Date {
        if (!dateString) return new Date();
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day); // month is 0-indexed
    }

    /**
     * Format a Date object as YYYY-MM-DD for database queries (using local date, not UTC)
     */
    private formatDateForDb(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

