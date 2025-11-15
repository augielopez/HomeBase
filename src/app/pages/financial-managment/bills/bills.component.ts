import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Table, TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { BillsService } from '../services/bills.service';
import { Bill } from '../interfaces/bill.interface';

interface Column {
    field: string;
    header: string;
    customExportHeader?: string;
}

interface ExportColumn {
    title: string;
    dataKey: string;
}

@Component({
    selector: 'app-bills',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        FormsModule,
        ButtonModule,
        RippleModule,
        ToastModule,
        ToolbarModule,
        InputTextModule,
        TextareaModule,
        SelectModule,
        InputNumberModule,
        DialogModule,
        TagModule,
        InputIconModule,
        IconFieldModule,
        ConfirmDialogModule,
        CalendarModule,
        CheckboxModule,
        DropdownModule,
        ProgressSpinnerModule
    ],
    providers: [MessageService, BillsService, ConfirmationService],
    template: `
        <div class="card">
            <div class="flex justify-between items-center mb-4">
                <h1>Bills Management</h1>
            </div>

            <p-toolbar styleClass="mb-6">
                <ng-template #start>
                    <p-button 
                        label="New Bill" 
                        icon="pi pi-plus" 
                        severity="secondary" 
                        class="mr-2" 
                        (onClick)="openNew()" />
                    <p-button 
                        severity="secondary" 
                        label="Delete Selected" 
                        icon="pi pi-trash" 
                        outlined 
                        (onClick)="deleteSelectedBills()" 
                        [disabled]="!selectedBills || !selectedBills.length" />
                </ng-template>

                <ng-template #end>
                    <p-button 
                        label="Export" 
                        icon="pi pi-upload" 
                        severity="secondary" 
                        (onClick)="exportCSV()" />
                </ng-template>
            </p-toolbar>

            <p-table
                #dt
                [value]="bills"
                [rows]="10"
                [columns]="cols"
                [paginator]="true"
                [globalFilterFields]="['bill_name', 'description', 'status']"
                [tableStyle]="{ 'min-width': '75rem' }"
                [(selection)]="selectedBills"
                [rowHover]="true"
                dataKey="id"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} bills"
                [showCurrentPageReport]="true"
                [rowsPerPageOptions]="[10, 20, 30]"
                [loading]="loading()"
            >
                <ng-template #caption>
                    <div class="flex items-center justify-between">
                        <h5 class="m-0">Manage Bills</h5>
                        <p-iconfield>
                            <p-inputicon styleClass="pi pi-search" />
                            <input 
                                pInputText 
                                type="text" 
                                (input)="onGlobalFilter(dt, $event)" 
                                placeholder="Search bills..." />
                        </p-iconfield>
                    </div>
                </ng-template>
                
                <ng-template #header>
                    <tr>
                        <th style="width: 3rem">
                            <p-tableHeaderCheckbox />
                        </th>
                        <th pSortableColumn="bill_name" style="min-width: 20rem">
                            Bill Name
                            <p-sortIcon field="bill_name" />
                        </th>
                        <th pSortableColumn="description" style="min-width: 20rem">
                            Description
                            <p-sortIcon field="description" />
                        </th>
                        <th pSortableColumn="amount_due" style="min-width: 10rem">
                            Amount Due
                            <p-sortIcon field="amount_due" />
                        </th>
                        <th pSortableColumn="due_date" style="min-width: 12rem">
                            Due Date
                            <p-sortIcon field="due_date" />
                        </th>
                        <th pSortableColumn="status" style="min-width: 10rem">
                            Status
                            <p-sortIcon field="status" />
                        </th>
                        <th pSortableColumn="is_fixed_bill" style="min-width: 10rem">
                            Fixed Bill
                            <p-sortIcon field="is_fixed_bill" />
                        </th>
                        <th pSortableColumn="last_paid" style="min-width: 12rem">
                            Last Paid
                            <p-sortIcon field="last_paid" />
                        </th>
                        <th style="min-width: 12rem">Actions</th>
                    </tr>
                </ng-template>
                
                <ng-template #body let-bill>
                    <tr>
                        <td style="width: 3rem">
                            <p-tableCheckbox [value]="bill" />
                        </td>
                        <td style="min-width: 20rem">{{ bill.bill_name || '-' }}</td>
                        <td style="min-width: 20rem">{{ bill.description || '-' }}</td>
                        <td style="min-width: 10rem">
                            <span *ngIf="bill.amount_due" class="font-bold text-red-600">
                                {{ bill.amount_due | currency }}
                            </span>
                            <span *ngIf="!bill.amount_due">-</span>
                        </td>
                        <td style="min-width: 12rem">
                            {{ formatDueDate(bill.due_date) }}
                        </td>
                        <td style="min-width: 10rem">
                            <p-tag 
                                [value]="bill.status || 'Unknown'" 
                                [severity]="getStatusSeverity(bill.status)" />
                        </td>
                        <td style="min-width: 10rem">
                            <p-tag 
                                [value]="bill.is_fixed_bill ? 'Yes' : 'No'" 
                                [severity]="bill.is_fixed_bill ? 'success' : 'info'" />
                        </td>
                        <td style="min-width: 12rem">
                            {{ formatLastPaid(bill.last_paid) }}
                        </td>
                        <td style="min-width: 12rem">
                            <p-button 
                                icon="pi pi-pencil" 
                                class="mr-2" 
                                [rounded]="true" 
                                [outlined]="true" 
                                (click)="editBill(bill)" />
                            <p-button 
                                icon="pi pi-trash" 
                                severity="danger" 
                                [rounded]="true" 
                                [outlined]="true" 
                                (click)="deleteBill(bill)" />
                        </td>
                    </tr>
                </ng-template>
                
                <ng-template #emptymessage>
                    <tr>
                        <td colspan="9" class="text-center py-8">
                            <div *ngIf="loading()" class="flex justify-center">
                                <p-progressSpinner></p-progressSpinner>
                            </div>
                            <div *ngIf="!loading()" class="text-gray-500">
                                <i class="pi pi-inbox text-4xl mb-4"></i>
                                <p>No bills found</p>
                                <p class="text-sm">Click "New Bill" to add your first bill</p>
                            </div>
                        </td>
                    </tr>
                </ng-template>
            </p-table>

            <!-- Bill Dialog -->
            <p-dialog 
                [(visible)]="billDialog" 
                [style]="{ width: '600px' }" 
                header="Bill Details" 
                [modal]="true">
                <ng-template #content>
                    <div class="flex flex-col gap-6">
                        <div>
                            <label for="bill_name" class="block font-bold mb-3">Bill Name *</label>
                            <input 
                                type="text" 
                                pInputText 
                                id="bill_name" 
                                [(ngModel)]="bill.bill_name" 
                                required 
                                autofocus 
                                class="w-full" 
                                placeholder="Enter bill name" />
                            <small class="text-red-500" *ngIf="submitted && !bill.bill_name">
                                Bill name is required.
                            </small>
                        </div>

                        <div>
                            <label for="description" class="block font-bold mb-3">Description</label>
                            <input 
                                type="text" 
                                pInputText 
                                id="description" 
                                [(ngModel)]="bill.description" 
                                class="w-full" 
                                placeholder="Enter bill description" />
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label for="amount_due" class="block font-bold mb-3">Amount Due</label>
                                <p-inputnumber 
                                    id="amount_due" 
                                    [(ngModel)]="bill.amount_due" 
                                    mode="currency" 
                                    currency="USD" 
                                    locale="en-US" 
                                    class="w-full" />
                            </div>
                            <div>
                                <label for="due_date" class="block font-bold mb-3">Due Date</label>
                                <p-calendar 
                                    id="due_date" 
                                    [(ngModel)]="bill.due_date" 
                                    dateFormat="mm/dd/yy" 
                                    class="w-full" />
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label for="status" class="block font-bold mb-3">Status</label>
                                <p-dropdown 
                                    id="status" 
                                    [(ngModel)]="bill.status" 
                                    [options]="statusOptions" 
                                    placeholder="Select status" 
                                    class="w-full" />
                            </div>
                            <div>
                                <label for="last_paid" class="block font-bold mb-3">Last Paid</label>
                                <p-calendar 
                                    id="last_paid" 
                                    [(ngModel)]="bill.last_paid" 
                                    dateFormat="mm/dd/yy" 
                                    class="w-full" />
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="flex items-center gap-2">
                                <p-checkbox 
                                    id="is_fixed_bill" 
                                    [(ngModel)]="bill.is_fixed_bill" 
                                    [binary]="true" />
                                <label for="is_fixed_bill" class="font-bold">Fixed Bill</label>
                            </div>
                            <div class="flex items-center gap-2">
                                <p-checkbox 
                                    id="is_included_in_monthly_payment" 
                                    [(ngModel)]="bill.is_included_in_monthly_payment" 
                                    [binary]="true" />
                                <label for="is_included_in_monthly_payment" class="font-bold">Included in Monthly Payment</label>
                            </div>
                        </div>
                    </div>
                </ng-template>

                <ng-template #footer>
                    <p-button 
                        label="Cancel" 
                        icon="pi pi-times" 
                        text 
                        (click)="hideDialog()" />
                    <p-button 
                        label="Save" 
                        icon="pi pi-check" 
                        (click)="saveBill()" />
                </ng-template>
            </p-dialog>

            <p-confirmdialog [style]="{ width: '450px' }" />
            <p-toast></p-toast>
        </div>
    `,
    styles: [`
        .card {
            padding: 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        
        h1 {
            font-size: 2rem;
            font-weight: bold;
        }
        
        .text-2xl {
            font-size: 1.5rem;
        }
        
        .text-sm {
            font-size: 0.875rem;
        }
    `]
})
export class BillsComponent implements OnInit {
    billDialog: boolean = false;
    bills: Bill[] = [];
    loading = signal<boolean>(false);
    bill: Bill = {} as Bill;
    selectedBills: Bill[] = [];
    submitted: boolean = false;

    statusOptions = [
        { label: 'Pending', value: 'pending' },
        { label: 'Paid', value: 'paid' },
        { label: 'Overdue', value: 'overdue' },
        { label: 'Cancelled', value: 'cancelled' }
    ];

    @ViewChild('dt') dt!: Table;

    exportColumns!: ExportColumn[];
    cols!: Column[];

    constructor(
        private billsService: BillsService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit() {
        this.loadBills();
        this.setupColumns();
    }

    setupColumns() {
        this.cols = [
            { field: 'bill_name', header: 'Bill Name' },
            { field: 'description', header: 'Description' },
            { field: 'amount_due', header: 'Amount Due' },
            { field: 'due_date', header: 'Due Date' },
            { field: 'status', header: 'Status' },
            { field: 'is_fixed_bill', header: 'Fixed Bill' },
            { field: 'last_paid', header: 'Last Paid' }
        ];

        this.exportColumns = this.cols.map((col) => ({ 
            title: col.header, 
            dataKey: col.field 
        }));
    }

    loadBills() {
        this.loading.set(true);
        this.billsService.getBills().subscribe({
            next: (bills) => {
                this.bills = bills;
                this.loading.set(false);
            },
            error: (error) => {
                console.error('Error loading bills:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load bills',
                    life: 3000
                });
                this.loading.set(false);
            }
        });
    }

    exportCSV() {
        this.dt.exportCSV();
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    openNew() {
        this.bill = {} as Bill;
        this.submitted = false;
        this.billDialog = true;
    }

    editBill(bill: Bill) {
        this.bill = { ...bill };
        this.billDialog = true;
    }

    deleteSelectedBills() {
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete the selected bills?',
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                const ids = this.selectedBills.map(bill => bill.id);
                this.billsService.deleteBills(ids).subscribe({
                    next: (success) => {
                        if (success) {
                            this.bills = this.bills.filter(bill => !ids.includes(bill.id));
                            this.selectedBills = [];
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Successful',
                                detail: 'Bills Deleted',
                                life: 3000
                            });
                        } else {
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail: 'Failed to delete bills',
                                life: 3000
                            });
                        }
                    },
                    error: (error) => {
                        console.error('Error deleting bills:', error);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Failed to delete bills',
                            life: 3000
                        });
                    }
                });
            }
        });
    }

    hideDialog() {
        this.billDialog = false;
        this.submitted = false;
    }

    deleteBill(bill: Bill) {
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete ' + (bill.bill_name || 'this bill') + '?',
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.billsService.deleteBill(bill.id).subscribe({
                    next: (success) => {
                        if (success) {
                            this.bills = this.bills.filter(b => b.id !== bill.id);
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Successful',
                                detail: 'Bill Deleted',
                                life: 3000
                            });
                        } else {
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail: 'Failed to delete bill',
                                life: 3000
                            });
                        }
                    },
                    error: (error) => {
                        console.error('Error deleting bill:', error);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Failed to delete bill',
                            life: 3000
                        });
                    }
                });
            }
        });
    }

    findIndexById(id: string): number {
        let index = -1;
        for (let i = 0; i < this.bills.length; i++) {
            if (this.bills[i].id === id) {
                index = i;
                break;
            }
        }
        return index;
    }

    getStatusSeverity(status: string | null): string {
        switch (status) {
            case 'paid':
                return 'success';
            case 'pending':
                return 'warning';
            case 'overdue':
                return 'danger';
            case 'cancelled':
                return 'info';
            default:
                return 'secondary';
        }
    }

    formatDueDate(dueDate: string | null | undefined): string {
        if (!dueDate) {
            return '-';
        }
        
        // Check if it's a day of month string (like "9th", "15th", etc.)
        const dayMatch = dueDate.match(/^(\d+)(st|nd|rd|th)?$/i);
        if (dayMatch) {
            const day = dayMatch[1];
            return `Day ${day} of month`;
        }
        
        // Check if it's a valid date string
        const date = new Date(dueDate);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: '2-digit' 
            });
        }
        
        // If it's neither a day nor a valid date, return as-is
        return dueDate;
    }

    formatLastPaid(lastPaid: string | null | undefined): string {
        if (!lastPaid) {
            return 'Never';
        }
        
        // Check if it's a valid date string
        const date = new Date(lastPaid);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: '2-digit' 
            });
        }
        
        // If it's not a valid date, return as-is
        return lastPaid;
    }

    saveBill() {
        this.submitted = true;
        
        if (this.bill.bill_name?.trim()) {
            if (this.bill.id) {
                // Update existing bill
                this.billsService.updateBill(this.bill.id, this.bill).subscribe({
                    next: (updatedBill) => {
                        const index = this.findIndexById(this.bill.id);
                        if (index !== -1) {
                            const bills = [...this.bills];
                            bills[index] = updatedBill;
                            this.bills = bills;
                        }
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Successful',
                            detail: 'Bill Updated',
                            life: 3000
                        });
                        this.billDialog = false;
                        this.bill = {} as Bill;
                    },
                    error: (error) => {
                        console.error('Error updating bill:', error);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Failed to update bill',
                            life: 3000
                        });
                    }
                });
            } else {
                // Create new bill
                this.billsService.createBill(this.bill).subscribe({
                    next: (newBill) => {
                        this.bills = [...this.bills, newBill];
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Successful',
                            detail: 'Bill Created',
                            life: 3000
                        });
                        this.billDialog = false;
                        this.bill = {} as Bill;
                    },
                    error: (error) => {
                        console.error('Error creating bill:', error);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Failed to create bill',
                            life: 3000
                        });
                    }
                });
            }
        }
    }
}
