import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { MessageService } from 'primeng/api';
import { BillCreationService } from '../../service/bill-creation.service';

export interface QuickBillForm {
  billName: string;
  amount: number;
  dueDate: Date;
  billType?: string;
  description?: string;
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
    DropdownModule
  ],
  templateUrl: './bill-creation-dialog.component.html',
  styleUrls: ['./bill-creation-dialog.component.scss']
})
export class BillCreationDialogComponent implements OnInit {
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() billCreated = new EventEmitter<any>();

  billForm!: FormGroup;
  isSubmitting = false;

  // Common bill types for dropdown
  billTypes = [
    { label: 'Utilities', value: 'utilities' },
    { label: 'Rent/Mortgage', value: 'rent_mortgage' },
    { label: 'Insurance', value: 'insurance' },
    { label: 'Credit Card', value: 'credit_card' },
    { label: 'Loan Payment', value: 'loan_payment' },
    { label: 'Subscription', value: 'subscription' },
    { label: 'Phone/Internet', value: 'phone_internet' },
    { label: 'Medical', value: 'medical' },
    { label: 'Other', value: 'other' }
  ];

  constructor(
    private fb: FormBuilder,
    private billCreationService: BillCreationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.initForm();
  }

  private initForm() {
    this.billForm = this.fb.group({
      billName: ['', [Validators.required, Validators.minLength(2)]],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      dueDate: ['', Validators.required],
      billType: ['other'], // Default to 'other'
      description: ['']
    });
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
    this.billForm.patchValue({ billType: 'other' }); // Reset to default
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
      description: 'Description'
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
