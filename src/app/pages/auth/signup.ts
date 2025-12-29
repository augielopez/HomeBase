import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AppFloatingConfigurator } from '../../layout/component/app.floatingconfigurator';
import { AuthService } from '../service/auth.service';

@Component({
    selector: 'app-signup',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule,
        InputTextModule,
        PasswordModule,
        ButtonModule,
        RippleModule,
        ToastModule,
        AppFloatingConfigurator
    ],
    providers: [MessageService],
    template: `
        <app-floating-configurator />
        <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
            <div class="flex flex-col items-center justify-center">
                <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                    <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
                        <div class="text-center mb-8">
                            <svg viewBox="0 0 54 40" xmlns="http://www.w3.org/2000/svg" class="mb-8 w-16 shrink-0 mx-auto">
                                <path d="M10 6 H44 V26 L27 38 L10 26 Z" fill="var(--primary-color)" />
                                <text x="27" y="20" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="10" fill="var(--primary-contrast-color)" font-weight="bold">
                                    HB
                                </text>
                            </svg>
                            <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Create Your Account</div>
                            <span class="text-muted-color font-medium">Use your invitation code to get started</span>
                        </div>

                        <form [formGroup]="form" (ngSubmit)="onSubmit()">
                            <div class="grid grid-cols-1 gap-6">
                                <div>
                                    <label class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Invitation Code</label>
                                    <input
                                        pInputText
                                        type="text"
                                        placeholder="Enter your invitation code"
                                        class="w-full"
                                        formControlName="invitationCode"
                                    />
                                    <small class="text-red-500" *ngIf="submitted && form.controls['invitationCode'].invalid">
                                        A valid invitation code is required.
                                    </small>
                                </div>

                                <div>
                                    <label class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Email</label>
                                    <input pInputText type="email" placeholder="Email address" class="w-full" formControlName="email" />
                                    <small class="text-red-500" *ngIf="submitted && form.controls['email'].invalid">
                                        Please enter a valid email address.
                                    </small>
                                </div>

                                <div>
                                    <label class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Username</label>
                                    <input pInputText type="text" placeholder="Username" class="w-full" formControlName="username" />
                                    <small class="text-red-500" *ngIf="submitted && form.controls['username'].invalid">
                                        Username must be at least 3 characters.
                                    </small>
                                </div>

                                <div>
                                    <label class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Display Name (optional)</label>
                                    <input pInputText type="text" placeholder="Display name" class="w-full" formControlName="displayName" />
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Password</label>
                                        <p-password
                                            formControlName="password"
                                            [toggleMask]="true"
                                            [feedback]="false"
                                            [fluid]="true"
                                            styleClass="w-full"
                                        ></p-password>
                                        <small class="text-red-500" *ngIf="submitted && form.controls['password'].invalid">
                                            Password must be at least 8 characters.
                                        </small>
                                    </div>
                                    <div>
                                        <label class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Confirm Password</label>
                                        <p-password
                                            formControlName="confirmPassword"
                                            [toggleMask]="true"
                                            [feedback]="false"
                                            [fluid]="true"
                                            styleClass="w-full"
                                        ></p-password>
                                        <small class="text-red-500" *ngIf="submitted && form.hasError('passwordMismatch')">
                                            Passwords must match.
                                        </small>
                                    </div>
                                </div>

                                <p-button
                                    label="Create Account"
                                    styleClass="w-full"
                                    [loading]="loading"
                                    type="submit">
                                </p-button>

                                <div class="text-center">
                                    <span class="text-muted-color">Already have an account? </span>
                                    <a routerLink="/auth/login" class="font-medium no-underline cursor-pointer text-primary">Sign In</a>
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
export class SignUpComponent {
    form: FormGroup;
    loading = false;
    submitted = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router,
        private messageService: MessageService
    ) {
        this.form = this.fb.group(
            {
                invitationCode: ['', [Validators.required, Validators.minLength(12)]],
                email: ['', [Validators.required, Validators.email]],
                username: ['', [Validators.required, Validators.minLength(3)]],
                displayName: [''],
                password: ['', [Validators.required, Validators.minLength(8)]],
                confirmPassword: ['', [Validators.required]]
            },
            { validators: this.passwordMatchValidator }
        );
    }

    private passwordMatchValidator(group: FormGroup) {
        const password = group.get('password')?.value;
        const confirmPassword = group.get('confirmPassword')?.value;
        return password === confirmPassword ? null : { passwordMismatch: true };
    }

    async onSubmit() {
        this.submitted = true;

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.loading = true;
        const { invitationCode, email, username, displayName, password } = this.form.value;

        try {
            const result = await this.authService.signUpWithInvitation({
                code: invitationCode.trim(),
                email: email.trim().toLowerCase(),
                username: username.trim(),
                displayName: displayName?.trim(),
                password
            });

            if (result.error) {
                this.messageService.add({ severity: 'error', summary: 'Sign Up Failed', detail: result.error });
                return;
            }

            // Auto sign-in after successful account creation
            const login = await this.authService.signIn(email.trim().toLowerCase(), password);
            if (login.error) {
                this.messageService.add({ severity: 'warn', summary: 'Account Created', detail: 'Please sign in with your new credentials.' });
                await this.router.navigate(['/auth/login']);
                return;
            }

            this.messageService.add({ severity: 'success', summary: 'Welcome!', detail: 'Account created successfully.' });
            await this.router.navigate(['/dashboard']);
        } catch (error: any) {
            console.error('Signup error:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Sign Up Failed',
                detail: error.message || 'An unexpected error occurred'
            });
        } finally {
            this.loading = false;
        }
    }
}

