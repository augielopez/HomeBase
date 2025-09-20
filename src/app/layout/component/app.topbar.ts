import { Component } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { MenuModule } from 'primeng/menu';
import { AppConfigurator } from './app.configurator';
import { LayoutService } from '../service/layout.service';
import { AuthService } from '../../pages/service/auth.service';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, MenuModule, AppConfigurator],
    template: ` <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" (click)="layoutService.onMenuToggle()">
                <i class="pi pi-bars"></i>
            </button>
            <a class="layout-topbar-logo" routerLink="/dashboard">
                <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                    <!-- Home plate shape -->
                    <path 
                        d="M12 8 H52 V36 L32 56 L12 36 Z" 
                        fill="var(--primary-color)" 
                    />

                    <!-- HB Text -->
                    <text 
                        x="32" 
                        y="30" 
                        text-anchor="middle" 
                        dominant-baseline="middle" 
                        font-family="Arial, sans-serif" 
                        font-size="16" 
                        fill="var(--primary-contrast-color)" 
                        font-weight="bold"
                    >
                        HB
                    </text>
                </svg>
                <span>HOMEBASE</span>
            </a>
        </div>

        <div class="layout-topbar-actions">
            <div class="layout-config-menu">
                <button type="button" class="layout-topbar-action" (click)="toggleDarkMode()">
                    <i [ngClass]="{ 'pi ': true, 'pi-moon': layoutService.isDarkTheme(), 'pi-sun': !layoutService.isDarkTheme() }"></i>
                </button>
                <div class="relative">
                    <button
                        class="layout-topbar-action layout-topbar-action-highlight"
                        pStyleClass="@next"
                        enterFromClass="hidden"
                        enterActiveClass="animate-scalein"
                        leaveToClass="hidden"
                        leaveActiveClass="animate-fadeout"
                        [hideOnOutsideClick]="true"
                    >
                        <i class="pi pi-palette"></i>
                    </button>
                    <app-configurator />
                </div>
            </div>

            <button class="layout-topbar-menu-button layout-topbar-action" pStyleClass="@next" enterFromClass="hidden" enterActiveClass="animate-scalein" leaveToClass="hidden" leaveActiveClass="animate-fadeout" [hideOnOutsideClick]="true">
                <i class="pi pi-ellipsis-v"></i>
            </button>

            <div class="layout-topbar-menu hidden lg:block">
                <div class="layout-topbar-menu-content">
                    <button type="button" class="layout-topbar-action" (click)="logout()">
                        <i class="pi pi-sign-out"></i>
                        <span>Logout</span>
                    </button>
                    <button type="button" class="layout-topbar-action">
                        <i class="pi pi-calendar"></i>
                        <span>Calendar</span>
                    </button>
                    <button type="button" class="layout-topbar-action">
                        <i class="pi pi-inbox"></i>
                        <span>Messages</span>
                    </button>
                    <button type="button" class="layout-topbar-action" (click)="userMenu.toggle($event)">
                        <i class="pi pi-user"></i>
                        <span>Profile</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- User Menu -->
    <p-menu #userMenu [model]="userMenuItems" [popup]="true" />`
})
export class AppTopbar {
    items!: MenuItem[];
    userMenuItems!: MenuItem[];

    constructor(
        public layoutService: LayoutService,
        private authService: AuthService,
        private router: Router
    ) {
        this.initializeUserMenu();
    }

    private initializeUserMenu() {
        this.userMenuItems = [
            {
                label: 'Profile',
                items: [
                    {
                        label: 'Settings',
                        icon: 'pi pi-cog',
                        command: () => {
                            // Navigate to settings page
                            this.router.navigate(['/settings']);
                        }
                    },
                    {
                        label: 'Logout',
                        icon: 'pi pi-sign-out',
                        command: () => {
                            this.logout();
                        }
                    }
                ]
            }
        ];
    }

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
    }

    async logout() {
        try {
            await this.authService.signOut();
            this.router.navigate(['/auth/login']);
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
}
