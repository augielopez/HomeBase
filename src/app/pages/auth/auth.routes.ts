import { Routes } from '@angular/router';
import { Login } from './login';

const authRoutes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    {
        path: 'login',
        component: Login
    }
];

export default authRoutes;

