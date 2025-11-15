import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

// Services
import { DuplicateAnalysisService, DuplicateTransaction, DuplicateSummary } from '../../../pages/financial-managment/services/duplicate-analysis.service';

@Component({
  selector: 'app-duplicate-checker',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    TableModule,
    ToastModule,
    ProgressSpinnerModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="container mx-auto p-6">
      <h1 class="text-2xl font-bold mb-6">Duplicate Transaction Checker</h1>
      
      <!-- Summary Card -->
      <p-card header="Duplicate Summary" class="mb-6">
        <div *ngIf="loadingSummary" class="flex justify-center">
          <p-progressSpinner></p-progressSpinner>
        </div>
        
        <div *ngIf="!loadingSummary && summary.length === 0" class="text-center text-green-600">
          <i class="pi pi-check-circle text-4xl mb-4"></i>
          <p class="text-lg">No duplicates found! Your database is clean.</p>
        </div>
        
        <div *ngIf="!loadingSummary && summary.length > 0">
          <p-table [value]="summary" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Import Method</th>
                <th>Duplicate Groups</th>
                <th>Total Duplicate Transactions</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.import_method }}</td>
                <td>{{ item.duplicate_groups }}</td>
                <td>{{ item.total_duplicate_transactions }}</td>
              </tr>
            </ng-template>
          </p-table>
          
          <div class="mt-4 flex gap-4">
            <p-button 
              label="View Details" 
              icon="pi pi-eye"
              (onClick)="loadDuplicateDetails()"
              [loading]="loadingDetails">
            </p-button>
            
            <p-button 
              label="Clean Duplicates" 
              icon="pi pi-trash"
              severity="danger"
              (onClick)="confirmCleanup()"
              [disabled]="loadingDetails || duplicates.length === 0">
            </p-button>
          </div>
        </div>
      </p-card>
      
      <!-- Details Table -->
      <p-card header="Duplicate Details" *ngIf="duplicates.length > 0">
        <div *ngIf="loadingDetails" class="flex justify-center">
          <p-progressSpinner></p-progressSpinner>
        </div>
        
        <p-table [value]="duplicates" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Description</th>
              <th>Account</th>
              <th>Import Method</th>
              <th>Duplicate Count</th>
              <th>Transaction IDs</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-duplicate>
            <tr>
              <td>{{ duplicate.date }}</td>
              <td>{{ duplicate.amount | currency }}</td>
              <td>{{ duplicate.name }}</td>
              <td>{{ duplicate.account_id }}</td>
              <td>{{ duplicate.import_method }}</td>
              <td>{{ duplicate.duplicate_count }}</td>
              <td class="text-xs">{{ duplicate.transaction_ids }}</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
      
      <!-- Results -->
      <p-card header="Cleanup Results" *ngIf="cleanupResult">
        <div class="text-center">
          <i class="pi pi-check-circle text-4xl text-green-600 mb-4"></i>
          <p class="text-lg">Cleanup completed successfully!</p>
          <p>Deleted {{ cleanupResult.deleted_count }} duplicate transactions.</p>
          <p class="text-sm text-gray-600 mt-2">Kept transaction IDs: {{ cleanupResult.kept_transaction_ids }}</p>
        </div>
      </p-card>
    </div>
    
    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    .container {
      max-width: 1200px;
    }
  `]
})
export class DuplicateCheckerComponent implements OnInit {
  loadingSummary = false;
  loadingDetails = false;
  summary: DuplicateSummary[] = [];
  duplicates: DuplicateTransaction[] = [];
  cleanupResult: any = null;

  constructor(
    private duplicateAnalysisService: DuplicateAnalysisService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.loadSummary();
  }

  async loadSummary() {
    this.loadingSummary = true;
    try {
      this.summary = await this.duplicateAnalysisService.getDuplicateSummary();
      console.log('Duplicate summary:', this.summary);
    } catch (error) {
      console.error('Error loading summary:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load duplicate summary'
      });
    } finally {
      this.loadingSummary = false;
    }
  }

  async loadDuplicateDetails() {
    this.loadingDetails = true;
    try {
      this.duplicates = await this.duplicateAnalysisService.findDuplicateTransactions();
      console.log('Duplicate details:', this.duplicates);
    } catch (error) {
      console.error('Error loading duplicate details:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load duplicate details'
      });
    } finally {
      this.loadingDetails = false;
    }
  }

  confirmCleanup() {
    this.confirmationService.confirm({
      message: `Are you sure you want to clean up ${this.duplicates.reduce((sum, dup) => sum + dup.duplicate_count - 1, 0)} duplicate transactions? This will keep only the oldest transaction in each duplicate group.`,
      header: 'Confirm Cleanup',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.cleanDuplicates();
      }
    });
  }

  async cleanDuplicates() {
    try {
      this.cleanupResult = await this.duplicateAnalysisService.cleanDuplicateTransactions();
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Cleaned up ${this.cleanupResult.deleted_count} duplicate transactions`
      });
      
      // Reload the summary and details
      await this.loadSummary();
      await this.loadDuplicateDetails();
      
    } catch (error) {
      console.error('Error cleaning duplicates:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to clean up duplicates'
      });
    }
  }
}




