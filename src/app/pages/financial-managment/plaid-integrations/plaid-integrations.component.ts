import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PlaidLinkService } from '../services/plaid-link.service';
import { SupabaseService } from '../../service/supabase.service';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

@Component({
    selector: 'app-plaid-integrations',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ButtonModule,
        CardModule,
        DividerModule,
        ProgressSpinnerModule,
        TableModule,
        TagModule
    ],
    providers: [MessageService],
    styleUrls: ['./plaid-integrations.component.scss'],
    template: `
        <div class="card">
            <h1>Plaid Integrations</h1>
            
            <!-- Plaid Integration Section -->
            <div class="card mb-4">
                <h2>Bank Account Integration</h2>
                <p class="text-600 mb-4">Connect your bank accounts to automatically import transactions and account balances.</p>                              
                
                <div class="flex gap-3 mb-4">
                    <p-button 
                        label="Link Bank Account" 
                        icon="pi pi-link" 
                        (onClick)="linkBankAccount()"
                        [loading]="linking"
                        [disabled]="linking">
                    </p-button>
                    
                    <p-button 
                        label="Sync Transactions" 
                        icon="pi pi-refresh" 
                        severity="secondary"
                        (onClick)="syncTransactions()"
                        [loading]="syncing"
                        [disabled]="syncing || linkedAccounts.length === 0">
                    </p-button>
                </div>

                <!-- Linked Accounts Table -->
                <div *ngIf="linkedAccounts.length > 0" class="mb-4">
                    <h3>Linked Accounts</h3>
                    <p-table [value]="linkedAccounts" [tableStyle]="{ 'min-width': '50rem' }">                                                                  
                        <ng-template pTemplate="header">
                            <tr>
                                <th>Institution</th>
                                <th>Account Name</th>
                                <th>Type</th>
                                <th>Balance</th>
                                <th>Status</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-account>
                            <tr>
                                <td>{{ account.institution_name }}</td>
                                <td>{{ account.name }} (****{{ account.mask }})</td>                                                                            
                                <td>
                                    <p-tag [value]="account.subtype" severity="info"></p-tag>                                                                   
                                </td>
                                <td>
                                    <span class="font-bold" [class.text-green-600]="account.current_balance > 0" [class.text-red-600]="account.current_balance < 0">                                                                            
                                        {{ account.current_balance | currency:account.iso_currency_code }}                                                      
                                    </span>
                                </td>
                                <td>
                                    <p-tag value="Connected" severity="success"></p-tag>                                                                        
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            </div>

            <!-- Transaction Stats Section -->
            <div *ngIf="transactionStats" class="card mb-4">
                <div class="flex justify-between items-center mb-3">
                    <h3>Transaction Statistics</h3>
                    <p-button 
                        label="View All Transactions" 
                        icon="pi pi-external-link" 
                        severity="secondary"
                        [outlined]="true"
                        routerLink="/pages/transactions">
                    </p-button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="p-4 rounded-lg bg-blue-50 border border-blue-200">                                                                              
                        <div class="text-center">
                            <div class="text-2xl font-bold text-blue-600">{{ transactionStats.total_transactions }}</div>                                       
                            <div class="text-sm text-blue-500">Total Transactions</div>                                                                         
                        </div>
                    </div>
                    <div class="p-4 rounded-lg bg-green-50 border border-green-200">                                                                            
                        <div class="text-center">
                            <div class="text-2xl font-bold text-green-600">{{ transactionStats.total_accounts }}</div>                                          
                            <div class="text-sm text-green-500">Linked Accounts</div>                                                                           
                        </div>
                    </div>
                    <div class="p-4 rounded-lg bg-purple-50 border border-purple-200">                                                                          
                        <div class="text-center">
                            <div class="text-2xl font-bold text-purple-600">{{ transactionStats.last_sync | date:'short' }}</div>                               
                            <div class="text-sm text-purple-500">Last Sync</div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `
})
export class PlaidIntegrationsComponent implements OnInit {
    linkedAccounts: any[] = [];
    transactionStats: any = null;
    linking = false;
    syncing = false;

    constructor(
        private plaidService: PlaidLinkService,
        private supabaseService: SupabaseService,
        private messageService: MessageService
    ) {}

    async ngOnInit() {
        await this.loadPlaidData();
    }

    async linkBankAccount() {
        this.linking = true;
        
        try {
            console.log('Starting Plaid link process...');
            
            this.plaidService.openPlaid(
                async (public_token: string, metadata: any) => {
                    console.log('Plaid success callback:', { public_token, metadata });                                                                         
                    try {
                        const result = await this.plaidService.exchangePublicToken(public_token, metadata);                                                     
                        
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Success',
                            detail: result.message
                        });
                        
                        await this.loadPlaidData();
                    } catch (error) {
                        console.error('Error exchanging token:', error);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Failed to link bank account: ' + (error as any).message                                                                    
                        });
                    } finally {
                        this.linking = false;
                    }
                },
                (err: any, metadata: any) => {
                    console.error('Plaid exited:', err, metadata);
                    this.linking = false;
                    
                    if (err) {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Failed to connect bank account: ' + err.error_message                                                                      
                        });
                    }
                }
            );
        } catch (error) {
            console.error('Error opening Plaid:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to open bank connection: ' + (error as any).message                                                                             
            });
            this.linking = false;
        }
    }

    async syncTransactions() {
        this.syncing = true;
        
        try {
            const result = await this.plaidService.syncTransactions();
            
            this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: result.message
            });
            
            await this.loadPlaidData();
        } catch (error) {
            console.error('Error syncing transactions:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to sync transactions'
            });
        } finally {
            this.syncing = false;
        }
    }

    private async loadPlaidData() {
        try {
            const { data, error } = await this.supabaseService.getClient().functions.invoke('get-plaid-data');                                                  
            
            if (error) throw error;
            
            this.linkedAccounts = data.accounts || [];
            this.transactionStats = data.transactionStats;
        } catch (error) {
            console.error('Error loading Plaid data:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load Plaid data: ' + (error as any).message
            });
        }
    }
}
