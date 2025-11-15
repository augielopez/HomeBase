import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  severity: 'primary' | 'secondary' | 'success' | 'info' | 'danger';
  outlined: boolean;
  action: () => void;
  routerLink?: string[];
}

@Component({
  selector: 'app-quick-actions-bar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './quick-actions-bar.component.html',
  styleUrls: ['./quick-actions-bar.component.scss']
})
export class QuickActionsBarComponent {
  @Output() actionExecuted = new EventEmitter<string>();

  quickActions: QuickAction[] = [
    {
      id: 'add-transaction',
      label: 'Add Transaction',
      icon: 'pi pi-plus',
      severity: 'success',
      outlined: true,
      action: () => this.addTransaction(),
      routerLink: ['/financial-managment/transactions']
    },
    {
      id: 'add-bill',
      label: 'Add Bill',
      icon: 'pi pi-file-plus',
      severity: 'info',
      outlined: true,
      action: () => this.addBill()
    },
    {
      id: 'add-account',
      label: 'Add Account',
      icon: 'pi pi-building',
      severity: 'secondary',
      outlined: true,
      action: () => this.addAccount(),
      routerLink: ['/financial-managment/accounts']
    },
    {
      id: 'reconcile',
      label: 'Reconcile',
      icon: 'pi pi-check-circle',
      severity: 'danger',
      outlined: true,
      action: () => this.reconcile(),
      routerLink: ['/financial-managment/reconciliation']
    },
    {
      id: 'export-csv',
      label: 'Export CSV',
      icon: 'pi pi-download',
      severity: 'info',
      outlined: true,
      action: () => this.exportCSV()
    }
  ];

  constructor(private messageService: MessageService) {}

  executeAction(action: QuickAction) {
    try {
      action.action();
      this.actionExecuted.emit(action.id);
    } catch (error) {
      console.error('Error executing action:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to execute ${action.label}`
      });
    }
  }

  private addTransaction() {
    // TODO: Implement add transaction functionality
    // This could open a dialog or navigate to transaction form
    this.messageService.add({
      severity: 'info',
      summary: 'Coming Soon',
      detail: 'Add transaction functionality will be implemented'
    });
  }

  private addBill() {
    // TODO: Implement add bill functionality
    // This could open a dialog or navigate to bill form
    this.messageService.add({
      severity: 'info',
      summary: 'Coming Soon',
      detail: 'Add bill functionality will be implemented'
    });
  }

  private addAccount() {
    // TODO: Implement add account functionality
    // This could open a dialog or navigate to account form
    this.messageService.add({
      severity: 'info',
      summary: 'Coming Soon',
      detail: 'Add account functionality will be implemented'
    });
  }

  private reconcile() {
    // TODO: Implement reconcile functionality
    // This could open reconciliation dialog or navigate to reconciliation page
    this.messageService.add({
      severity: 'info',
      summary: 'Coming Soon',
      detail: 'Reconciliation functionality will be implemented'
    });
  }

  private exportCSV() {
    // TODO: Implement CSV export functionality
    // This could generate and download CSV files for transactions, bills, etc.
    this.messageService.add({
      severity: 'info',
      summary: 'Coming Soon',
      detail: 'CSV export functionality will be implemented'
    });
  }
}
