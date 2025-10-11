import { Component, OnInit, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { BillCreationService } from '../../service/bill-creation.service';
import { MasterDataService } from '../../service/master-data.service';
import { Subscription } from 'rxjs';

export interface QuickBillForm {
  billName: string;
  amount: number;
  dueDate: Date;
  status?: string;
  billType?: string;
  description?: string;
  priorityId?: string;
  frequencyId?: string;
  billTypeId?: string;
  paymentTypeId?: string;
  tagId?: string;
  isFixedBill?: boolean;
  isIncludedInMonthlyPayment?: boolean;
}

@Component({
  selector: 'app-bill-creation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    CalendarModule,
    DropdownModule,
    CheckboxModule
  ],
  templateUrl: './bill-creation-dialog.component.html',
  styleUrls: ['./bill-creation-dialog.component.scss']
})
export class BillCreationDialogComponent implements OnInit, OnDestroy, OnChanges {
  @Input() visible: boolean = false;
  @Input() initialData?: {
    billName: string;
    amount: number;
    dueDate: Date;
    description?: string;
  };
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() billCreated = new EventEmitter<any>();

  billForm!: FormGroup;
  isSubmitting = false;
  private subscriptions: Subscription[] = [];

  // Dropdown options from master data
  priorityOptions: any[] = [];
  frequencyOptions: any[] = [];
  billTypeOptions: any[] = [];
  paymentTypeOptions: any[] = [];
  tagOptions: any[] = [];
  statusOptions: any[] = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' }
  ];

  constructor(
    private fb: FormBuilder,
    private billCreationService: BillCreationService,
    private masterDataService: MasterDataService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadMasterData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['initialData'] && this.initialData && this.billForm) {
      this.billForm.patchValue({
        billName: this.initialData.billName,
        amount: this.initialData.amount,
        dueDate: this.initialData.dueDate,
        description: this.initialData.description || ''
      });
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private initForm() {
    this.billForm = this.fb.group({
      billName: ['', [Validators.required, Validators.minLength(2)]],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      dueDate: ['', Validators.required],
      status: ['Active', Validators.required], // Default to 'Active'
      billType: ['other'], // Default to 'other'
      description: [''],
      priorityId: [''],
      frequencyId: [''],
      billTypeId: [''],
      paymentTypeId: [''],
      tagId: [''],
      isFixedBill: [false],
      isIncludedInMonthlyPayment: [false]
    });
  }

  /**
   * Load master data for dropdowns
   */
  private loadMasterData() {
    // Load priority types
    this.subscriptions.push(
      this.masterDataService.priorityTypes$.subscribe(priorities => {
        this.priorityOptions = priorities.map(p => ({
          label: p.name,
          value: p.id
        }));
      })
    );

    // Load frequency types
    this.subscriptions.push(
      this.masterDataService.frequencyTypes$.subscribe(frequencies => {
        this.frequencyOptions = frequencies.map(f => ({
          label: f.name,
          value: f.id
        }));
      })
    );

    // Load bill types
    this.subscriptions.push(
      this.masterDataService.billTypes$.subscribe(billTypes => {
        this.billTypeOptions = billTypes.map(bt => ({
          label: bt.name,
          value: bt.id
        }));
      })
    );

    // Load payment types
    this.subscriptions.push(
      this.masterDataService.paymentTypes$.subscribe(paymentTypes => {
        this.paymentTypeOptions = paymentTypes.map(pt => ({
          label: pt.name,
          value: pt.id
        }));
      })
    );

    // Load tags
    this.subscriptions.push(
      this.masterDataService.tags$.subscribe(tags => {
        this.tagOptions = tags.map(t => ({
          label: t.name,
          value: t.id
        }));
      })
    );
  }

  /**
   * Submit the bill creation form
   */
  async onSubmit() {
    if (this.billForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;

      try {
        const formData = this.billForm.value;
        const newBill = await this.billCreationService.createBill(formData);

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Bill created successfully!'
        });

        this.billCreated.emit(newBill);
        this.closeDialog();

      } catch (error) {
        console.error('Error creating bill:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create bill. Please try again.'
        });
      } finally {
        this.isSubmitting = false;
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.billForm.controls).forEach(key => {
        this.billForm.get(key)?.markAsTouched();
      });
    }
  }

  /**
   * Close the dialog and reset form
   */
  closeDialog() {
    this.billForm.reset();
    this.billForm.patchValue({ 
      status: 'Active',
      billType: 'other',
      isFixedBill: false,
      isIncludedInMonthlyPayment: false
    }); // Reset to defaults
    this.visibleChange.emit(false);
  }

  /**
   * Handle dialog visibility change
   */
  onVisibleChange(visible: boolean) {
    this.visibleChange.emit(visible);
    if (!visible) {
      this.closeDialog();
    }
  }

  /**
   * Get error message for a form field
   */
  getFieldError(fieldName: string): string {
    const field = this.billForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['min']) {
        return `${this.getFieldLabel(fieldName)} must be greater than $${field.errors['min'].min}`;
      }
    }
    return '';
  }

  /**
   * Get display label for form field
   */
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      billName: 'Bill Name',
      amount: 'Amount',
      dueDate: 'Due Date',
      billType: 'Bill Type',
      description: 'Description',
      priorityId: 'Priority',
      frequencyId: 'Frequency',
      billTypeId: 'Bill Type',
      paymentTypeId: 'Payment Type',
      tagId: 'Tag',
      isFixedBill: 'Fixed Bill',
      isIncludedInMonthlyPayment: 'Include in Monthly Payment'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Check if a field has an error
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.billForm.get(fieldName);
    return !!(field?.errors && field.touched);
  }
}
