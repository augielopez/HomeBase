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
            <h1>Categorization Rules</h1>
            <p>Manage automatic transaction categorization rules</p>
            
            <p-button 
                icon="pi pi-plus" 
                label="Add Rule" 
                (onClick)="showAddRuleDialog = true"
                severity="primary">
            </p-button>

            <div class="card">
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
                                <p-button 
                                    icon="pi pi-pencil" 
                                    size="small"
                                    (onClick)="editRule(rule)">
                                </p-button>
                                <p-button 
                                    icon="pi pi-trash" 
                                    size="small"
                                    severity="danger"
                                    (onClick)="deleteRule(rule)">
                                </p-button>
                            </td>
                        </tr>
                    </ng-template>
                </p-table>
            </div>
        </div>

        <p-dialog 
            [(visible)]="showAddRuleDialog" 
            header="Add New Rule"
            [modal]="true"
            [style]="{width: '500px'}">
            
            <div>
                <label>Rule Name</label>
                <input pInputText [(ngModel)]="newRule.rule_name" class="w-full">
                
                <label>Rule Type</label>
                <p-dropdown 
                    [options]="ruleTypes" 
                    [(ngModel)]="newRule.rule_type"
                    optionLabel="label"
                    optionValue="value">
                </p-dropdown>
                
                <label>Category</label>
                <p-dropdown 
                    [options]="categories" 
                    [(ngModel)]="newRule.category_id"
                    optionLabel="name"
                    optionValue="id">
                </p-dropdown>
                
                <label>Priority</label>
                <input pInputText type="number" [(ngModel)]="newRule.priority">
            </div>

            <ng-template pTemplate="footer">
                <p-button label="Cancel" (onClick)="cancelEdit()"></p-button>
                <p-button label="Save" (onClick)="saveRule()" [loading]="saving"></p-button>
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
                const { error } = await this.supabaseService.getClient()
                    .from('hb_categorization_rules')
                    .insert([this.newRule]);

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
} 