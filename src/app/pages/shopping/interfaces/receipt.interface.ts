import { Store } from './store.interface';

export interface Receipt {
    id: string; // UUID
    storeId: string; // UUID
    receiptDate: Date;
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: string | null;
    cardLastFour: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ReceiptExtended extends Receipt {
    store: Store | null;
}

