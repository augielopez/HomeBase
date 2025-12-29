import { Injectable } from '@angular/core';
import { SupabaseService } from '../../service/supabase.service';
import { ReceiptItem, ReceiptItemExtended, Item } from '../interfaces';
import { Observable, from, map, switchMap, of } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ReceiptItemService {
    constructor(private supabaseService: SupabaseService) {}

    /**
     * Get all items
     */
    getItems(): Observable<Item[]> {
        return from(this.supabaseService.getClient()
            .from('shop_items')
            .select('*')
            .order('name', { ascending: true })
        ).pipe(
            map(result => {
                if (result.error) throw result.error;
                return (result.data || []).map(this.mapItemFromDb);
            })
        );
    }

    /**
     * Get a single item by ID
     */
    getItem(id: string): Observable<Item | null> {
        return from(this.supabaseService.getClient()
            .from('shop_items')
            .select('*')
            .eq('id', id)
            .single()
        ).pipe(
            map(result => {
                if (result.error) throw result.error;
                return result.data ? this.mapItemFromDb(result.data) : null;
            })
        );
    }

    /**
     * Find or create an item by name
     * Uses case-insensitive matching to avoid duplicates
     */
    findOrCreateItem(itemData: {
        name: string;
        category?: string | null;
        description?: string | null;
    }): Observable<Item> {
        console.log('[ReceiptItemService] Looking up item:', itemData.name);
        
        // First, try to find existing item by name (case-insensitive)
        // Note: Supabase doesn't support case-insensitive eq, so we'll fetch and filter client-side
        return from(this.supabaseService.getClient()
            .from('shop_items')
            .select('*')
        ).pipe(
            switchMap(result => {
                if (result.error) throw result.error;
                
                // Filter for case-insensitive name match
                const matchingItem = result.data?.find(item => 
                    item.name?.toLowerCase().trim() === itemData.name.toLowerCase().trim()
                );
                
                // If item exists, return it (optionally update category if provided)
                if (matchingItem) {
                    console.log('[ReceiptItemService] Found existing item:', matchingItem.name, 'ID:', matchingItem.id);
                    const existingItem = this.mapItemFromDb(matchingItem);
                    // Update category if provided and different
                    if (itemData.category && existingItem.category !== itemData.category) {
                        console.log('[ReceiptItemService] Updating item category');
                        return this.updateItem(existingItem.id, { category: itemData.category });
                    }
                    return of(existingItem);
                }

                // Item doesn't exist, create it
                console.log('[ReceiptItemService] Creating new item:', itemData.name);
                return this.createItem(itemData);
            })
        );
    }

    /**
     * Create a new item
     */
    createItem(item: Partial<Item>): Observable<Item> {
        const itemData = {
            name: item.name,
            category: item.category || null,
            description: item.description || null
        };

        return from(this.supabaseService.getClient()
            .from('shop_items')
            .insert([itemData])
            .select()
            .single()
        ).pipe(
            map(result => {
                if (result.error) throw result.error;
                return this.mapItemFromDb(result.data);
            })
        );
    }

    /**
     * Update an existing item
     */
    updateItem(id: string, item: Partial<Item>): Observable<Item> {
        const updateData: any = {};
        if (item.name !== undefined) updateData.name = item.name;
        if (item.category !== undefined) updateData.category = item.category;
        if (item.description !== undefined) updateData.description = item.description;

        return from(this.supabaseService.getClient()
            .from('shop_items')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()
        ).pipe(
            map(result => {
                if (result.error) throw result.error;
                return this.mapItemFromDb(result.data);
            })
        );
    }

    /**
     * Get all receipt items for a receipt with item information
     */
    getReceiptItems(receiptId: string): Observable<ReceiptItemExtended[]> {
        return from(this.supabaseService.getClient()
            .from('shop_receipt_items')
            .select('*')
            .eq('receipt_id', receiptId)
            .order('created_at', { ascending: true })
        ).pipe(
            switchMap(receiptItemsResult => {
                if (receiptItemsResult.error) {
                    console.error('ReceiptItemService.getReceiptItems error:', receiptItemsResult.error);
                    throw receiptItemsResult.error;
                }
                
                console.log('ReceiptItemService.getReceiptItems raw items:', receiptItemsResult.data);
                console.log('ReceiptItemService.getReceiptItems count:', receiptItemsResult.data?.length || 0);
                
                const receiptItems = receiptItemsResult.data || [];
                if (receiptItems.length === 0) {
                    return of([]);
                }

                // Get unique item IDs
                const itemIds = [...new Set(receiptItems.map((ri: any) => ri.item_id).filter(Boolean))];
                
                if (itemIds.length === 0) {
                    // No items to load, just map receipt items
                    return of(receiptItems.map((ri: any) => this.mapReceiptItemFromDb(ri, null)));
                }

                // Load all items
                return from(this.supabaseService.getClient()
                    .from('shop_items')
                    .select('*')
                    .in('id', itemIds)
                ).pipe(
                    map(itemsResult => {
                        if (itemsResult.error) {
                            console.error('ReceiptItemService.getReceiptItems items error:', itemsResult.error);
                            throw itemsResult.error;
                        }
                        
                        const items = itemsResult.data || [];
                        const itemsMap = new Map(items.map((i: any) => [i.id, this.mapItemFromDb(i)]));
                        
                        // Map receipt items with their items
                        return receiptItems.map((ri: any) => {
                            const item = itemsMap.get(ri.item_id) || null;
                            return this.mapReceiptItemFromDb(ri, item);
                        });
                    })
                );
            })
        );
    }

    /**
     * Get all items that are not finished
     */
    getUnconsumedItems(): Observable<ReceiptItemExtended[]> {
        return from(this.supabaseService.getClient()
            .from('shop_receipt_items')
            .select('*')
            .eq('is_finished', false)
            .order('expiration_date', { ascending: true, nullsFirst: false })
        ).pipe(
            switchMap(receiptItemsResult => {
                if (receiptItemsResult.error) {
                    console.error('ReceiptItemService.getUnconsumedItems error:', receiptItemsResult.error);
                    throw receiptItemsResult.error;
                }
                
                console.log('ReceiptItemService.getUnconsumedItems raw items:', receiptItemsResult.data);
                console.log('ReceiptItemService.getUnconsumedItems count:', receiptItemsResult.data?.length || 0);
                
                const receiptItems = receiptItemsResult.data || [];
                if (receiptItems.length === 0) {
                    return of([]);
                }

                // Get unique item IDs
                const itemIds = [...new Set(receiptItems.map((ri: any) => ri.item_id).filter(Boolean))];
                
                if (itemIds.length === 0) {
                    return of(receiptItems.map((ri: any) => this.mapReceiptItemFromDb(ri, null)));
                }

                // Load all items
                return from(this.supabaseService.getClient()
                    .from('shop_items')
                    .select('*')
                    .in('id', itemIds)
                ).pipe(
                    map(itemsResult => {
                        if (itemsResult.error) {
                            console.error('ReceiptItemService.getUnconsumedItems items error:', itemsResult.error);
                            throw itemsResult.error;
                        }
                        
                        const items = itemsResult.data || [];
                        const itemsMap = new Map(items.map((i: any) => [i.id, this.mapItemFromDb(i)]));
                        
                        return receiptItems.map((ri: any) => {
                            const item = itemsMap.get(ri.item_id) || null;
                            return this.mapReceiptItemFromDb(ri, item);
                        });
                    })
                );
            })
        );
    }

    /**
     * Get all items that are finished
     */
    getConsumedItems(): Observable<ReceiptItemExtended[]> {
        return from(this.supabaseService.getClient()
            .from('shop_receipt_items')
            .select('*')
            .eq('is_finished', true)
            .order('created_at', { ascending: false })
        ).pipe(
            switchMap(receiptItemsResult => {
                if (receiptItemsResult.error) {
                    console.error('ReceiptItemService.getConsumedItems error:', receiptItemsResult.error);
                    throw receiptItemsResult.error;
                }
                
                console.log('ReceiptItemService.getConsumedItems raw items:', receiptItemsResult.data);
                console.log('ReceiptItemService.getConsumedItems count:', receiptItemsResult.data?.length || 0);
                
                const receiptItems = receiptItemsResult.data || [];
                if (receiptItems.length === 0) {
                    return of([]);
                }

                // Get unique item IDs
                const itemIds = [...new Set(receiptItems.map((ri: any) => ri.item_id).filter(Boolean))];
                
                if (itemIds.length === 0) {
                    return of(receiptItems.map((ri: any) => this.mapReceiptItemFromDb(ri, null)));
                }

                // Load all items
                return from(this.supabaseService.getClient()
                    .from('shop_items')
                    .select('*')
                    .in('id', itemIds)
                ).pipe(
                    map(itemsResult => {
                        if (itemsResult.error) {
                            console.error('ReceiptItemService.getConsumedItems items error:', itemsResult.error);
                            throw itemsResult.error;
                        }
                        
                        const items = itemsResult.data || [];
                        const itemsMap = new Map(items.map((i: any) => [i.id, this.mapItemFromDb(i)]));
                        
                        return receiptItems.map((ri: any) => {
                            const item = itemsMap.get(ri.item_id) || null;
                            return this.mapReceiptItemFromDb(ri, item);
                        });
                    })
                );
            })
        );
    }

    /**
     * Get items expiring soon (for alerts)
     */
    getItemsExpiringSoon(daysAhead: number = 3): Observable<ReceiptItemExtended[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + daysAhead);

        return from(this.supabaseService.getClient()
            .from('shop_receipt_items')
            .select('*')
            .eq('is_finished', false)
            .not('expiration_date', 'is', null)
            .gte('expiration_date', this.formatDateForDb(today))
            .lte('expiration_date', this.formatDateForDb(futureDate))
            .order('expiration_date', { ascending: true })
        ).pipe(
            switchMap(receiptItemsResult => {
                if (receiptItemsResult.error) throw receiptItemsResult.error;
                
                const receiptItems = receiptItemsResult.data || [];
                if (receiptItems.length === 0) return of([]);

                const itemIds = [...new Set(receiptItems.map((ri: any) => ri.item_id).filter(Boolean))];
                if (itemIds.length === 0) {
                    return of(receiptItems.map((ri: any) => this.mapReceiptItemFromDb(ri, null)));
                }

                return from(this.supabaseService.getClient()
                    .from('shop_items')
                    .select('*')
                    .in('id', itemIds)
                ).pipe(
                    map(itemsResult => {
                        if (itemsResult.error) throw itemsResult.error;
                        const items = itemsResult.data || [];
                        const itemsMap = new Map(items.map((i: any) => [i.id, this.mapItemFromDb(i)]));
                        return receiptItems.map((ri: any) => {
                            const item = itemsMap.get(ri.item_id) || null;
                            return this.mapReceiptItemFromDb(ri, item);
                        });
                    })
                );
            })
        );
    }

    /**
     * Get items for grocery list (would_rebuy = 1, Staple)
     */
    getGroceryListItems(): Observable<ReceiptItemExtended[]> {
        return from(this.supabaseService.getClient()
            .from('shop_receipt_items')
            .select('*')
            .eq('is_finished', true)
            .eq('would_rebuy', 1)
            .order('created_at', { ascending: true })
        ).pipe(
            switchMap(receiptItemsResult => {
                if (receiptItemsResult.error) throw receiptItemsResult.error;
                
                const receiptItems = receiptItemsResult.data || [];
                if (receiptItems.length === 0) return of([]);

                const itemIds = [...new Set(receiptItems.map((ri: any) => ri.item_id).filter(Boolean))];
                if (itemIds.length === 0) {
                    return of(receiptItems.map((ri: any) => this.mapReceiptItemFromDb(ri, null)));
                }

                return from(this.supabaseService.getClient()
                    .from('shop_items')
                    .select('*')
                    .in('id', itemIds)
                ).pipe(
                    map(itemsResult => {
                        if (itemsResult.error) throw itemsResult.error;
                        const items = itemsResult.data || [];
                        const itemsMap = new Map(items.map((i: any) => [i.id, this.mapItemFromDb(i)]));
                        const mapped = receiptItems.map((ri: any) => {
                            const item = itemsMap.get(ri.item_id) || null;
                            return this.mapReceiptItemFromDb(ri, item);
                        });
                        // Sort by item name
                        return mapped.sort((a, b) => {
                            const nameA = a.item?.name || '';
                            const nameB = b.item?.name || '';
                            return nameA.localeCompare(nameB);
                        });
                    })
                );
            })
        );
    }

    /**
     * Create a new receipt item
     */
    createReceiptItem(receiptItem: Partial<ReceiptItem>): Observable<ReceiptItemExtended> {
        const itemData = {
            receipt_id: receiptItem.receiptId,
            item_id: receiptItem.itemId,
            quantity: receiptItem.quantity || 1,
            unit_price: receiptItem.unitPrice,
            total_price: receiptItem.totalPrice,
            expiration_date: receiptItem.expirationDate ? this.formatDateForDb(receiptItem.expirationDate) : null,
            is_finished: receiptItem.isFinished || false,
            would_rebuy: receiptItem.wouldRebuy || null,
            notes: receiptItem.notes || null
        };

        return from(this.supabaseService.getClient()
            .from('shop_receipt_items')
            .insert([itemData])
            .select('*')
            .single()
        ).pipe(
            switchMap(result => {
                if (result.error) throw result.error;
                const receiptItem = result.data;
                
                if (!receiptItem.item_id) {
                    return of(this.mapReceiptItemFromDb(receiptItem, null));
                }
                
                return from(this.supabaseService.getClient()
                    .from('shop_items')
                    .select('*')
                    .eq('id', receiptItem.item_id)
                    .single()
                ).pipe(
                    map(itemResult => {
                        const item = itemResult.data ? this.mapItemFromDb(itemResult.data) : null;
                        return this.mapReceiptItemFromDb(receiptItem, item);
                    })
                );
            })
        );
    }

    /**
     * Update an existing receipt item
     */
    updateReceiptItem(id: string, receiptItem: Partial<ReceiptItem>): Observable<ReceiptItemExtended> {
        const itemData: any = {};
        if (receiptItem.itemId !== undefined) itemData.item_id = receiptItem.itemId;
        if (receiptItem.quantity !== undefined) itemData.quantity = receiptItem.quantity;
        if (receiptItem.unitPrice !== undefined) itemData.unit_price = receiptItem.unitPrice;
        if (receiptItem.totalPrice !== undefined) itemData.total_price = receiptItem.totalPrice;
        if (receiptItem.expirationDate !== undefined) {
            itemData.expiration_date = receiptItem.expirationDate 
                ? this.formatDateForDb(receiptItem.expirationDate) 
                : null;
        }
        if (receiptItem.isFinished !== undefined) itemData.is_finished = receiptItem.isFinished;
        if (receiptItem.wouldRebuy !== undefined) itemData.would_rebuy = receiptItem.wouldRebuy;
        if (receiptItem.notes !== undefined) itemData.notes = receiptItem.notes;

        return from(this.supabaseService.getClient()
            .from('shop_receipt_items')
            .update(itemData)
            .eq('id', id)
            .select('*')
            .single()
        ).pipe(
            switchMap(result => {
                if (result.error) throw result.error;
                const receiptItem = result.data;
                
                if (!receiptItem.item_id) {
                    return of(this.mapReceiptItemFromDb(receiptItem, null));
                }
                
                return from(this.supabaseService.getClient()
                    .from('shop_items')
                    .select('*')
                    .eq('id', receiptItem.item_id)
                    .single()
                ).pipe(
                    map(itemResult => {
                        const item = itemResult.data ? this.mapItemFromDb(itemResult.data) : null;
                        return this.mapReceiptItemFromDb(receiptItem, item);
                    })
                );
            })
        );
    }

    /**
     * Mark item as finished
     */
    markAsConsumed(id: string, wouldRebuy?: number): Observable<ReceiptItemExtended> {
        const updateData: any = { is_finished: true };
        if (wouldRebuy !== undefined) updateData.would_rebuy = wouldRebuy;

        return from(this.supabaseService.getClient()
            .from('shop_receipt_items')
            .update(updateData)
            .eq('id', id)
            .select('*')
            .single()
        ).pipe(
            switchMap(result => {
                if (result.error) throw result.error;
                const receiptItem = result.data;
                
                if (!receiptItem.item_id) {
                    return of(this.mapReceiptItemFromDb(receiptItem, null));
                }
                
                return from(this.supabaseService.getClient()
                    .from('shop_items')
                    .select('*')
                    .eq('id', receiptItem.item_id)
                    .single()
                ).pipe(
                    map(itemResult => {
                        const item = itemResult.data ? this.mapItemFromDb(itemResult.data) : null;
                        return this.mapReceiptItemFromDb(receiptItem, item);
                    })
                );
            })
        );
    }

    /**
     * Delete a receipt item
     */
    deleteReceiptItem(id: string): Observable<boolean> {
        return from(this.supabaseService.getClient()
            .from('shop_receipt_items')
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
     * Map database item to Item interface
     */
    private mapItemFromDb(data: any): Item {
        return {
            id: data.id,
            name: data.name,
            category: data.category || null,
            description: data.description || null,
            createdAt: new Date(data.created_at)
        };
    }

    /**
     * Map database receipt item to ReceiptItemExtended interface
     */
    private mapReceiptItemFromDb(data: any, item: Item | null = null): ReceiptItemExtended {
        // If item is not provided, try to get it from data.item (for backward compatibility)
        const mappedItem = item || (data.item ? this.mapItemFromDb(data.item) : null);
        
        return {
            id: data.id,
            receiptId: data.receipt_id,
            itemId: data.item_id,
            quantity: parseFloat(data.quantity),
            unitPrice: parseFloat(data.unit_price),
            totalPrice: parseFloat(data.total_price),
            expirationDate: data.expiration_date ? this.parseLocalDate(data.expiration_date) : null,
            isFinished: data.is_finished || false,
            wouldRebuy: data.would_rebuy || null,
            notes: data.notes || null,
            createdAt: new Date(data.created_at),
            item: mappedItem
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

