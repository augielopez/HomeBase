import { Component } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { MenuModule } from 'primeng/menu';
import { DrawerModule } from 'primeng/drawer';
import { AppConfigurator } from './app.configurator';
import { LayoutService } from '../service/layout.service';
import { AuthService } from '../../pages/service/auth.service';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, MenuModule, DrawerModule, AppConfigurator],
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
    <p-menu #userMenu [model]="userMenuItems" [popup]="true" />

    <!-- UI Design Drawer -->
    <p-drawer 
        header="UI Design" 
        [(visible)]="uiDrawerVisible" 
        position="right"
        [style]="{ width: '350px' }">
        
        <div class="ui-drawer-content">
            <!-- UI Components Section -->
            <div class="ui-section">
                <h4 class="ui-section-title">UI Components</h4>
                <ul class="ui-menu-list">
                    <li><a routerLink="/uikit/formlayout"><i class="pi pi-fw pi-th-large"></i> Form Layout</a></li>
                    <li><a routerLink="/uikit/input"><i class="pi pi-fw pi-pencil"></i> Input</a></li>
                    <li><a routerLink="/uikit/button"><i class="pi pi-fw pi-circle"></i> Button</a></li>
                    <li><a routerLink="/uikit/table"><i class="pi pi-fw pi-table"></i> Table</a></li>
                    <li><a routerLink="/uikit/list"><i class="pi pi-fw pi-list"></i> List</a></li>
                    <li><a routerLink="/uikit/tree"><i class="pi pi-fw pi-sitemap"></i> Tree</a></li>
                    <li><a routerLink="/uikit/panel"><i class="pi pi-fw pi-window-maximize"></i> Panel</a></li>
                    <li><a routerLink="/uikit/overlay"><i class="pi pi-fw pi-eye"></i> Overlay</a></li>
                    <li><a routerLink="/uikit/media"><i class="pi pi-fw pi-image"></i> Media</a></li>
                    <li><a routerLink="/uikit/menu"><i class="pi pi-fw pi-bars"></i> Menu</a></li>
                    <li><a routerLink="/uikit/message"><i class="pi pi-fw pi-comment"></i> Message</a></li>
                    <li><a routerLink="/uikit/file"><i class="pi pi-fw pi-file"></i> File</a></li>
                    <li><a routerLink="/uikit/charts"><i class="pi pi-fw pi-chart-bar"></i> Chart</a></li>
                    <li><a routerLink="/uikit/timeline"><i class="pi pi-fw pi-clock"></i> Timeline</a></li>
                    <li><a routerLink="/uikit/misc"><i class="pi pi-fw pi-ellipsis-h"></i> Misc</a></li>
                </ul>
            </div>

            <!-- Pages Section -->
            <div class="ui-section">
                <h4 class="ui-section-title">Pages</h4>
                <ul class="ui-menu-list">
                    <li><a routerLink="/landing"><i class="pi pi-fw pi-home"></i> Landing</a></li>
                    <li class="ui-submenu">
                        <span class="ui-submenu-title"><i class="pi pi-fw pi-lock"></i> Auth</span>
                        <ul class="ui-submenu-list">
                            <li><a routerLink="/auth/login"><i class="pi pi-fw pi-sign-in"></i> Login</a></li>
                            <li><a routerLink="/auth/error"><i class="pi pi-fw pi-exclamation-triangle"></i> Error</a></li>
                            <li><a routerLink="/auth/access"><i class="pi pi-fw pi-ban"></i> Access Denied</a></li>
                        </ul>
                    </li>
                    <li class="ui-submenu">
                        <span class="ui-submenu-title"><i class="pi pi-fw pi-cog"></i> Settings</span>
                        <ul class="ui-submenu-list">
                            <li><a routerLink="/financial-managment/settings"><i class="pi pi-fw pi-sliders-h"></i> Settings</a></li>
                        </ul>
                    </li>
                    <li class="ui-submenu">
                        <span class="ui-submenu-title"><i class="pi pi-fw pi-database"></i> Data</span>
                        <ul class="ui-submenu-list">
                            <li><a routerLink="/crud"><i class="pi pi-fw pi-table"></i> Crud</a></li>
                        </ul>
                    </li>
                    <li class="ui-submenu">
                        <span class="ui-submenu-title"><i class="pi pi-fw pi-info-circle"></i> Info</span>
                        <ul class="ui-submenu-list">
                            <li><a routerLink="/notfound"><i class="pi pi-fw pi-question-circle"></i> Not Found</a></li>
                            <li><a routerLink="/empty"><i class="pi pi-fw pi-file-o"></i> Empty</a></li>
                        </ul>
                    </li>
                </ul>
            </div>

            <!-- Get Started Section -->
            <div class="ui-section">
                <h4 class="ui-section-title">Get Started</h4>
                <ul class="ui-menu-list">
                    <li class="ui-submenu">
                        <span class="ui-submenu-title"><i class="pi pi-fw pi-book"></i> Documentation</span>
                        <ul class="ui-submenu-list">
                            <li><a routerLink="/documentation"><i class="pi pi-fw pi-info-circle"></i> Documentation</a></li>
                            <li><a href="https://github.com/primefaces/homebase-ng" target="_blank"><i class="pi pi-fw pi-github"></i> View Source</a></li>
                        </ul>
                    </li>
                </ul>
            </div>
        </div>
    </p-drawer>
    `,
    styles: [`
        .ui-drawer-content {
            padding: 1rem 0;
        }

        .ui-section {
            margin-bottom: 2rem;
        }

        .ui-section:last-child {
            margin-bottom: 0;
        }

        .ui-section-title {
            margin: 0 0 1rem 0;
            padding: 0 1rem;
            color: var(--text-color);
            font-weight: 600;
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .ui-menu-list {
            list-style: none;
            margin: 0;
            padding: 0;
        }

        .ui-menu-list li {
            margin: 0;
        }

        .ui-menu-list a {
            display: block;
            padding: 0.75rem 1rem;
            color: var(--text-color);
            text-decoration: none;
            border-radius: 0.375rem;
            margin: 0.125rem 0.5rem;
            transition: background-color 0.2s;
        }

        .ui-menu-list a:hover {
            background-color: var(--surface-hover);
        }

        .ui-submenu {
            margin: 0.5rem 0;
        }

        .ui-submenu-title {
            display: block;
            padding: 0.5rem 1rem;
            color: var(--text-color-secondary);
            font-weight: 600;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .ui-submenu-list {
            list-style: none;
            margin: 0;
            padding: 0;
            padding-left: 1rem;
        }

        .ui-submenu-list a {
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
        }
    `]
})
export class AppTopbar {
    items!: MenuItem[];
    userMenuItems!: MenuItem[];
    uiDrawerVisible = false;

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
                        label: 'UI Design',
                        icon: 'pi pi-palette',
                        command: () => {
                            this.showUIDrawer();
                        }
                    },
                    {
                        label: 'Settings',
                        icon: 'pi pi-cog',
                        command: () => {
                            this.router.navigate(['/financial-managment/settings']);
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

    showUIDrawer() {
        this.uiDrawerVisible = true;
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
