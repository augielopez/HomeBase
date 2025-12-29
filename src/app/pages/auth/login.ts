import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AppFloatingConfigurator } from '../../layout/component/app.floatingconfigurator';
import { AuthService } from '../service/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [ButtonModule, CheckboxModule, InputTextModule, PasswordModule, FormsModule, RouterModule, RippleModule, ToastModule, AppFloatingConfigurator],
    providers: [MessageService],
    template: `
        <app-floating-configurator />
        <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
            <div class="flex flex-col items-center justify-center">
                <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                    <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
                        <div class="text-center mb-8">
                            <svg viewBox="0 0 54 40" xmlns="http://www.w3.org/2000/svg" class="mb-8 w-16 shrink-0 mx-auto">
                            <!-- Scaled Home plate shape -->
                            <path 
                                d="M10 6 H44 V26 L27 38 L10 26 Z" 
                                fill="var(--primary-color)" 
                            />

                            <!-- HB Text -->
                            <text 
                                x="27" 
                                y="20" 
                                text-anchor="middle" 
                                dominant-baseline="middle" 
                                font-family="Arial, sans-serif" 
                                font-size="10" 
                                fill="var(--primary-contrast-color)" 
                                font-weight="bold"
                            >
                                HB
                            </text>
                            </svg>
                            <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Welcome to HomeBase!</div>
                            <span class="text-muted-color font-medium">Sign in to continue</span>
                        </div>

                        <form (ngSubmit)="onSignIn()" (keydown.enter)="onSignIn()">
                            <div>
                                <label for="email1" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Email</label>
                                <input pInputText id="email1" type="email" placeholder="Email address" class="w-full md:w-[30rem] mb-8" [(ngModel)]="email" name="email" required (keydown.enter)="onSignIn()" />

                                <label for="password1" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Password</label>
                                <p-password id="password1" [(ngModel)]="password" placeholder="Password" [toggleMask]="true" styleClass="mb-4" [fluid]="true" [feedback]="false" name="password" required (onKeyDown)="onKeyDown($event)"></p-password>

                                <div class="flex items-center justify-between mt-2 mb-8 gap-8">
                                    <div class="flex items-center">
                                        <p-checkbox [(ngModel)]="checked" id="rememberme1" binary class="mr-2"></p-checkbox>
                                        <label for="rememberme1">Remember me</label>
                                    </div>
                                    <span class="font-medium no-underline ml-2 text-right cursor-pointer text-primary">Forgot password?</span>
                                </div>
                                <p-button 
                                    label="Sign In" 
                                    styleClass="w-full mb-4" 
                                    [loading]="loading"
                                    type="submit">
                                </p-button>
                                
                                <div class="text-center">
                                    <span class="text-muted-color">Don't have an account? </span>
                                    <a routerLink="/auth/signup" class="font-medium no-underline cursor-pointer text-primary">Sign Up</a>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
        <p-toast></p-toast>
    `
})
export class Login {
    email: string = '';
    password: string = '';
    checked: boolean = false;
    loading: boolean = false;

    constructor(
        private authService: AuthService,
        private router: Router,
        private messageService: MessageService
    ) {}

    async onSignIn() {
        if (!this.email || !this.password) {
            this.messageService.add({
                severity: 'error',
                summary: 'Validation Error',
                detail: 'Please enter both email and password'
            });
            return;
        }

        this.loading = true;
        
        try {
            console.log('Attempting to sign in with:', this.email);
            const result = await this.authService.signIn(this.email, this.password);
            
            console.log('Sign in result:', result);
            
            if (result.error) {
                console.error('Authentication error:', result.error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Login Failed',
                    detail: result.error
                });
            } else {
                console.log('Authentication successful:', result.user);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Login Successful',
                    detail: 'Welcome back!'
                });
                this.router.navigate(['/dashboard']);
            }
        } catch (error: any) {
            console.error('Unexpected error during sign in:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Login Failed',
                detail: error.message || 'An unexpected error occurred'
            });
        } finally {
            this.loading = false;
        }
    }

    onKeyDown(event: Event) {
        const keyboardEvent = event as KeyboardEvent;
        if (keyboardEvent.key === 'Enter') {
            keyboardEvent.preventDefault();
            this.onSignIn();
        }
    }

}
