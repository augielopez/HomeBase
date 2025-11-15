import {Component, OnInit, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {Table, TableModule} from 'primeng/table';
import {ButtonModule} from 'primeng/button';
import {InputTextModule} from 'primeng/inputtext';
import {DropdownModule} from 'primeng/dropdown';
import {DialogModule} from 'primeng/dialog';
import {FormBuilder, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {SupabaseService} from '../../service/supabase.service';
import {AccountService} from '../services/account.service';
import {ConfirmationService, MessageService} from 'primeng/api';
import {ToastModule} from 'primeng/toast';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {RippleModule} from 'primeng/ripple';
import {TooltipModule} from 'primeng/tooltip';
import {Tag} from 'primeng/tag';
import {Toolbar} from 'primeng/toolbar';
import {IconField} from 'primeng/iconfield';
import {InputIcon} from 'primeng/inputicon';
import {OverlayPanel, OverlayPanelModule} from 'primeng/overlaypanel';
import {InputGroupAddon} from 'primeng/inputgroupaddon';
import {InputGroup} from 'primeng/inputgroup';

import {Chip} from 'primeng/chip';
import {AccountWizardComponent} from './account-wizard/account-wizard.component';
import {AccountExtended} from '../interfaces/account-extended.interface';
import {Account} from '../interfaces/account.interface';

@Component({
    selector: 'app-accounts',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        DropdownModule,
        DialogModule,
        ReactiveFormsModule,
        FormsModule,
        ToastModule,
        ConfirmDialogModule,
        RippleModule,
        TooltipModule,
        Tag,
        Toolbar,
        IconField,
        InputIcon,
        OverlayPanelModule,
        InputGroupAddon,
        InputGroup,
        Chip,
        AccountWizardComponent
    ],
    styles: [``],
    providers: [MessageService, ConfirmationService],
    template: `
        <div class="card">
            <p-toast></p-toast>
            <p-confirmDialog></p-confirmDialog>

            <p-toolbar styleClass="mb-6">
                <ng-template #start>
                    <p-button label="New Account" icon="pi pi-plus" severity="secondary" class="mr-2"
                              (onClick)="openNew()" />
                    <p-button severity="secondary" label="Delete Selected" icon="pi pi-trash" [outlined]="true"
                              (onClick)="deleteSelectedAccounts()"
                              [disabled]="!selectedAccounts || !selectedAccounts.length" />
                </ng-template>

                <ng-template #end>
                </ng-template>
            </p-toolbar>

            <p-table
                #dt
                [value]="extendeds"
                [rows]="10"
                dataKey="account.id"
                [paginator]="true"
                [globalFilterFields]="['account.name', 'owner.name', 'account.url']"
                [tableStyle]="{ 'min-width': '75rem' }"
                [(selection)]="selectedAccounts"
                [rowHover]="true"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} accounts"
                [showCurrentPageReport]="true"
                [rowsPerPageOptions]="[10, 20, 30]"
            >
                <ng-template #caption>
                    <div class="flex items-center justify-between">
                        <h5 class="m-0">Manage Accounts</h5>
                        <p-iconfield>
                            <p-inputicon styleClass="pi pi-search" />
                            <input pInputText type="text" (input)="onGlobalFilter(dt, $event)"
                                   placeholder="Search..." />
                        </p-iconfield>
                    </div>
                </ng-template>
                <ng-template pTemplate="header">
                    <tr>
                        <th style="width: 3rem">
                            <p-tableHeaderCheckbox />
                        </th>
                        <th pSortableColumn="account.name" style="min-width: 16rem">
                            Name
                            <p-sortIcon field="account.name" />
                        </th>
                        <th pSortableColumn="owner.name" style="min-width: 12rem">
                            Owner Type
                            <p-sortIcon field="owner.name" />
                        </th>
                        <th pSortableColumn="bill.status" style="min-width: 12rem">
                            Bill Status
                            <p-sortIcon field="bill.status" />
                        </th>
                        <th style="min-width: 12rem"></th>
                    </tr>
                </ng-template>
                <ng-template pTemplate="body" let-extend>
                    <tr>
                        <td>
                            <p-tableCheckbox [value]="extend" />
                        </td>
                        <td>
                            <a *ngIf="extend.account.url" [href]="extend.account.url" target="_blank"
                               class="text-primary hover:underline">
                                {{ extend.account.name }}
                            </a>
                            <span *ngIf="!extend.account.url">{{ extend.account.name }}</span>
                        </td>
                        <td>
                            <p-chip label="{{ extend.owner.name }}"
                                    [image]="'/assets/images/' + extend.owner.name.toLowerCase() + '.png'"
                                    styleClass="m-1"></p-chip>
                        </td>
                        <td>
                            <p-tag [value]="getBillStatusInfo(extend.bill).text"
                                   [severity]="getBillStatusInfo(extend.bill).severity" [rounded]="true"></p-tag>
                        </td>
                        <td>
                            <p-button icon="pi pi-eye" class="mr-2" [rounded]="true"
                                      [text]="true" [disabled]="!extend.login" 
                                      [styleClass]="!extend.login ? 'p-button-disabled' : ''"
                                      pTooltip="No login info" 
                                      [tooltipDisabled]="extend.login"
                                      (click)="viewAccountDetails(extend, $event)" />
                            <p-button icon="pi pi-pencil" class="mr-2" [rounded]="true" [text]="true"
                                      (onClick)="editAccount(extend)" />
                            <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [text]="true"
                                      (onClick)="deleteAccount(extend.account)" />
                        </td>
                    </tr>
                </ng-template>
            </p-table>
        </div>

        <!-- Account Details Overlay Panel -->
        <p-overlayPanel #accountDetailsPanel [style]="{ width: '30rem' }">
            <ng-template pTemplate="header">
                <h5 class="m-0">Account Details</h5>
            </ng-template>
            <ng-template pTemplate="body">
                <div class="card flex flex-col gap-4" *ngIf="selectedExtended">
                    <div>
                        <span class="font-medium text-900 block mb-2">Account Name</span>
                        <p-inputgroup>
                            <input pInputText [value]="selectedExtended.account.name" readonly class="w-full" />
                        </p-inputgroup>
                    </div>
                    <div>
                        <span class="font-medium text-900 block mb-2">URL</span>
                        <p-inputgroup>
                            <input pInputText [value]="selectedExtended.account.url" readonly class="w-full" #urlInput />
                            <p-inputGroupAddon (click)="openUrlInNewTab(urlInput.value)">
                                <i class="pi pi-external-link" style="cursor: pointer;"></i>
                            </p-inputGroupAddon>
                        </p-inputgroup>
                    </div>
                    <div>
                        <span class="font-medium text-900 block mb-2">Username</span>
                        <p-inputgroup>
                            <input pInputText [value]="selectedExtended.login.username" readonly class="w-full"
                                   #usernameInput />
                            <p-inputGroupAddon (click)="copyToClipboard(usernameInput)">
                                <i class="pi pi-copy" style="cursor: pointer;"></i>
                            </p-inputGroupAddon>
                        </p-inputgroup>
                    </div>
                    <div>
                        <span class="font-medium text-900 block mb-2">Password</span>
                        <p-inputgroup *ngIf="!isPasswordDecoded">
                            <input pInputText placeholder="Enter PIN" class="w-full" #pinInput />
                            <p-inputGroupAddon (click)="showPassword(pinInput, selectedExtended.login!.password)">
                                <i class="pi pi-key" style="cursor: pointer;"></i>
                            </p-inputGroupAddon>
                        </p-inputgroup>
                        <p-inputgroup *ngIf="isPasswordDecoded">
                            <input pInputText [value]="password" readonly class="w-full" #passwordInput />
                            <p-inputGroupAddon (click)="copyToClipboard(passwordInput)">
                                <i class="pi pi-copy" style="cursor: pointer;"></i>
                            </p-inputGroupAddon>
                        </p-inputgroup>
                    </div>
                </div>
            </ng-template>
        </p-overlayPanel>

        <!-- Account Wizard -->
        <p-dialog [(visible)]="dialogVisible" [style]="{ width: '40vw', height: '110vh' }" [modal]="true">
            <app-account-wizard [(visible)]="dialogVisible" [accountToEdit]="selectedExtended"
                                (accountCreated)="onAccountCreated($event)"
                                (wizardClosed)="closeDialog()"></app-account-wizard>
        </p-dialog>
    `
})
export class AccountsComponent implements OnInit {
    extendeds: AccountExtended[] = [];
    selectedAccounts: any[] = [];
    loading = false;
    dialogVisible = false;


    @ViewChild('dt') dt: Table | undefined;
    @ViewChild('accountDetailsPanel') accountDetailsPanel!: OverlayPanel;
    @ViewChild(AccountWizardComponent) accountWizard!: AccountWizardComponent;
    selectedExtended: AccountExtended | null = null;
    isPasswordDecoded: boolean = false;
    password: string = '';

    constructor(
        private supabaseService: SupabaseService,
        private accountService: AccountService,
        private fb: FormBuilder,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    async ngOnInit() {
        await this.loadData();

        this.extendeds.forEach((account) => {
            // Account data loaded
        });
    }

    onGlobalFilter(table: Table, event: Event) {
        const value = (event.target as HTMLInputElement).value;
        
        // Use custom filtering logic
        if (value) {
            const searchTerm = value.toLowerCase();
            // Update the table's filtered value
            table.value = this.extendeds.filter(item => {
                const accountName = item.account?.name?.toLowerCase() || '';
                const ownerName = item.owner?.name?.toLowerCase() || '';
                const accountUrl = item.account?.url?.toLowerCase() || '';

                return accountName.includes(searchTerm) ||
                    ownerName.includes(searchTerm) ||
                    accountUrl.includes(searchTerm);
            });
        } else {
            // Reset to original data when search is empty
            table.value = this.extendeds;
        }
    }

    openNew() {
        this.selectedExtended = null; // Clear any selected account
        this.dialogVisible = true;
        
        // Reset the wizard component to create mode
        const wizardComponent = this.accountWizard;
        if (wizardComponent) {
            wizardComponent.resetToCreateMode();
        }
    }

    deleteSelectedAccounts() {
        if (!this.selectedAccounts || this.selectedAccounts.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'No Selection',
                detail: 'Please select accounts to delete'
            });
            return;
        }

        const accountNames = this.selectedAccounts.map(account => account.account.name).join(', ');
        const count = this.selectedAccounts.length;

        this.confirmationService.confirm({
            message: `Are you sure you want to delete ${count} selected account${count > 1 ? 's' : ''}:<br><br><br><strong>${accountNames}</strong><br><br>This action will permanently delete:<br><br>• All warranties<br>• All credit cards<br>• All bills<br>• The accounts themselves<br><br>This action cannot be undone.`,
            header: 'Delete Selected Accounts',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Yes, Delete All',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: async () => {
                try {
                    const accountIds = this.selectedAccounts.map(account => account.account.id);
                    await this.accountService.deleteMultipleAccounts(accountIds);
                    
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: `Successfully deleted ${count} account${count > 1 ? 's' : ''}`
                    });
                    
                    // Clear selection and reload data
                    this.selectedAccounts = [];
                    await this.loadData();
                } catch (error) {
                    console.error('Error deleting selected accounts:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to delete selected accounts'
                    });
                }
            }
        });
    }

    async loadData() {
        this.loading = true;
        try {
            this.extendeds = await this.accountService.loadAccounts();
        } catch (error) {
            console.error('Error loading data:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load accounts'
            });
        } finally {
            this.loading = false;
        }
    }

    showAddDialog() {
        this.dialogVisible = true;
    }

    // editAccount(account: Account) {
    //     // For now, just show the wizard for editing too
    //     this.showAddDialog();
    // }

    editAccount(account: AccountExtended) {
        this.dialogVisible = true;

        // We'll need to emit this account to the wizard component
        // Add @Input to the wizard component to receive the account being edited
        const wizardComponent = this.accountWizard;
        if (wizardComponent) {
            wizardComponent.setEditMode(account);
        }
    }

    onAccountCreated(extended: AccountExtended) {
        this.closeDialog();
        this.loadData().then((r) =>
            this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: `Account "${extended.account.name}" created successfully`
            })
        );
    }

    deleteAccount(account: Account) {
        this.confirmationService.confirm({
            message: `Are you sure you want to delete the account:<br><br><strong>${account.name}</strong><br><br><br>This action will permanently delete:<br><br><br>• All warranties<br>• All credit cards<br>• All bills<br>• The account itself<br><br>This action cannot be undone.`,
            header: 'Delete Account',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Yes, Delete',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: async () => {
                try {
                    await this.accountService.deleteAccountByObject(account);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Account deleted successfully'
                    });
                    await this.loadData();
                } catch (error) {
                    console.error('Error deleting account:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to delete account'
                    });
                }
            }
        });
    }

    closeDialog() {
        this.dialogVisible = false;
        this.selectedExtended = null; // Clear selected account
        
        // Reset the wizard component
        const wizardComponent = this.accountWizard;
        if (wizardComponent) {
            wizardComponent.resetToCreateMode();
        }
    }

    /**
     * Get the bill status information for display
     * @param bill The bill object
     * @returns An object containing the CSS class and text for the bill status
     */

    getBillStatusInfo(bill: any): { severity: string; text: string } {
        if (!bill?.id) {
            return {
                severity: 'secondary',
                text: 'No Bill'
            };
        }

        if (bill.status === 'Active') {
            return {
                severity: 'success',
                text: 'Active'
            };
        }

        return {
            severity: 'danger',
            text: 'Inactive'
        };
    }

    handleImageError(event: any) {
        // If image fails to load, replace with a default avatar or generate initials
        event.target.src = `https://ui-avatars.com/api/?name=${event.target.alt}&background=random`;
    }

    viewAccountDetails(account: AccountExtended, event?: Event) {
        // Don't show details if there's no login data
        if (!account.login) {
            this.messageService.add({
                severity: 'info',
                summary: 'No Login Data',
                detail: 'This account has no login credentials to view',
                life: 3000
            });
            return;
        }

        this.selectedExtended = account;
        this.isPasswordDecoded = false;
        this.password = '';

        if (event) {
            this.accountDetailsPanel.toggle(event);
        }
    }

    openUrlInNewTab(url: string): void {
        if (url) {
            window.open(url, '_blank');
        } else {
            this.messageService.add({
                severity: 'warn',
                summary: 'No URL',
                detail: 'No URL available for this account',
                life: 3000
            });
        }
    }

    copyToClipboard(inputElement: HTMLInputElement): void {
        inputElement.select();
        const successful = document.execCommand('copy');
        inputElement.setSelectionRange(0, 0);

        if (successful) {
            this.messageService.add({
                severity: 'success',
                summary: 'Copied',
                detail: 'Text copied to clipboard successfully!',
                life: 3000
            });
        } else {
            this.messageService.add({
                severity: 'error',
                summary: 'Copy Failed',
                detail: 'Failed to copy text to clipboard',
                life: 3000
            });
        }
    }

    showPassword(input: HTMLInputElement, password: string) {
        if (input.value === '1027') {
            this.password = this.decodeBase64(password);
            this.isPasswordDecoded = true;
            this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Password decrypted successfully',
                life: 3000
            });
        } else {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Incorrect PIN entered',
                life: 3000
            });
        }
    }

    decodeBase64(encodedString: string): string {
        try {
            const decodedString = atob(encodedString);
            return decodedString;
        } catch (error) {
            console.error('Failed to decode Base64 string:', error);
            return '';
        }
    }



    async onAccountUpdated(updatedAccount: any) {
        try {
            // Begin by updating the main account
            const { data: accountData, error: accountError } = await this.supabaseService
                .getClient()
                .from('hb_accounts')
                .update({
                    name: updatedAccount.name,
                    url: updatedAccount.url,
                    updated_at: new Date().toISOString(),
                    updated_by: this.supabaseService.getCurrentUserId()
                })
                .eq('id', updatedAccount.id);

            if (accountError) throw accountError;

            // Update bill if exists
            if (updatedAccount.bill) {
                const { error: billError } = await this.supabaseService.getClient().from('hb_bills').upsert({
                    id: updatedAccount.bill.id,
                    account_id: updatedAccount.id,
                    status: updatedAccount.bill.status,
                    amount: updatedAccount.bill.amount,
                    due_date: updatedAccount.bill.due_date,
                    payment_date: updatedAccount.bill.payment_date,
                    payment_method: updatedAccount.bill.payment_method,
                    frequency: updatedAccount.bill.frequency,
                    auto_pay: updatedAccount.bill.auto_pay,
                    reminder_days: updatedAccount.bill.reminder_days,
                    notes: updatedAccount.bill.notes,
                    updated_at: new Date().toISOString(),
                    updated_by: this.supabaseService.getCurrentUserId()
                });

                if (billError) throw billError;
            }

            // Update credit card if exists
            if (updatedAccount.creditCard) {
                const { error: creditCardError } = await this.supabaseService.getClient().from('hb_credit_cards').upsert({
                    id: updatedAccount.creditCard.id,
                    account_id: updatedAccount.id,
                    card_number: updatedAccount.creditCard.card_number,
                    expiration_date: updatedAccount.creditCard.expiration_date,
                    cvv: updatedAccount.creditCard.cvv,
                    card_holder_name: updatedAccount.creditCard.card_holder_name,
                    card_type: updatedAccount.creditCard.card_type,
                    billing_address: updatedAccount.creditCard.billing_address,
                    issuer: updatedAccount.creditCard.issuer,
                    is_primary: updatedAccount.creditCard.is_primary,
                    credit_limit: updatedAccount.creditCard.credit_limit,
                    last_four: updatedAccount.creditCard.last_four,
                    updated_at: new Date().toISOString(),
                    updated_by: this.supabaseService.getCurrentUserId()
                });

                if (creditCardError) throw creditCardError;
            }

            // Update warranty if exists
            if (updatedAccount.warranty) {
                const { error: warrantyError } = await this.supabaseService.getClient().from('hb_warranties').upsert({
                    id: updatedAccount.warranty.id,
                    account_id: updatedAccount.id,
                    start_date: updatedAccount.warranty.start_date,
                    end_date: updatedAccount.warranty.end_date,
                    warranty_provider: updatedAccount.warranty.warranty_provider,
                    policy_number: updatedAccount.warranty.policy_number,
                    coverage_details: updatedAccount.warranty.coverage_details,
                    contact_info: updatedAccount.warranty.contact_info,
                    claim_procedure: updatedAccount.warranty.claim_procedure,
                    document_url: updatedAccount.warranty.document_url,
                    status: updatedAccount.warranty.status,
                    renewal_reminder: updatedAccount.warranty.renewal_reminder,
                    reminder_days: updatedAccount.warranty.reminder_days,
                    updated_at: new Date().toISOString(),
                    updated_by: this.supabaseService.getCurrentUserId()
                });

                if (warrantyError) throw warrantyError;
            }

            // Update login if exists
            if (updatedAccount.login) {
                const { error: loginError } = await this.supabaseService.getClient().from('hb_logins').upsert({
                    id: updatedAccount.login_id,
                    account_id: updatedAccount.id,
                    username: updatedAccount.login.username,
                    password: updatedAccount.login.password,
                    updated_at: new Date().toISOString(),
                    updated_by: this.supabaseService.getCurrentUserId()
                });

                if (loginError) throw loginError;
            }

            this.closeDialog();
            await this.loadData();

            this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: `Account "${updatedAccount.name}" updated successfully`
            });
        } catch (error) {
            console.error('Error updating account:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to update account'
            });
        }
    }
}
