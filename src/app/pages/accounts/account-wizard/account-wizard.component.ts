import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter, Input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../service/supabase.service';
import { MasterDataService } from '../../service/master-data.service';
import { AccountService, AccountFormData } from '../../service/account.service';
import { MessageService } from 'primeng/api';
import { MenuItem } from 'primeng/api';
import { BillType, FrequencyType, PaymentType, PriorityType, BillCategory } from '../../../interfaces';
import { Steps } from 'primeng/steps';
import { DropdownModule } from 'primeng/dropdown';
import { Checkbox } from 'primeng/checkbox';
import { InputNumber } from 'primeng/inputnumber';
import { Calendar } from 'primeng/calendar';
import { Button } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DialogModule } from 'primeng/dialog';
import { StepsModule } from 'primeng/steps';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { AccountExtended } from '../account-extended.interface';
import { Accordion, AccordionTab } from 'primeng/accordion';
import { Fieldset } from 'primeng/fieldset';
import { AutoComplete } from 'primeng/autocomplete';
import { Chip } from 'primeng/chip';
import { debounceTime } from 'rxjs';

@Component({
    selector: 'app-account-wizard',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        Steps,
        DropdownModule,
        Checkbox,
        InputNumber,
        Calendar,
        Button,
        InputTextModule,
        TextareaModule,
        DialogModule,
        StepsModule,
        CheckboxModule,
        ButtonModule,
        Fieldset,
    ],
    templateUrl: './account-wizard.component.html',
    styleUrl: './account-wizard.component.scss'
})
export class AccountWizardComponent implements OnInit {
    // Input/Output properties
    @Input() visible: boolean = false;
    @Input() accountToEdit!: null | AccountExtended;
    @Output() accountUpdated = new EventEmitter<unknown>();
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() accountCreated = new EventEmitter<any>();
    @Output() wizardClosed = new EventEmitter<void>();

    // Component state
    accountForm!: FormGroup;
    activeStep = 0;
    isEditMode = false;
    isTransitioning = false;

    // Dropdown data
    billTypes: BillType[] = [];
    billCategories: BillCategory[] = [];
    creditCardTypes: any[] = [];
    frequencyTypes: FrequencyType[] = [];
    loginTypes: any[] = [];
    ownerTypes: any[] = [];
    paymentTypes: PaymentType[] = [];
    priorityTypes: PriorityType[] = [];
    tagOptions: any[] = [];
    tags: any[] = [];
    warrantyTypes: any[] = [];

    // Steps configuration
    steps: MenuItem[] = [
        { label: 'Account', icon: 'pi pi-user' },
        { label: 'Bill', icon: 'pi pi-file' },
        { label: 'Credit Card', icon: 'pi pi-credit-card' },
        { label: 'Warranty', icon: 'pi pi-shield' }
    ];

    constructor(
        private fb: FormBuilder,
        private supabaseService: SupabaseService,
        private masterDataService: MasterDataService,
        private accountService: AccountService,
        private messageService: MessageService,
        private cdr: ChangeDetectorRef
    ) {}

    // PUBLIC METHODS (alphabetically ordered)

    /**
     * Format date to MM/YY format
     */
    formatDateToMonthYear(date: Date | string): string {
        return this.accountService.formatDateToMonthYear(date);
    }

    /**
     * Get step button label
     */
    getStepButtonLabel(): string {
        return this.activeStep === this.steps.length - 1 ? 'Save Account' : 'Next';
    }

    /**
     * Hide dialog and reset form
     */
    hideDialog(): void {
        this.visible = false;
        this.visibleChange.emit(false);
        this.wizardClosed.emit();
        this.accountForm.reset();
        this.activeStep = 0;
    }

    /**
     * Check if current step is the last step
     */
    isLastStep(): boolean {
        return this.activeStep === this.steps.length - 1;
    }

    /**
     * Navigate to next step
     */
    async nextStep(): Promise<void> {
        if (this.isCurrentStepValid()) {
            this.isTransitioning = true;
            await this.delay(150);
            this.activeStep++;
            await this.delay(50);
            this.isTransitioning = false;
        } else {
            this.messageService.add({
                severity: 'error',
                summary: 'Validation Error',
                detail: 'Please complete required fields'
            });
        }
    }

    /**
     * Navigate to previous step
     */
    async prevStep(): Promise<void> {
        if (this.activeStep > 0) {
            this.isTransitioning = true;
            await this.delay(150);
            this.activeStep--;
            await this.delay(50);
            this.isTransitioning = false;
        }
    }

    /**
     * Save account (create or update)
     */
    async saveAccount(): Promise<void> {
        const formValue = this.accountForm.value;

        try {
            await this.accountService.saveAccount(formValue, this.isEditMode, this.accountToEdit || undefined);

            this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: this.isEditMode ? 'Account updated successfully!' : 'Account created successfully!'
            });

            if (this.isEditMode) {
                this.accountUpdated.emit();
            } else {
                this.accountCreated.emit();
            }

            this.hideDialog();
        } catch (error) {
            console.error('Error saving account:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: this.isEditMode ? 'Failed to update account' : 'Failed to create account'
            });
        }
    }

    /**
     * Set edit mode and populate form with account data
     */
    setEditMode(extended: AccountExtended): void {
        this.isEditMode = true;
        this.accountToEdit = extended;
        this.activeStep = 0;

        if (!this.accountForm) {
            return;
        }

        this.populateFormWithAccountData(extended);
    }

    // PRIVATE METHODS (alphabetically ordered)

    /**
     * Check if login combination already exists
     */
    private checkExistingLogin(): void {
        const accountGroup = this.accountForm.get('account') as FormGroup;
        const username = accountGroup.get('username')?.value;
        const password = accountGroup.get('password')?.value;

        if (username && password) {
            this.accountService.checkExistingLogin(username, password).then(exists => {
                if (exists) {
                    this.messageService.add({
                        severity: 'info',
                        summary: 'Existing Login Found',
                        detail: 'This username and password combination already exists',
                        life: 3000
                    });
                }
            });
        }
    }

    /**
     * Delay utility function
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Initialize form with validation
     */
    private initForm(): void {
        this.accountForm = this.fb.group({
            account: this.fb.group({
                accountName: ['', Validators.required],
                ownerTypeId: ['', Validators.required],
                username: [''],
                password: [''],
                url: [''],
                description: ['']
            }),
            bill: this.fb.group({
                hasBill: [false],
                billTypeId: ['', Validators.required],
                billAmount: [null, [Validators.required, Validators.min(0.01)]],
                dueDate: ['', Validators.required],
                isActive: [false],
                priorityId: ['', Validators.required],
                frequencyId: ['', Validators.required],
                lastPaid: ['', Validators.required],
                isFixedBill: [false],
                paymentTypeId: ['', Validators.required],
                tagId: [''],
                isIncludedInMonthlyPayment: [false]
            }),
            creditCard: this.fb.group({
                hasCreditCard: [false],
                cardType: ['', Validators.required],
                cardNumber: ['', Validators.required],
                cardHolderName: ['', Validators.required],
                expiryDate: ['', Validators.required],
                creditLimit: [null],
                balance: [null],
                apr: [null],
                purchaseRate: [null],
                cashAdvanceRate: [null],
                balanceTransferRate: [null],
                annualFee: [null]
            }),
            warranty: this.fb.group({
                hasWarranty: [false],
                warrantyTypeId: ['', Validators.required],
                provider: [''],
                coverageStart: ['', Validators.required],
                coverageEnd: ['', Validators.required],
                terms: [''],
                claimProcedure: ['']
            })
        });

        // Add subscription to password changes
        const accountGroup = this.accountForm.get('account') as FormGroup;
        accountGroup.get('password')?.valueChanges
            .pipe(debounceTime(300))
            .subscribe(() => {
                this.checkExistingLogin();
            });
    }

    /**
     * Check if current step is valid
     */
    private isCurrentStepValid(): boolean {
        const stepKeys = ['account', 'bill', 'creditCard', 'warranty'];
        const stepGroup = this.accountForm.get(stepKeys[this.activeStep]) as FormGroup;
        stepGroup.markAllAsTouched();

        if (this.activeStep === 1) {
            // Bill step
            const hasBill = stepGroup.get('hasBill')?.value;

            if (!hasBill) {
                return true;
            }

            // Check all required fields when hasBill is true
            const requiredFields = ['billTypeId', 'dueDate', 'priorityId', 'frequencyId', 'paymentTypeId', 'lastPaid'];

            // Special check for billAmount since 0 is invalid
            const billAmount = stepGroup.get('billAmount')?.value;
            if (!billAmount || billAmount <= 0) {
                return false;
            }

            return requiredFields.every((field) => {
                const control = stepGroup.get(field);
                return control && control.valid && control.value !== null && control.value !== '';
            });
        }

        return stepGroup.valid;
    }

    /**
     * Load dropdown data from services
     */
    private async loadDropdownData(): Promise<void> {
        try {
            this.ownerTypes = await this.accountService.loadOwnerTypes();
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    }

    /**
     * Populate form with account data for editing
     */
    private populateFormWithAccountData(extended: AccountExtended): void {
        // Debug: Log the original expiry date from database
        if (extended.creditCard?.expiration_date) {
            console.log('Original expiry date from DB:', extended.creditCard.expiration_date);
        }
        
        const parsedExpiryDate = extended.creditCard ? this.parseExpiryDateForForm(extended.creditCard.expiration_date) : null;
        
        // Debug: Log the parsed expiry date
        if (parsedExpiryDate) {
            console.log('Parsed expiry date:', parsedExpiryDate);
            console.log('Parsed expiry date type:', typeof parsedExpiryDate);
            console.log('Parsed expiry date instanceof Date:', parsedExpiryDate instanceof Date);
        }
        
        this.accountForm.patchValue({
            account: {
                accountName: extended.account.name,
                ownerTypeId: extended.owner.id,
                username: extended.login ? extended.login.username : '',
                password: extended.login ? extended.login.password : '',
                url: extended.account.url,
                description: extended.account.notes || ''
            },
            bill: {
                hasBill: !!extended.account.billId,
                billTypeId: extended.bill ? extended.bill.bill_type_id : '',
                billAmount: extended.bill ? extended.bill.amount_due : null,
                dueDate: extended.bill ? extended.bill.due_date : '',
                isActive: extended.bill ? extended.bill.status === 'Active' : false,
                priorityId: extended.bill ? extended.bill.priority_id : '',
                frequencyId: extended.bill ? extended.bill.frequency_id : '',
                lastPaid: extended.bill ? (extended.bill.last_paid ? new Date(extended.bill.last_paid) : '') : '',
                isFixedBill: extended.bill ? extended.bill.is_fixed_bill : false,
                paymentTypeId: extended.bill ? extended.bill.payment_type_id : '',
                tagId: extended.bill ? extended.bill.tag_id : null,
                isIncludedInMonthlyPayment: extended.bill ? extended.bill.is_included_in_monthly_payment : false
            },
            creditCard: {
                hasCreditCard: !!extended.creditCard?.account_id,
                cardType: extended.creditCard ? extended.creditCard.card_type_id : '',
                cardNumber: extended.creditCard ? '**** **** **** ' + (extended.creditCard.card_number_last_four?.toString().padStart(4, '0') || '') : '',
                cardHolderName: extended.creditCard ? extended.creditCard.cardholder_name : '',
                expiryDate: parsedExpiryDate,
                creditLimit: extended.creditCard ? extended.creditCard.credit_limit : null,
                apr: extended.creditCard ? extended.creditCard.apr : null,
                balance: extended.creditCard ? extended.creditCard.balance : null,
                purchaseRate: extended.creditCard ? extended.creditCard.purchase_rate : null,
                cashAdvanceRate: extended.creditCard ? extended.creditCard.cash_advance_rate : null,
                balanceTransferRate: extended.creditCard ? extended.creditCard.balance_transfer_rate : null,
                annualFee: extended.creditCard ? extended.creditCard.annual_fee : null
            },
            warranty: {
                hasWarranty: !!extended.warranty?.account_id,
                warrantyTypeId: extended.warranty ? extended.warranty.warranty_type_id : '',
                provider: extended.warranty ? extended.warranty.provider : '',
                coverageStart: extended.warranty ? extended.warranty.coverage_start : '',
                coverageEnd: extended.warranty ? extended.warranty.coverage_end : '',
                terms: extended.warranty ? extended.warranty.terms_and_conditions : '',
                claimProcedure: extended.warranty ? extended.warranty.claim_procedure : ''
            }
        });

        // Mark all fields as pristine and untouched after setting initial values
        Object.keys(this.accountForm.controls).forEach((key) => {
            const control = this.accountForm.get(key);
            if (control) {
                control.markAsPristine();
                control.markAsUntouched();
            }
        });
    }

    /**
     * Parse expiry date from MM/YYYY format to Date object for form
     */
    private parseExpiryDateForForm(expiryDate: string | null): Date | null {
        if (!expiryDate) return null;
        
        // Handle MM/YYYY format (from database)
        if (expiryDate.includes('/')) {
            const parts = expiryDate.split('/');
            if (parts.length === 2) {
                const month = parseInt(parts[0], 10) - 1; // Month is 0-indexed
                const year = parseInt(parts[1], 10);
                // For PrimeNG calendar with view="month", we need to set the date to the first day of the month
                // and ensure the year is properly formatted (4 digits)
                const fullYear = year < 100 ? 2000 + year : year;
                return new Date(fullYear, month, 1);
            }
        }
        
        // Handle full date format
        try {
            const date = new Date(expiryDate);
            return isNaN(date.getTime()) ? null : date;
        } catch (error) {
            console.error('Error parsing expiry date:', error);
            return null;
        }
    }

    /**
     * Subscribe to master data service observables
     */
    private subscribeToMasterData(): void {
        this.masterDataService.billTypes$.subscribe((data) => (this.billTypes = data || []));
        this.masterDataService.priorityTypes$.subscribe((data) => (this.priorityTypes = data || []));
        this.masterDataService.frequencyTypes$.subscribe((data) => (this.frequencyTypes = data || []));
        this.masterDataService.paymentTypes$.subscribe((data) => (this.paymentTypes = data || []));
        this.masterDataService.billCategories$.subscribe((data) => (this.billCategories = data || []));
        this.masterDataService.warrantyTypes$.subscribe((data) => (this.warrantyTypes = data || []));
        this.masterDataService.tags$.subscribe((data) => (this.tags = data || []));
        this.masterDataService.loginTypes$.subscribe((data) => (this.loginTypes = data || []));
        this.masterDataService.cardTypes$.subscribe((data: any[]) => (this.creditCardTypes = data || []));
    }

    /**
     * Debug method to log expiry date changes
     */
    onExpiryDateChange(event: any): void {
        console.log('Expiry date changed:', event);
        console.log('Expiry date value:', event.value);
        console.log('Expiry date type:', typeof event.value);
    }

    // LIFECYCLE METHODS

    ngOnInit(): void {
        this.initForm();
        this.loadDropdownData().then(() => console.log('Dropdown data loaded successfully'));
        this.subscribeToMasterData();
    }

    // GETTERS (alphabetically ordered)

    get accountFormGroup(): FormGroup {
        return this.accountForm.get('account') as FormGroup;
    }

    get billFormGroup(): FormGroup {
        return this.accountForm.get('bill') as FormGroup;
    }

    get creditCardFormGroup(): FormGroup {
        return this.accountForm.get('creditCard') as FormGroup;
    }

    get warrantyFormGroup(): FormGroup {
        return this.accountForm.get('warranty') as FormGroup;
    }
}



