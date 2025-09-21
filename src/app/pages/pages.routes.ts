import { Routes } from '@angular/router';
import { Documentation } from './documentation/documentation';
import { Crud } from './crud/crud';
import { Empty } from './empty/empty';
import { AccountsComponent } from './accounts/accounts';
import { SettingsComponent } from './settings/settings.component';
import { PlaidIntegrationsComponent } from './plaid-integrations/plaid-integrations.component';
import { TransactionsComponent } from './transactions/transactions.component';
import { ReconciliationComponent } from './reconciliation/reconciliation.component';
import { FinancialInsightsComponent } from './financial-insights/financial-insights.component';
import { CategorizationRulesComponent } from './categorization-rules/categorization-rules.component';
import { MoneyFlowComponent } from './money-flow/money-flow.component';

export default [
    { path: 'documentation', component: Documentation },
    { path: 'crud', component: Crud },
    { path: 'empty', component: Empty },
    { path: 'accounts', component: AccountsComponent },
    { path: 'settings', component: SettingsComponent },
    { path: 'plaid-integrations', component: PlaidIntegrationsComponent },
    { path: 'transactions', component: TransactionsComponent },
    { path: 'reconciliation', component: ReconciliationComponent },
    { path: 'financial-insights', component: FinancialInsightsComponent },
    { path: 'categorization-rules', component: CategorizationRulesComponent },
    { path: 'money-flow', component: MoneyFlowComponent },
    { path: '**', redirectTo: '/notfound' }
] as Routes;

