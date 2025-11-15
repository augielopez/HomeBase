import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/demo/dashboard/dashboard';
import { Documentation } from './app/pages/demo/documentation/documentation';
import { Landing } from './app/pages/demo/landing/landing';
import { Notfound } from './app/pages/demo/notfound/notfound';

export const appRoutes: Routes = [
    { path: '', redirectTo: '/auth', pathMatch: 'full' },
    {
        path: 'dashboard',
        component: AppLayout,
        children: [
            { path: '', component: Dashboard },
            { path: 'uikit', loadChildren: () => import('./app/pages/demo/uikit/uikit.routes') },
            { path: 'documentation', component: Documentation },
            { path: 'pages', loadChildren: () => import('./app/pages/pages.routes') }
        ]
    },
    { path: 'landing', component: Landing },
    { path: 'notfound', component: Notfound },
    { path: 'auth', loadChildren: () => import('./app/pages/demo/auth/auth.routes').then(m => m.default) },
    { path: '**', redirectTo: '/dashboard' }
];
