import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ReceiptService } from '../services/receipt.service';
import { ReceiptExtended, Store } from '../interfaces';
import { AddReceiptComponent } from '../add-receipt/add-receipt.component';

@Component({
    selector: 'app-receipt-list',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        CalendarModule,
        DropdownModule,
        FormsModule,
        TagModule,
        ProgressSpinnerModule,
        MessageModule,
        IconFieldModule,
        InputIconModule,
        AddReceiptComponent
    ],
    template: `
        <div class="card">
            <div class="flex justify-content-between align-items-center mb-6">
                <h2 class="m-0">Receipts</h2>
                <p-button 
                    label="Add Receipt" 
                    icon="pi pi-plus" 
                    (click)="openNewReceipt()"
                    severity="secondary">
                </p-button>
            </div>

            <!-- Filters -->
            <div class="grid mb-4" style="gap: 1.5rem;">
                <div class="col-12 md:col-4">
                    <div class="flex flex-col gap-2">
                        <label for="storeFilter" class="block text-sm font-medium">Store</label>
                        <p-dropdown 
                            id="storeFilter"
                            [options]="stores" 
                            [(ngModel)]="selectedStore"
                            optionLabel="name" 
                            placeholder="All Stores"
                            [showClear]="true"
                            (onChange)="filterReceipts()"
                            class="w-full">
                        </p-dropdown>
                    </div>
                </div>
                <div class="col-12 md:col-4">
                    <div class="flex flex-col gap-2">
                        <label for="dateFrom" class="block text-sm font-medium">From Date</label>
                        <p-calendar 
                            id="dateFrom"
                            [(ngModel)]="dateFrom" 
                            (onSelect)="filterReceipts()"
                            [showIcon]="true"
                            dateFormat="mm/dd/yy"
                            placeholder="Select Date"
                            [showClear]="true"
                            class="w-full">
                        </p-calendar>
                    </div>
                </div>
                <div class="col-12 md:col-4">
                    <div class="flex flex-col gap-2">
                        <label for="dateTo" class="block text-sm font-medium">To Date</label>
                        <p-calendar 
                            id="dateTo"
                            [(ngModel)]="dateTo" 
                            (onSelect)="filterReceipts()"
                            [showIcon]="true"
                            dateFormat="mm/dd/yy"
                            placeholder="Select Date"
                            [showClear]="true"
                            class="w-full">
                        </p-calendar>
                    </div>
                </div>

            <!-- Search -->
                <div class="col-12 md:col-4">
                    <div class="flex flex-col gap-2">
                        <label for="searchInput" class="block text-sm font-medium">Search Receipts</label>
                        <p-iconfield iconPosition="left" class="w-full">
                            <p-inputicon class="pi pi-search" />
                            <input 
                                id="searchInput"
                                pInputText 
                                type="text" 
                                [(ngModel)]="searchText"
                                (input)="filterReceipts()"
                                placeholder="Search receipts..." 
                                class="w-full" />
                        </p-iconfield>
                    </div>
                </div>
            </div>

            <!-- Loading -->
            <div *ngIf="loading" class="flex justify-content-center p-4">
                <p-progressSpinner></p-progressSpinner>
            </div>

            <!-- Empty State -->
            <div *ngIf="!loading && filteredReceipts.length === 0" class="text-center p-4">
                <p-message severity="info" text="No receipts found"></p-message>
            </div>

            <!-- Receipt Cards -->
            <div *ngIf="!loading && filteredReceipts.length > 0" class="grid">
                <div *ngFor="let receipt of filteredReceipts" class="col-12 md:col-6 lg:col-4">
                    <div 
                        class="card mb-0 receipt-card"
                        [style]="{ 'cursor': 'pointer' }"
                        (click)="viewReceipt(receipt.id)">
                        <div class="flex justify-between mb-4">
                            <div>
                                <span class="block text-muted-color font-medium mb-4">{{ receipt.store?.name || 'Unknown Store' }}</span>
                                <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ '$' + formatCurrency(receipt.total) }}</div>
                            </div>
                            <div class="flex items-center justify-center bg-primary-100 dark:bg-primary-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                                <i class="pi pi-shopping-cart text-primary !text-xl"></i>
                            </div>
                        </div>
                        <div>
                            <span class="text-muted-color text-sm">{{ formatDate(receipt.receiptDate) }}</span>
                            <span *ngIf="receipt.paymentMethod" class="text-muted-color text-sm">
                                <span *ngIf="receipt.cardLastFour"> • </span>{{ receipt.paymentMethod }}
                                <span *ngIf="receipt.cardLastFour"> •••• {{ receipt.cardLastFour }}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Add Receipt Dialog -->
            <app-add-receipt 
                [(visible)]="showAddReceiptDialog"
                (receiptAdded)="onReceiptAdded()">
            </app-add-receipt>
        </div>
    `,
    styles: [`
        .receipt-card {
            transition: all 0.3s ease;
            border: 1px solid var(--surface-border);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            background: var(--surface-card);
        }
        .receipt-card:hover {
            transform: translateY(-6px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            border-color: var(--primary-color);
        }
    `]
})
export class ReceiptListComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    
    receipts: ReceiptExtended[] = [];
    filteredReceipts: ReceiptExtended[] = [];
    stores: Store[] = [];
    selectedStore: Store | null = null;
    showAddReceiptDialog: boolean = false;
    dateFrom: Date | null = null;
    dateTo: Date | null = null;
    searchText: string = '';
    loading: boolean = false;

    constructor(
        private receiptService: ReceiptService,
        private router: Router
    ) {}

    ngOnInit() {
        this.loadData();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadData() {
        this.loading = true;
        
        // Load stores
        this.receiptService.getStores()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (stores) => {
                    this.stores = stores;
                },
                error: (error) => {
                    console.error('Error loading stores:', error);
                }
            });

        // Load receipts
        this.receiptService.getReceipts()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (receipts) => {
                    this.receipts = receipts;
                    this.filteredReceipts = receipts;
                    this.loading = false;
                },
                error: (error) => {
                    console.error('Error loading receipts:', error);
                    this.loading = false;
                }
            });
    }

    filterReceipts() {
        let filtered = [...this.receipts];

        // Filter by store
        if (this.selectedStore) {
            filtered = filtered.filter(r => r.storeId === this.selectedStore!.id);
        }

        // Filter by date range
        if (this.dateFrom) {
            filtered = filtered.filter(r => r.receiptDate >= this.dateFrom!);
        }
        if (this.dateTo) {
            filtered = filtered.filter(r => r.receiptDate <= this.dateTo!);
        }

        // Filter by search text
        if (this.searchText) {
            const searchLower = this.searchText.toLowerCase();
            filtered = filtered.filter(r => 
                r.store?.name?.toLowerCase().includes(searchLower) ||
                r.paymentMethod?.toLowerCase().includes(searchLower) ||
                r.notes?.toLowerCase().includes(searchLower)
            );
        }

        this.filteredReceipts = filtered;
    }

    viewReceipt(id: string) {
        this.router.navigate(['/shopping/receipts', id]);
    }

    openNewReceipt() {
        this.showAddReceiptDialog = true;
    }

    onReceiptAdded() {
        this.loadData();
        this.showAddReceiptDialog = false;
    }

    formatDate(date: Date): string {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getAddress(store: Store | null): string {
        if (!store) return '';
        const parts = [store.address, store.city, store.state, store.zipCode].filter(Boolean);
        return parts.join(', ');
    }

    formatCurrency(value: number): string {
        return value.toFixed(2);
    }
}

