import { Component, EventEmitter, Input, Output, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ReceiptParserService, ParsedReceipt, ParsedReceiptItem } from '../services/receipt-parser.service';
import { ReceiptService } from '../services/receipt.service';
import { ReceiptItemService } from '../services/receipt-item.service';
import { forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

@Component({
    selector: 'app-add-receipt',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        ButtonModule,
        InputTextModule,
        InputTextarea,
        CalendarModule,
        DropdownModule,
        TableModule,
        ProgressSpinnerModule,
        MessageModule,
        ToastModule,
        TooltipModule
    ],
    providers: [MessageService],
    template: `
        <p-dialog 
            header="Add Receipt" 
            [(visible)]="visible"
            [modal]="true" 
            [style]="{ width: '90vw', maxWidth: '900px' }"
            [closable]="!parsing && !saving"
            (onHide)="onClose()"
            [blockScroll]="true">
            
            <p-toast></p-toast>
            
            <ng-template pTemplate="footer">
                <div class="flex justify-content-end gap-2" *ngIf="step === 2">
                    <p-button 
                        label="Back" 
                        severity="secondary"
                        [outlined]="true"
                        (click)="step = 1"
                        [disabled]="saving">
                    </p-button>
                    <p-button 
                        label="Cancel" 
                        severity="secondary"
                        [outlined]="true"
                        (click)="onClose()"
                        [disabled]="saving">
                    </p-button>
                    <p-button 
                        label="Confirm & Insert" 
                        icon="pi pi-check"
                        (click)="confirmAndInsert()"
                        [loading]="saving"
                        [disabled]="!isFormValid()">
                    </p-button>
                </div>
            </ng-template>

            <!-- Step 1: Paste Receipt Text -->
            <div *ngIf="step === 1" class="flex flex-column gap-4">
                <div>
                    <label for="receiptText" class="block text-sm font-medium mb-2">
                        Paste Receipt Text
                    </label>
                    <textarea 
                        id="receiptText"
                        pInputTextarea 
                        [(ngModel)]="receiptText"
                        placeholder="Paste your receipt text here (from OCR, website, or manually typed)..."
                        rows="10"
                        class="w-full"
                        [disabled]="parsing">
                    </textarea>
                    <small class="text-600 mt-1 block">
                        Paste the receipt text from your receipt scan, website, or type it manually. ChatGPT will extract the store, date, items, and totals.
                    </small>
                </div>

                <div *ngIf="parseError" class="mb-4">
                    <p-message severity="error" [text]="parseError"></p-message>
                </div>

                <div class="flex justify-content-end gap-2">
                    <p-button 
                        label="Cancel" 
                        severity="secondary"
                        [outlined]="true"
                        (click)="onClose()"
                        [disabled]="parsing">
                    </p-button>
                    <p-button 
                        label="Parse Receipt" 
                        icon="pi pi-search"
                        (click)="parseReceipt()"
                        [loading]="parsing"
                        [disabled]="!receiptText || receiptText.trim().length === 0">
                    </p-button>
                </div>
            </div>

            <!-- Step 2: Review and Edit Parsed Data -->
            <div *ngIf="step === 2" class="flex flex-column gap-4">
                <div *ngIf="parsedData">
                    <!-- Store Information -->
                    <div class="grid">
                        <div class="col-12 md:col-6">
                            <div class="flex flex-column gap-2 mb-4">
                                <label for="storeName" class="block text-sm font-medium" style="min-width: 140px;">Store Name *</label>
                                <input 
                                    id="storeName"
                                    pInputText 
                                    [(ngModel)]="parsedData.store.name"
                                    placeholder="Store Name"
                                    class="w-full" />
                            </div>
                        </div>
                        <div class="col-12 md:col-6">
                            <div class="flex flex-column gap-2 mb-4">
                                <label for="receiptDate" class="block text-sm font-medium" style="min-width: 140px;">Receipt Date *</label>
                                <p-calendar 
                                    id="receiptDate"
                                    [(ngModel)]="receiptDate" 
                                    [showIcon]="true"
                                    dateFormat="mm/dd/yy"
                                    placeholder="Select Date"
                                    class="w-full">
                                </p-calendar>
                            </div>
                        </div>
                        <div class="col-12 md:col-6">
                            <div class="flex flex-column gap-2 mb-4">
                                <label for="storeAddress" class="block text-sm font-medium" style="min-width: 140px;">Address</label>
                                <input 
                                    id="storeAddress"
                                    pInputText 
                                    [(ngModel)]="parsedData.store.address"
                                    placeholder="Street Address"
                                    class="w-full" />
                            </div>
                        </div>
                        <div class="col-12 md:col-3">
                            <div class="flex flex-column gap-2 mb-4">
                                <label for="storeCity" class="block text-sm font-medium" style="min-width: 140px;">City</label>
                                <input 
                                    id="storeCity"
                                    pInputText 
                                    [(ngModel)]="parsedData.store.city"
                                    placeholder="City"
                                    class="w-full" />
                            </div>
                        </div>
                        <div class="col-12 md:col-1">
                            <div class="flex flex-column gap-2 mb-4">
                                <label for="storeState" class="block text-sm font-medium" style="min-width: 140px;">State</label>
                                <input 
                                    id="storeState"
                                    pInputText 
                                    [(ngModel)]="parsedData.store.state"
                                    placeholder="CA"
                                    maxlength="2"
                                    class="w-full" />
                            </div>
                        </div>
                        <div class="col-12 md:col-2">
                            <div class="flex flex-column gap-2 mb-4">
                                <label for="storeZip" class="block text-sm font-medium" style="min-width: 140px;">ZIP</label>
                                <input 
                                    id="storeZip"
                                    pInputText 
                                    [(ngModel)]="parsedData.store.zipCode"
                                    placeholder="ZIP Code"
                                    class="w-full" />
                            </div>
                        </div>
                    </div>

                    <!-- Payment Information -->
                    <div class="grid">
                        <div class="col-12 md:col-6">
                            <div class="flex flex-column gap-2 mb-4">
                                <label for="paymentMethod" class="block text-sm font-medium" style="min-width: 140px;">Payment Method</label>
                                <p-dropdown 
                                    id="paymentMethod"
                                    [options]="paymentMethods" 
                                    [(ngModel)]="parsedData.paymentMethod"
                                    placeholder="Select Payment Method"
                                    [showClear]="true"
                                    [editable]="true"
                                    class="w-full">
                                </p-dropdown>
                            </div>
                        </div>
                        <div class="col-12 md:col-6">
                            <div class="flex flex-column gap-2 mb-4">
                                <label for="cardLastFour" class="block text-sm font-medium" style="min-width: 140px;">Card Last 4 Digits</label>
                                <input 
                                    id="cardLastFour"
                                    pInputText 
                                    [(ngModel)]="parsedData.cardLastFour"
                                    placeholder="1234"
                                    maxlength="4"
                                    class="w-full" />
                            </div>
                        </div>
                    </div>

                    <!-- Totals -->
                    <div class="grid">
                        <div class="col-12 md:col-4">
                            <div class="flex flex-column gap-2 mb-4">
                                <label for="subtotal" class="block text-sm font-medium" style="min-width: 140px;">Subtotal *</label>
                                <input 
                                    id="subtotal"
                                    type="number"
                                    pInputText 
                                    [(ngModel)]="parsedData.subtotal"
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    class="w-full" />
                            </div>
                        </div>
                        <div class="col-12 md:col-4">
                            <div class="flex flex-column gap-2 mb-4">
                                <label for="tax" class="block text-sm font-medium" style="min-width: 140px;">Tax *</label>
                                <input 
                                    id="tax"
                                    type="number"
                                    pInputText 
                                    [(ngModel)]="parsedData.tax"
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    class="w-full" />
                            </div>
                        </div>
                        <div class="col-12 md:col-4">
                            <div class="flex flex-column gap-2 mb-4">
                                <label for="total" class="block text-sm font-medium" style="min-width: 140px;">Total *</label>
                                <input 
                                    id="total"
                                    type="number"
                                    pInputText 
                                    [(ngModel)]="parsedData.total"
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    class="w-full" />
                            </div>
                        </div>
                    </div>

                    <!-- Items Table -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Items</label>
                        <p-table 
                            [value]="parsedData.items" 
                            [paginator]="false"
                            [rows]="10"
                            [scrollable]="true"
                            scrollHeight="300px"
                            styleClass="p-datatable-sm">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th style="width: 30%">Item Name</th>
                                    <th style="width: 15%">Category</th>
                                    <th style="width: 10%" class="text-right">Quantity</th>
                                    <th style="width: 15%" class="text-right">Unit Price</th>
                                    <th style="width: 15%" class="text-right">Total Price</th>
                                    <th style="width: 15%"></th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-item let-i="rowIndex">
                                <tr>
                                    <td>
                                        <input 
                                            pInputText 
                                            [(ngModel)]="item.name"
                                            class="w-full"
                                            placeholder="Item Name" />
                                    </td>
                                    <td>
                                        <input 
                                            pInputText 
                                            [(ngModel)]="item.category"
                                            class="w-full"
                                            placeholder="Category" />
                                    </td>
                                    <td class="text-right">
                                        <input 
                                            type="number"
                                            pInputText 
                                            [(ngModel)]="item.quantity"
                                            step="0.01"
                                            min="0"
                                            class="w-full text-right"
                                            (ngModelChange)="updateItemTotal(i)" />
                                    </td>
                                    <td class="text-right">
                                        <input 
                                            type="number"
                                            pInputText 
                                            [(ngModel)]="item.unitPrice"
                                            step="0.01"
                                            min="0"
                                            class="w-full text-right"
                                            (ngModelChange)="updateItemTotal(i)" />
                                    </td>
                                    <td class="text-right">
                                        <input 
                                            type="number"
                                            pInputText 
                                            [(ngModel)]="item.totalPrice"
                                            step="0.01"
                                            min="0"
                                            class="w-full text-right"
                                            (ngModelChange)="updateItemFromTotal(i)" />
                                    </td>
                                    <td>
                                        <p-button 
                                            icon="pi pi-trash" 
                                            severity="danger"
                                            [text]="true"
                                            size="small"
                                            (click)="removeItem(i)"
                                            pTooltip="Remove Item">
                                        </p-button>
                                    </td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="footer">
                                <tr>
                                    <td colspan="5" class="text-right">
                                        <p-button 
                                            label="Add Item" 
                                            icon="pi pi-plus" 
                                            size="small"
                                            (click)="addItem()"
                                            severity="secondary">
                                        </p-button>
                                    </td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>

                    <!-- Notes -->
                    <div class="mb-4">
                        <label for="notes" class="block text-sm font-medium mb-2" style="min-width: 140px;">Notes</label>
                        <textarea 
                            id="notes"
                            pInputTextarea 
                            [(ngModel)]="parsedData.notes"
                            placeholder="Additional notes..."
                            rows="3"
                            class="w-full">
                        </textarea>
                    </div>
                </div>

            </div>
        </p-dialog>
    `
})
export class AddReceiptComponent implements OnInit, OnChanges {
    @Input() visible: boolean = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() receiptAdded = new EventEmitter<void>();

    step: number = 1; // 1 = paste text, 2 = review/edit
    receiptText: string = '';
    parsedData: ParsedReceipt | null = null;
    receiptDate: Date | null = null;
    parsing: boolean = false;
    saving: boolean = false;
    parseError: string | null = null;

    paymentMethods = [
        'Credit Card',
        'Debit Card',
        'Cash',
        'EBT',
        'EBT & Debit Card',
        'Check',
        'Gift Card',
        'Other'
    ];

    constructor(
        private receiptParserService: ReceiptParserService,
        private receiptService: ReceiptService,
        private receiptItemService: ReceiptItemService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        // Reset when dialog opens
        if (this.visible) {
            this.reset();
        }
    }

    ngOnChanges() {
        if (this.visible) {
            this.reset();
        }
    }

    reset() {
        this.step = 1;
        this.receiptText = '';
        this.parsedData = null;
        this.receiptDate = null;
        this.parsing = false;
        this.saving = false;
        this.parseError = null;
    }

    async parseReceipt() {
        if (!this.receiptText || this.receiptText.trim().length === 0) {
            return;
        }

        this.parsing = true;
        this.parseError = null;

        try {
            const parsed = await this.receiptParserService.parseReceipt(this.receiptText);
            this.parsedData = parsed;
            
            // Convert receipt date string to Date object
            if (parsed.receiptDate) {
                const [year, month, day] = parsed.receiptDate.split('-').map(Number);
                this.receiptDate = new Date(year, month - 1, day);
            } else {
                this.receiptDate = new Date();
            }

            this.step = 2;
        } catch (error: any) {
            console.error('Error parsing receipt:', error);
            this.parseError = error.message || 'Failed to parse receipt. Please check the text and try again.';
            this.messageService.add({
                severity: 'error',
                summary: 'Parse Error',
                detail: this.parseError || undefined
            });
        } finally {
            this.parsing = false;
        }
    }

    updateItemTotal(index: number) {
        if (this.parsedData && this.parsedData.items[index]) {
            const item = this.parsedData.items[index];
            item.totalPrice = item.quantity * item.unitPrice;
        }
    }

    updateItemFromTotal(index: number) {
        if (this.parsedData && this.parsedData.items[index]) {
            const item = this.parsedData.items[index];
            if (item.quantity > 0) {
                item.unitPrice = item.totalPrice / item.quantity;
            }
        }
    }

    addItem() {
        if (this.parsedData) {
            this.parsedData.items.push({
                name: '',
                category: null,
                quantity: 1,
                unitPrice: 0,
                totalPrice: 0
            });
        }
    }

    removeItem(index: number) {
        if (this.parsedData && this.parsedData.items.length > index) {
            this.parsedData.items.splice(index, 1);
        }
    }

    isFormValid(): boolean {
        if (!this.parsedData || !this.receiptDate) {
            return false;
        }

        if (!this.parsedData.store.name || this.parsedData.store.name.trim().length === 0) {
            return false;
        }

        if (this.parsedData.subtotal < 0 || this.parsedData.tax < 0 || this.parsedData.total < 0) {
            return false;
        }

        if (!this.parsedData.items || this.parsedData.items.length === 0) {
            return false;
        }

        // Check that all items have names
        for (const item of this.parsedData.items) {
            if (!item.name || item.name.trim().length === 0) {
                return false;
            }
        }

        return true;
    }

    confirmAndInsert() {
        if (!this.parsedData || !this.receiptDate || !this.isFormValid()) {
            return;
        }

        this.saving = true;
        console.log('[AddReceipt] Starting receipt creation process');

        // Step 1: Find or create store (check if exists, create if not, use existing ID)
        console.log('[AddReceipt] Step 1: Looking up/creating store');
        this.receiptService.findOrCreateStore({
            name: this.parsedData.store.name,
            address: this.parsedData.store.address || null,
            city: this.parsedData.store.city || null,
            state: this.parsedData.store.state || null,
            zipCode: this.parsedData.store.zipCode || null
        }).pipe(
            switchMap(store => {
                console.log('[AddReceipt] Step 1 complete: Store ID =', store.id);
                
                // Step 2: Create receipt with store ID
                console.log('[AddReceipt] Step 2: Creating receipt');
                return this.receiptService.createReceipt({
                    storeId: store.id,
                    receiptDate: this.receiptDate!,
                    subtotal: this.parsedData!.subtotal,
                    tax: this.parsedData!.tax,
                    total: this.parsedData!.total,
                    paymentMethod: this.parsedData!.paymentMethod || null,
                    cardLastFour: this.parsedData!.cardLastFour || null,
                    notes: this.parsedData!.notes || null
                });
            }),
            switchMap(receipt => {
                console.log('[AddReceipt] Step 2 complete: Receipt ID =', receipt.id);
                
                // Step 3: For each item, find or create item (check if exists, create if not, use existing ID)
                // Then create receipt item linking receipt to item
                console.log('[AddReceipt] Step 3: Processing', this.parsedData!.items.length, 'items');
                const itemObservables = this.parsedData!.items.map((item, index) => {
                    console.log(`[AddReceipt] Processing item ${index + 1}/${this.parsedData!.items.length}:`, item.name);
                    return this.receiptItemService.findOrCreateItem({
                        name: item.name,
                        category: item.category || null,
                        description: null
                    }).pipe(
                        switchMap(createdItem => {
                            console.log(`[AddReceipt] Item "${item.name}" - Item ID =`, createdItem.id);
                            // Create receipt item linking receipt to item
                            return this.receiptItemService.createReceiptItem({
                                receiptId: receipt.id,
                                itemId: createdItem.id,
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                totalPrice: item.totalPrice,
                                expirationDate: null,
                                isFinished: false,
                                wouldRebuy: null,
                                notes: null
                            });
                        })
                    );
                });

                return forkJoin(itemObservables).pipe(
                    switchMap(() => {
                        console.log('[AddReceipt] Step 3 complete: All receipt items created');
                        return of(receipt);
                    })
                );
            }),
            catchError(error => {
                console.error('Error creating receipt:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: error.message || 'Failed to create receipt. Please try again.'
                });
                this.saving = false;
                throw error;
            })
        ).subscribe({
            next: () => {
                console.log('[AddReceipt] Receipt creation completed successfully');
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Receipt created successfully!'
                });
                this.receiptAdded.emit();
                this.onClose();
            },
            error: () => {
                // Error already handled in catchError
                console.error('[AddReceipt] Receipt creation failed');
            }
        });
    }

    onClose() {
        this.visible = false;
        this.visibleChange.emit(false);
        this.reset();
    }
}

