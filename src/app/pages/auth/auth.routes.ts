import { Routes } from '@angular/router';
import { Login } from './login';
import { SignUpComponent } from './signup';

const authRoutes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: Login },
    { path: 'signup', component: SignUpComponent }
];

export default authRoutes;

