import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ReceiptService } from '../services/receipt.service';
import { ReceiptItemService } from '../services/receipt-item.service';
import { ReceiptExtended, ReceiptItemExtended } from '../interfaces';

@Component({
    selector: 'app-receipt-details',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        CardModule,
        ButtonModule,
        TableModule,
        TagModule,
        ProgressSpinnerModule,
        MessageModule
    ],
    template: `
        <div class="card">
            <!-- Back Button -->
            <div class="mb-4">
                <p-button 
                    label="Back to Receipts" 
                    icon="pi pi-arrow-left" 
                    (click)="goBack()"
                    severity="secondary"
                    [text]="true">
                </p-button>
            </div>

            <!-- Loading -->
            <div *ngIf="loading" class="flex justify-content-center p-4">
                <p-progressSpinner></p-progressSpinner>
            </div>

            <!-- Error -->
            <div *ngIf="!loading && !receipt" class="p-4">
                <p-message severity="error" text="Receipt not found"></p-message>
            </div>

            <!-- Receipt Details -->
            <div *ngIf="!loading && receipt">
                <!-- Receipt Header -->
                <p-card class="mb-4">
                    <ng-template pTemplate="header">
                        <div class="p-3 bg-primary text-primary-contrast">
                            <div class="text-2xl font-bold">{{ receipt.store?.name || 'Unknown Store' }}</div>
                            <div class="text-sm mt-1">{{ formatDate(receipt.receiptDate) }}</div>
                        </div>
                    </ng-template>
                    <ng-template pTemplate="content">
                        <div class="flex flex-column gap-4">
                            <div *ngIf="receipt.store?.address" class="flex flex-column gap-1">
                                <strong class="text-sm text-600 uppercase">Address</strong>
                                <div class="text-900">{{ getAddress(receipt.store) }}</div>
                            </div>
                            <div *ngIf="receipt.paymentMethod" class="flex flex-column gap-1">
                                <strong class="text-sm text-600 uppercase">Payment Method</strong>
                                <div class="text-900">
                                    {{ receipt.paymentMethod }}
                                    <span *ngIf="receipt.cardLastFour" class="text-600"> •••• {{ receipt.cardLastFour }}</span>
                                </div>
                            </div>
                            <div class="flex flex-column gap-1">
                                <div class="text-900">
                                    <strong class="text-sm text-600 uppercase">Subtotal</strong>
                                </div>
                                <div class="text-900">{{ '$' + formatCurrency(receipt.subtotal) }}</div>
                            </div>
                            <div class="flex flex-column gap-1">
                                <div class="text-900">
                                    <strong class="text-sm text-600 uppercase">Tax</strong>
                                </div>
                                <div class="text-900">{{ '$' + formatCurrency(receipt.tax) }}</div>
                            </div>
                            <div class="flex flex-column gap-1">
                                <div class="text-900">
                                    <strong class="text-sm text-600 uppercase">Total</strong>
                                </div>
                                <div class="text-primary font-bold">{{ '$' + formatCurrency(receipt.total) }}</div>
                            </div>
                            <div *ngIf="receipt.notes" class="flex flex-column gap-1">
                                <div class="flex flex-column gap-2">
                                    <strong class="text-sm text-600 uppercase">Notes</strong>
                                    <div class="text-900">{{ receipt.notes }}</div>
                                </div>
                            </div>
                        </div>
                    </ng-template>
                </p-card>

                <!-- Items Table -->
                <p-card header="Items">
                    <ng-template pTemplate="content">
                        <div *ngIf="itemsLoading" class="flex justify-content-center p-4">
                            <p-progressSpinner></p-progressSpinner>
                        </div>
                        <div *ngIf="!itemsLoading && items.length === 0" class="text-center p-4">
                            <p-message severity="info" text="No items found for this receipt"></p-message>
                        </div>
                        <p-table 
                            *ngIf="!itemsLoading && items.length > 0"
                            [value]="items" 
                            [paginator]="false"
                            [rows]="50"
                            styleClass="p-datatable-sm">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>Name</th>
                                    <th>Category</th>
                                    <th class="text-right">Quantity</th>
                                    <th class="text-right">Unit Price</th>
                                    <th class="text-right">Total Price</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-item>
                                <tr>
                                    <td>{{ item.item?.name || 'Unknown Item' }}</td>
                                    <td>
                                        <p-tag 
                                            *ngIf="item.item?.category" 
                                            [value]="item.item.category" 
                                            severity="secondary">
                                        </p-tag>
                                        <span *ngIf="!item.item?.category" class="text-600">-</span>
                                    </td>
                                    <td class="text-right">{{ item.quantity }}</td>
                                    <td class="text-right">{{ '$' + formatCurrency(item.unitPrice) }}</td>
                                    <td class="text-right font-bold">{{ '$' + formatCurrency(item.totalPrice) }}</td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="footer">
                                <tr>
                                    <td colspan="3" class="text-right font-bold">Total:</td>
                                    <td colspan="2" class="text-right font-bold text-primary">
                                        {{ '$' + formatCurrency(getItemsTotal()) }}
                                    </td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </ng-template>
                </p-card>
            </div>
        </div>
    `
})
export class ReceiptDetailsComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    
    receipt: ReceiptExtended | null = null;
    items: ReceiptItemExtended[] = [];
    loading: boolean = false;
    itemsLoading: boolean = false;
    receiptId: string | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private receiptService: ReceiptService,
        private receiptItemService: ReceiptItemService
    ) {}

    ngOnInit() {
        this.route.paramMap
            .pipe(takeUntil(this.destroy$))
            .subscribe(params => {
                this.receiptId = params.get('id');
                if (this.receiptId) {
                    this.loadReceipt();
                }
            });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadReceipt() {
        if (!this.receiptId) return;

        this.loading = true;
        this.receiptService.getReceipt(this.receiptId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (receipt) => {
                    this.receipt = receipt;
                    this.loading = false;
                    this.loadItems();
                },
                error: (error) => {
                    console.error('Error loading receipt:', error);
                    this.loading = false;
                }
            });
    }

    loadItems() {
        if (!this.receiptId) return;

        this.itemsLoading = true;
        this.receiptItemService.getReceiptItems(this.receiptId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (items) => {
                    this.items = items;
                    this.itemsLoading = false;
                },
                error: (error) => {
                    console.error('Error loading items:', error);
                    this.itemsLoading = false;
                }
            });
    }

    goBack() {
        this.router.navigate(['/shopping/receipts']);
    }

    formatDate(date: Date): string {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    getAddress(store: any): string {
        if (!store) return '';
        const parts = [store.address, store.city, store.state, store.zipCode].filter(Boolean);
        return parts.join(', ');
    }

    getItemsTotal(): number {
        return this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    }

    formatCurrency(value: number): string {
        return value.toFixed(2);
    }
}



