import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { TabViewModule } from 'primeng/tabview';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ReceiptItemService } from '../services/receipt-item.service';
import { ReceiptItemExtended } from '../interfaces';
import { IconField } from "primeng/iconfield";
import { InputIcon } from "primeng/inputicon";

@Component({
    selector: 'app-items-management',
    standalone: true,
    imports: [
    CommonModule,
    TabViewModule,
    TableModule,
    ButtonModule,
    CalendarModule,
    DropdownModule,
    DialogModule,
    FormsModule,
    TagModule,
    ProgressSpinnerModule,
    MessageModule,
    ToastModule,
    ConfirmDialogModule,
    InputTextModule,
    IconField,
    InputIcon
],
    providers: [MessageService, ConfirmationService],
    template: `
        <div class="card">
            <p-toast></p-toast>
            <p-confirmDialog></p-confirmDialog>
            
            <h2 class="mb-4">Items Management</h2>

            <p-tabView>
                <!-- Not Finished Tab -->
                <p-tabPanel header="Not Finished">
                    <div class="mb-4">
                        <div class="grid">
                            <div class="col-12 md:col-4">
                                <label for="categoryFilter" class="block text-sm font-medium mb-2">Category</label>
                                <p-dropdown 
                                    id="categoryFilter"
                                    [options]="categories" 
                                    [(ngModel)]="selectedCategory"
                                    placeholder="All Categories"
                                    [showClear]="true"
                                    (onChange)="filterUnconsumedItems()"
                                    class="w-full">
                                </p-dropdown>
                            </div>
                            <div class="col-12 md:col-4 mt-4">
                                    <div class="flex flex-col gap-2">
                                        <label for="searchInput" class="block text-sm font-medium">Search Items</label>
                                        <p-iconfield iconPosition="left" class="w-full">
                                            <p-inputicon class="pi pi-search" />
                                            <input 
                                                id="searchInput"
                                                pInputText 
                                                type="text" 
                                                [(ngModel)]="searchText"
                                                (input)="filterUnconsumedItems()"
                                                placeholder="Search items..." 
                                                class="w-full" />
                                        </p-iconfield>
                                    </div>
                                </div>
                        </div>
                    </div>

                    <div *ngIf="unconsumedLoading" class="flex justify-content-center p-4">
                        <p-progressSpinner></p-progressSpinner>
                    </div>

                    <div *ngIf="!unconsumedLoading && filteredUnconsumedItems.length === 0" class="text-center p-4">
                        <p-message severity="info" text="No unconsumed items found"></p-message>
                    </div>

                    <p-table 
                        *ngIf="!unconsumedLoading && filteredUnconsumedItems.length > 0"
                        [value]="filteredUnconsumedItems" 
                        [paginator]="true"
                        [rows]="20"
                        [rowsPerPageOptions]="[10, 20, 50]"
                        styleClass="p-datatable-sm">
                        <ng-template pTemplate="header">
                            <tr>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Quantity</th>
                                <th>Expiration Date</th>
                                <th>Days Until Expiration</th>
                                <th>Actions</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-item>
                            <tr [ngClass]="{'expiring-soon': getDaysUntilExpiration(item) <= 3 && getDaysUntilExpiration(item) > 0, 'expired': getDaysUntilExpiration(item) < 0}">
                                <td>{{ item.item?.name || 'Unknown Item' }}</td>
                                <td>
                                    <p-tag 
                                        *ngIf="item.item?.category" 
                                        [value]="item.item.category" 
                                        severity="secondary">
                                    </p-tag>
                                </td>
                                <td>{{ item.quantity }}</td>
                                <td>
                                    <span *ngIf="item.expirationDate">
                                        {{ formatDate(item.expirationDate) }}
                                    </span>
                                    <span *ngIf="!item.expirationDate" class="text-600">Not set</span>
                                </td>
                                <td>
                                    <p-tag 
                                        *ngIf="item.expirationDate"
                                        [value]="getExpirationStatus(item)" 
                                        [severity]="getExpirationSeverity(item)">
                                    </p-tag>
                                    <span *ngIf="!item.expirationDate" class="text-600">-</span>
                                </td>
                                <td>
                                    <div class="flex gap-2">
                                        <p-button 
                                            icon="pi pi-calendar" 
                                            [text]="true"
                                            size="small"
                                            pTooltip="Set Expiration Date"
                                            (click)="openExpirationDialog(item)">
                                        </p-button>
                                        <p-button 
                                            icon="pi pi-check" 
                                            [text]="true"
                                            size="small"
                                            severity="success"
                                            pTooltip="Mark as Finished"
                                            (click)="markAsFinished(item)">
                                        </p-button>
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </p-tabPanel>

                <!-- Finished Tab -->
                <p-tabPanel header="Finished">
                    <div class="mb-4 flex justify-content-between align-items-center">
                        <div class="flex gap-2">
                            <p-dropdown 
                                [options]="rebuyRatings" 
                                [(ngModel)]="selectedRebuyRating"
                                optionLabel="label"
                                placeholder="All Ratings"
                                [showClear]="true"
                                (onChange)="filterConsumedItems()"
                                class="w-full">
                            </p-dropdown>
                        </div>
                        <p-button 
                            label="Generate Grocery List" 
                            icon="pi pi-list" 
                            (click)="generateGroceryList()"
                            severity="secondary">
                        </p-button>
                    </div>

                    <div *ngIf="consumedLoading" class="flex justify-content-center p-4">
                        <p-progressSpinner></p-progressSpinner>
                    </div>

                    <div *ngIf="!consumedLoading && filteredConsumedItems.length === 0" class="text-center p-4">
                        <p-message severity="info" text="No finished items found"></p-message>
                    </div>

                    <p-table 
                        *ngIf="!consumedLoading && filteredConsumedItems.length > 0"
                        [value]="filteredConsumedItems" 
                        [paginator]="true"
                        [rows]="20"
                        [rowsPerPageOptions]="[10, 20, 50]"
                        styleClass="p-datatable-sm">
                        <ng-template pTemplate="header">
                            <tr>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Quantity</th>
                                <th>Rebuy Rating</th>
                                <th>Notes</th>
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
                                </td>
                                <td>{{ item.quantity }}</td>
                                <td>
                                    <p-tag 
                                        *ngIf="item.wouldRebuy"
                                        [value]="getRebuyRatingLabel(item.wouldRebuy)" 
                                        [severity]="getRebuyRatingSeverity(item.wouldRebuy)">
                                    </p-tag>
                                    <span *ngIf="!item.wouldRebuy" class="text-600">Not rated</span>
                                </td>
                                <td>{{ item.notes || '-' }}</td>
                            </tr>
                        </ng-template>
                    </p-table>
                </p-tabPanel>
            </p-tabView>
        </div>

        <!-- Expiration Date Dialog -->
        <p-dialog 
            header="Set Expiration Date" 
            [(visible)]="expirationDialogVisible"
            [modal]="true"
            [style]="{ width: '400px' }">
            <div class="flex flex-column gap-3">
                <div>
                    <label class="block text-sm font-medium mb-2">Item</label>
                    <div class="text-600">{{ editingItem?.item?.name }}</div>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Expiration Date</label>
                    <p-calendar 
                        [(ngModel)]="expirationDate" 
                        [showIcon]="true"
                        dateFormat="mm/dd/yy"
                        placeholder="Select Date"
                        [showClear]="true"
                        class="w-full">
                    </p-calendar>
                </div>
            </div>
            <ng-template pTemplate="footer">
                <p-button 
                    label="Cancel" 
                    icon="pi pi-times" 
                    (click)="closeExpirationDialog()"
                    [text]="true">
                </p-button>
                <p-button 
                    label="Save" 
                    icon="pi pi-check" 
                    (click)="saveExpirationDate()"
                    severity="secondary">
                </p-button>
            </ng-template>
        </p-dialog>

        <!-- Grocery List Dialog -->
        <p-dialog 
            header="Grocery List (Staples)" 
            [(visible)]="groceryListDialogVisible"
            [modal]="true"
            [style]="{ width: '600px' }">
            <div *ngIf="groceryListItems.length === 0" class="text-center p-4">
                <p-message severity="info" text="No staple items found"></p-message>
            </div>
            <ul *ngIf="groceryListItems.length > 0" class="list-none p-0">
                <li *ngFor="let item of groceryListItems" class="p-2 border-bottom-1 surface-border">
                    <div class="flex align-items-center gap-2">
                        <i class="pi pi-circle-fill text-primary" style="font-size: 0.5rem"></i>
                        <span>{{ item.item?.name }}</span>
                        <span class="text-600 text-sm ml-auto">Qty: {{ item.quantity }}</span>
                    </div>
                </li>
            </ul>
            <ng-template pTemplate="footer">
                <p-button 
                    label="Close" 
                    icon="pi pi-times" 
                    (click)="groceryListDialogVisible = false"
                    severity="secondary">
                </p-button>
                <p-button 
                    label="Print" 
                    icon="pi pi-print" 
                    (click)="printGroceryList()">
                </p-button>
            </ng-template>
        </p-dialog>
    `,
    styles: [`
        .expiring-soon {
            background-color: rgba(255, 193, 7, 0.1);
        }
        .expired {
            background-color: rgba(244, 67, 54, 0.1);
        }
    `]
})
export class ItemsManagementComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    unconsumedItems: ReceiptItemExtended[] = [];
    filteredUnconsumedItems: ReceiptItemExtended[] = [];
    consumedItems: ReceiptItemExtended[] = [];
    filteredConsumedItems: ReceiptItemExtended[] = [];
    groceryListItems: ReceiptItemExtended[] = [];
    
    unconsumedLoading: boolean = false;
    consumedLoading: boolean = false;
    
    categories: string[] = [];
    selectedCategory: string | null = null;
    searchText: string = '';
    
    rebuyRatings = [
        { value: 1, label: 'Staple' },
        { value: 2, label: 'Very Good' },
        { value: 3, label: 'Good' },
        { value: 4, label: 'Bad' }
    ];
    selectedRebuyRating: any = null;
    
    expirationDialogVisible: boolean = false;
    editingItem: ReceiptItemExtended | null = null;
    expirationDate: Date | null = null;
    
    groceryListDialogVisible: boolean = false;

    constructor(
        private receiptItemService: ReceiptItemService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit() {
        this.loadUnconsumedItems();
        this.loadConsumedItems();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadUnconsumedItems() {
        this.unconsumedLoading = true;
        this.receiptItemService.getUnconsumedItems()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (items) => {
                    this.unconsumedItems = items;
                    this.filteredUnconsumedItems = items;
                    this.extractCategories();
                    this.unconsumedLoading = false;
                },
                error: (error) => {
                    console.error('Error loading unconsumed items:', error);
                    this.unconsumedLoading = false;
                }
            });
    }

    loadConsumedItems() {
        this.consumedLoading = true;
        this.receiptItemService.getConsumedItems()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (items) => {
                    this.consumedItems = items;
                    this.filteredConsumedItems = items;
                    this.consumedLoading = false;
                },
                error: (error) => {
                    console.error('Error loading consumed items:', error);
                    this.consumedLoading = false;
                }
            });
    }

    extractCategories() {
        const categorySet = new Set<string>();
        this.unconsumedItems.forEach(item => {
            if (item.item?.category) {
                categorySet.add(item.item.category);
            }
        });
        this.categories = Array.from(categorySet).sort();
    }

    filterUnconsumedItems() {
        let filtered = [...this.unconsumedItems];

        if (this.selectedCategory) {
            filtered = filtered.filter(item => item.item?.category === this.selectedCategory);
        }

        if (this.searchText) {
            const searchLower = this.searchText.toLowerCase();
            filtered = filtered.filter(item => 
                item.item?.name?.toLowerCase().includes(searchLower)
            );
        }

        this.filteredUnconsumedItems = filtered;
    }

    filterConsumedItems() {
        let filtered = [...this.consumedItems];

        if (this.selectedRebuyRating) {
            filtered = filtered.filter(item => item.wouldRebuy === this.selectedRebuyRating.value);
        }

        this.filteredConsumedItems = filtered;
    }

    openExpirationDialog(item: ReceiptItemExtended) {
        this.editingItem = item;
        this.expirationDate = item.expirationDate ? new Date(item.expirationDate) : null;
        this.expirationDialogVisible = true;
    }

    closeExpirationDialog() {
        this.expirationDialogVisible = false;
        this.editingItem = null;
        this.expirationDate = null;
    }

    saveExpirationDate() {
        if (!this.editingItem) return;

        this.receiptItemService.updateReceiptItem(this.editingItem.id, {
            expirationDate: this.expirationDate || undefined
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Expiration date updated'
                    });
                    this.closeExpirationDialog();
                    this.loadUnconsumedItems();
                },
                error: (error) => {
                    console.error('Error updating expiration date:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to update expiration date'
                    });
                }
            });
    }

    markAsFinished(item: ReceiptItemExtended) {
        this.confirmationService.confirm({
            message: `Mark "${item.item?.name}" as finished?`,
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.receiptItemService.markAsConsumed(item.id)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: () => {
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Success',
                                detail: 'Item marked as finished'
                            });
                            this.loadUnconsumedItems();
                            this.loadConsumedItems();
                        },
                        error: (error) => {
                            console.error('Error marking item as finished:', error);
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail: 'Failed to mark item as finished'
                            });
                        }
                    });
            }
        });
    }

    generateGroceryList() {
        this.receiptItemService.getGroceryListItems()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (items) => {
                    this.groceryListItems = items;
                    this.groceryListDialogVisible = true;
                },
                error: (error) => {
                    console.error('Error loading grocery list:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to load grocery list'
                    });
                }
            });
    }

    printGroceryList() {
        window.print();
    }

    getDaysUntilExpiration(item: ReceiptItemExtended): number {
        if (!item.expirationDate) return Infinity;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiration = new Date(item.expirationDate);
        expiration.setHours(0, 0, 0, 0);
        const diffTime = expiration.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    getExpirationStatus(item: ReceiptItemExtended): string {
        const days = this.getDaysUntilExpiration(item);
        if (days < 0) return 'Expired';
        if (days === 0) return 'Expires Today';
        if (days === 1) return '1 day';
        return `${days} days`;
    }

    getExpirationSeverity(item: ReceiptItemExtended): string {
        const days = this.getDaysUntilExpiration(item);
        if (days < 0) return 'danger';
        if (days <= 3) return 'warning';
        if (days <= 7) return 'info';
        return 'success';
    }

    getRebuyRatingLabel(rating: number): string {
        const ratingObj = this.rebuyRatings.find(r => r.value === rating);
        return ratingObj?.label || 'Unknown';
    }

    getRebuyRatingSeverity(rating: number): string {
        if (rating === 1) return 'success';
        if (rating === 2) return 'info';
        if (rating === 3) return 'warning';
        return 'danger';
    }

    formatDate(date: Date): string {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

