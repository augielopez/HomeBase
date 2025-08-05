import { Routes } from '@angular/router';
import { Login } from './login';

const authRoutes: Routes = [
    { 
        path: 'login', 
        component: Login
    }
];

export default authRoutes;
