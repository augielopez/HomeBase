import { Routes } from '@angular/router';
import { Documentation } from './documentation/documentation';
import { Crud } from './crud/crud';
import { Empty } from './empty/empty';
import { AccountsComponent } from './accounts/accounts';
// import { SettingsComponent } from './settings/settings.component';
// import { TransactionsComponent } from './transactions/transactions.component';

export default [
    { path: 'documentation', component: Documentation },
    { path: 'crud', component: Crud },
    { path: 'empty', component: Empty },
    { path: 'accounts', component: AccountsComponent },
    // { path: 'settings', component: SettingsComponent },
    // { path: 'transactions', component: TransactionsComponent },
    { path: '**', redirectTo: '/notfound' }
] as Routes;

