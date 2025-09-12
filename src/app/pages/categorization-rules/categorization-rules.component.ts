import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';
import { SupabaseService } from '../service/supabase.service';
import { AiCategorizationService } from '../service/ai-categorization.service';
import { TransactionCategory, CategorizationRule } from '../../interfaces';

@Component({
    selector: 'app-categorization-rules',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        ButtonModule,
        CardModule,
        TableModule,
        InputTextModule,
        DropdownModule,
        DialogModule,
        ToastModule,
        ConfirmDialogModule
    ],
    providers: [MessageService, ConfirmationService],
    template: `
        <div class="card">
            <div class="flex justify-between items-center mb-4">
                <h1>Categorization Rules</h1>
                <div class="flex gap-2">
                    <p-button 
                        icon="pi pi-refresh" 
                        label="Re-categorize All Transactions"
                        (onClick)="recategorizeAllTransactions()"
                        [loading]="loading"
                        severity="secondary"
                        [outlined]="true">
                    </p-button>
                    <p-button 
                        icon="pi pi-plus" 
                        label="Add Rule"
                        (onClick)="showAddRuleDialog = true"
                        severity="primary">
                    </p-button>
                </div>
            </div>
            
            <p-table [value]="rules" [loading]="loading">
                    <ng-template pTemplate="header">
                        <tr>
                            <th>Rule Name</th>
                            <th>Type</th>
                            <th>Category</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </ng-template>
                    
                    <ng-template pTemplate="body" let-rule>
                        <tr>
                            <td>{{ rule.rule_name }}</td>
                            <td>{{ rule.rule_type }}</td>
                            <td>{{ getCategoryName(rule.category_id) }}</td>
                            <td>{{ rule.priority }}</td>
                            <td>{{ rule.is_active ? 'Active' : 'Inactive' }}</td>
                            <td>
                                <div class="flex items-center gap-2">
                                    <p-button
                                            icon="pi pi-pencil"
                                            size="small"
                                            (onClick)="editRule(rule)"
                                            outlined="true">
                                    </p-button>
                                    <p-button
                                            icon="pi pi-trash"
                                            size="small"
                                            severity="danger"
                                            (onClick)="deleteRule(rule)"
                                            outlined="true">
                                    </p-button>
                                </div>
                            </td>

                        </tr>
                    </ng-template>
                </p-table>
            </div>

        <p-dialog 
            [(visible)]="showAddRuleDialog" 
            header="Add New Rule"
            [modal]="true"
            [style]="{width: '600px'}">
            
            <div class="flex flex-col gap-4">
                <div class="field">
                    <label class="block mb-2 font-medium">Rule Name <span class="text-red-500">*</span></label>
                    <input pInputText [(ngModel)]="newRule.rule_name" class="w-full" placeholder="Enter rule name" />
                </div>
                
                <div class="field">
                    <label class="block mb-2 font-medium">Rule Type <span class="text-red-500">*</span></label>
                    <p-dropdown 
                        [options]="ruleTypes" 
                        [(ngModel)]="newRule.rule_type"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select rule type"
                        class="w-full">
                    </p-dropdown>
                </div>
                
                <div class="field">
                    <label class="block mb-2 font-medium">Category <span class="text-red-500">*</span></label>
                    <p-dropdown 
                        [options]="categories" 
                        [(ngModel)]="newRule.category_id"
                        optionLabel="name"
                        optionValue="id"
                        placeholder="Select category"
                        class="w-full"
                        appendTo="body">
                    </p-dropdown>
                </div>
                
                <div class="field">
                    <label class="block mb-2 font-medium">Priority</label>
                    <input pInputText type="number" [(ngModel)]="newRule.priority" class="w-full" placeholder="0" min="0" />
                    <small class="text-gray-600">Higher numbers have higher priority</small>
                </div>
            </div>

            <ng-template pTemplate="footer">
                <div class="flex justify-end gap-2">
                    <p-button label="Cancel" (onClick)="cancelEdit()" severity="secondary" outlined="true" ></p-button>
                    <p-button label="Save" (onClick)="saveRule()" [loading]="saving"></p-button>
                </div>
            </ng-template>
        </p-dialog>

        <p-toast></p-toast>
        <p-confirmDialog></p-confirmDialog>
    `
})
export class CategorizationRulesComponent implements OnInit {
    rules: CategorizationRule[] = [];
    categories: TransactionCategory[] = [];
    loading = false;
    saving = false;

    showAddRuleDialog = false;
    editingRule: CategorizationRule | null = null;

    newRule: Partial<CategorizationRule> = {
        rule_name: '',
        rule_type: 'keyword',
        rule_conditions: {},
        category_id: '',
        priority: 0,
        is_active: true
    };

    ruleTypes = [
        { label: 'Keyword Match', value: 'keyword' },
        { label: 'Merchant Match', value: 'merchant' },
        { label: 'Amount Range', value: 'amount_range' }
    ];

    constructor(
        private supabaseService: SupabaseService,
        private aiCategorizationService: AiCategorizationService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit() {
        this.loadRules();
        this.loadCategories();
    }

    async loadRules() {
        this.loading = true;
        try {
            const { data: rules, error } = await this.supabaseService.getClient()
                .from('hb_categorization_rules')
                .select('*')
                .order('priority', { ascending: false });

            if (error) throw error;
            this.rules = rules || [];
        } catch (error) {
            console.error('Error loading rules:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load categorization rules'
            });
        } finally {
            this.loading = false;
        }
    }

    async loadCategories() {
        try {
            const { data: categories, error } = await this.supabaseService.getClient()
                .from('hb_transaction_categories')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            this.categories = categories || [];
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    editRule(rule: CategorizationRule) {
        this.editingRule = rule;
        this.newRule = { ...rule };
        this.showAddRuleDialog = true;
    }

    async saveRule() {
        if (!this.newRule.rule_name || !this.newRule.category_id) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Please fill in all required fields'
            });
            return;
        }

        this.saving = true;
        try {
            if (this.editingRule) {
                const { error } = await this.supabaseService.getClient()
                    .from('hb_categorization_rules')
                    .update(this.newRule)
                    .eq('id', this.editingRule.id);

                if (error) throw error;
                
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Rule updated successfully'
                });
            } else {
                // Get current user ID for new rules
                const userId = await this.supabaseService.getCurrentUserId();
                
                const ruleToInsert = {
                    ...this.newRule,
                    user_id: userId
                };

                const { error } = await this.supabaseService.getClient()
                    .from('hb_categorization_rules')
                    .insert([ruleToInsert]);

                if (error) throw error;
                
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Rule created successfully'
                });
            }

            this.cancelEdit();
            this.loadRules();
        } catch (error) {
            console.error('Error saving rule:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to save rule'
            });
        } finally {
            this.saving = false;
        }
    }

    deleteRule(rule: CategorizationRule) {
        this.confirmationService.confirm({
            message: `Are you sure you want to delete the rule "${rule.rule_name}"?`,
            header: 'Confirm Deletion',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.performDelete(rule.id);
            }
        });
    }

    async performDelete(ruleId: string) {
        try {
            const { error } = await this.supabaseService.getClient()
                .from('hb_categorization_rules')
                .delete()
                .eq('id', ruleId);

            if (error) throw error;

            this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Rule deleted successfully'
            });

            this.loadRules();
        } catch (error) {
            console.error('Error deleting rule:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete rule'
            });
        }
    }

    cancelEdit() {
        this.showAddRuleDialog = false;
        this.editingRule = null;
        this.newRule = {
            rule_name: '',
            rule_type: 'keyword',
            rule_conditions: {},
            category_id: '',
            priority: 0,
            is_active: true
        };
    }

    getCategoryName(categoryId: string): string {
        const category = this.categories.find(c => c.id === categoryId);
        return category?.name || 'Unknown';
    }

    async recategorizeAllTransactions() {
        this.confirmationService.confirm({
            message: 'This will re-categorize all your existing transactions using current rules and AI. This may take a few minutes. Continue?',
            header: 'Confirm Re-categorization',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.performRecategorization();
            }
        });
    }

    async performRecategorization() {
        this.loading = true;
        try {
            const result = await this.aiCategorizationService.recategorizeAllTransactions();
            
            if (result.success) {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Re-categorization Complete',
                    detail: `Successfully processed ${result.processed} transactions. ${result.errors} errors occurred.`
                });
            } else {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Re-categorization Failed',
                    detail: 'Failed to re-categorize transactions. Please try again.'
                });
            }
        } catch (error) {
            console.error('Error during re-categorization:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'An unexpected error occurred during re-categorization.'
            });
        } finally {
            this.loading = false;
        }
    }
} 