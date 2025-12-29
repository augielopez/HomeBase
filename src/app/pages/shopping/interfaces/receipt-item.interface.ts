import { Item } from './item.interface';

export interface ReceiptItem {
    id: string; // UUID
    receiptId: string; // UUID
    itemId: string; // UUID
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    expirationDate: Date | null;
    isFinished: boolean;
    wouldRebuy: number | null; // 1-4 rating
    notes: string | null;
    createdAt: Date;
}

export interface ReceiptItemExtended extends ReceiptItem {
    item: Item | null;
}

