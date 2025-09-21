import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../service/supabase.service';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { Subject, takeUntil } from 'rxjs';

export interface TypeRecord {
  id?: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

@Component({
  selector: 'app-type-crud-table',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    DialogModule,
    ConfirmDialogModule,
    ToastModule
  ],
  providers: [ConfirmationService],
  templateUrl: './type-crud-table.component.html',
  styleUrls: ['./type-crud-table.component.scss']
})
export class TypeCrudTableComponent implements OnInit, OnDestroy, OnChanges {
  @Input() typeConfig!: any; // SettingsType from parent
  @Input() isLoading = false;

  data: TypeRecord[] = [];
  loading = false;
  showDialog = false;
  editingRecord: TypeRecord | null = null;
  isEditing = false;
  
  form!: FormGroup;
  private destroy$ = new Subject<void>();

  constructor(
    private supabaseService: SupabaseService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.initializeForm();
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Check if typeConfig has changed
    if (changes['typeConfig'] && changes['typeConfig'].currentValue) {
      console.log('TypeConfig changed, loading new data for:', changes['typeConfig'].currentValue.tableName);
      this.loadData();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['']
    });
  }

  async loadData() {
    if (!this.typeConfig?.tableName) {
      console.log('No typeConfig or tableName available');
      return;
    }

    console.log('Loading data for table:', this.typeConfig.tableName);
    this.loading = true;
    try {
      const { data, error } = await this.supabaseService.getClient()
        .from(this.typeConfig.tableName)
        .select('*')
        .order('name');

      if (error) {
        console.error('Error loading data for table', this.typeConfig.tableName, ':', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to load data from ${this.typeConfig.tableName}`
        });
        return;
      }

      console.log(`Loaded ${data?.length || 0} records from ${this.typeConfig.tableName}`);
      this.data = data || [];
    } catch (error) {
      console.error('Error loading data for table', this.typeConfig.tableName, ':', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to load data from ${this.typeConfig.tableName}`
      });
    } finally {
      this.loading = false;
    }
  }

  openAddDialog() {
    this.editingRecord = null;
    this.isEditing = false;
    this.form.reset();
    this.showDialog = true;
  }

  openEditDialog(record: TypeRecord) {
    this.editingRecord = record;
    this.isEditing = true;
    this.form.patchValue({
      name: record.name,
      description: record.description || ''
    });
    this.showDialog = true;
  }

  async saveRecord() {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const formData = this.form.value;
    this.loading = true;

    try {
      if (this.isEditing && this.editingRecord?.id) {
        // Update existing record
        const { error } = await this.supabaseService.getClient()
          .from(this.typeConfig.tableName)
          .update({
            name: formData.name,
            description: formData.description || null,
            updated_by: 'USER',
            updated_at: new Date().toISOString()
          })
          .eq('id', this.editingRecord.id);

        if (error) {
          throw error;
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Record updated successfully'
        });
      } else {
        // Create new record
        const { error } = await this.supabaseService.getClient()
          .from(this.typeConfig.tableName)
          .insert([{
            name: formData.name,
            description: formData.description || null,
            created_by: 'USER',
            updated_by: 'USER'
          }]);

        if (error) {
          throw error;
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Record created successfully'
        });
      }

      this.showDialog = false;
      await this.loadData();
    } catch (error: any) {
      console.error('Error saving record:', error);
      
      let errorMessage = 'Failed to save record';
      if (error.code === '23505') { // Unique constraint violation
        errorMessage = 'A record with this name already exists';
      } else if (error.message) {
        errorMessage = error.message;
      }

      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage
      });
    } finally {
      this.loading = false;
    }
  }

  confirmDelete(record: TypeRecord) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${record.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.deleteRecord(record);
      }
    });
  }

  async deleteRecord(record: TypeRecord) {
    if (!record.id) return;

    this.loading = true;
    try {
      const { error } = await this.supabaseService.getClient()
        .from(this.typeConfig.tableName)
        .delete()
        .eq('id', record.id);

      if (error) {
        throw error;
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Record deleted successfully'
      });

      await this.loadData();
    } catch (error: any) {
      console.error('Error deleting record:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete record'
      });
    } finally {
      this.loading = false;
    }
  }

  closeDialog() {
    this.showDialog = false;
    this.editingRecord = null;
    this.isEditing = false;
    this.form.reset();
  }

  private markFormGroupTouched() {
    Object.keys(this.form.controls).forEach(key => {
      this.form.get(key)?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName} is required`;
      }
      if (field.errors['minlength']) {
        return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['maxlength']) {
        return `${fieldName} must not exceed ${field.errors['maxlength'].requiredLength} characters`;
      }
    }
    return '';
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field?.errors && field.touched);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}
