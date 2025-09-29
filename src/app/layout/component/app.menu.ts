import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule, DrawerModule, ButtonModule],
    template: `
        <ul class="layout-menu">
            <ng-container *ngFor="let item of model; let i = index">
                <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
                <li *ngIf="item.separator" class="menu-separator"></li>
            </ng-container>
        </ul>
        
        <!-- Bottom UI Design Button -->
        <div class="layout-menu-bottom">
            <p-button 
                label="UI Design" 
                icon="pi pi-fw pi-palette" 
                [text]="true" 
                [outlined]="true"
                class="w-full"
                (onClick)="showUIDrawer()">
            </p-button>
        </div>

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
                        <li><a routerLink="/dashboard/uikit/formlayout">Form Layout</a></li>
                        <li><a routerLink="/dashboard/uikit/input">Input</a></li>
                        <li><a routerLink="/dashboard/uikit/button">Button</a></li>
                        <li><a routerLink="/dashboard/uikit/table">Table</a></li>
                        <li><a routerLink="/dashboard/uikit/list">List</a></li>
                        <li><a routerLink="/dashboard/uikit/tree">Tree</a></li>
                        <li><a routerLink="/dashboard/uikit/panel">Panel</a></li>
                        <li><a routerLink="/dashboard/uikit/overlay">Overlay</a></li>
                        <li><a routerLink="/dashboard/uikit/media">Media</a></li>
                        <li><a routerLink="/dashboard/uikit/menu">Menu</a></li>
                        <li><a routerLink="/dashboard/uikit/message">Message</a></li>
                        <li><a routerLink="/dashboard/uikit/file">File</a></li>
                        <li><a routerLink="/dashboard/uikit/charts">Chart</a></li>
                        <li><a routerLink="/dashboard/uikit/timeline">Timeline</a></li>
                        <li><a routerLink="/dashboard/uikit/misc">Misc</a></li>
                    </ul>
                </div>

                <!-- Pages Section -->
                <div class="ui-section">
                    <h4 class="ui-section-title">Pages</h4>
                    <ul class="ui-menu-list">
                        <li><a routerLink="/landing">Landing</a></li>
                        <li class="ui-submenu">
                            <span class="ui-submenu-title">Auth</span>
                            <ul class="ui-submenu-list">
                                <li><a routerLink="/auth/login">Login</a></li>
                                <li><a routerLink="/auth/error">Error</a></li>
                                <li><a routerLink="/auth/access">Access Denied</a></li>
                            </ul>
                        </li>
                        <li><a routerLink="/dashboard/pages/settings">Settings</a></li>
                        <li><a routerLink="/dashboard/pages/crud">Crud</a></li>
                        <li><a routerLink="/notfound">Not Found</a></li>
                        <li><a routerLink="/dashboard/pages/empty">Empty</a></li>
                    </ul>
                </div>

                <!-- Get Started Section -->
                <div class="ui-section">
                    <h4 class="ui-section-title">Get Started</h4>
                    <ul class="ui-menu-list">
                        <li><a routerLink="/dashboard/documentation">Documentation</a></li>
                        <li><a href="https://github.com/primefaces/homebase-ng" target="_blank">View Source</a></li>
                    </ul>
                </div>
            </div>
        </p-drawer>
    `,
    styles: [`
        .layout-menu-bottom {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 1rem;
            border-top: 1px solid var(--surface-border);
        }

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
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--text-color);
            border-bottom: 1px solid var(--surface-border);
            padding-bottom: 0.5rem;
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
            transition: background-color 0.2s;
        }

        .ui-menu-list a:hover {
            background-color: var(--surface-hover);
        }

        .ui-submenu {
            margin: 0;
        }

        .ui-submenu-title {
            display: block;
            padding: 0.75rem 1rem;
            font-weight: 600;
            color: var(--text-color);
            background-color: var(--surface-100);
        }

        .ui-submenu-list {
            list-style: none;
            margin: 0;
            padding: 0;
            background-color: var(--surface-50);
        }

        .ui-submenu-list a {
            padding-left: 2rem;
            font-size: 0.9rem;
        }
    `]
})
export class AppMenu {
    model: MenuItem[] = [];
    uiDrawerVisible: boolean = false;

    ngOnInit() {
        this.model = [
            {
                label: 'Home',
                items: [
                    { label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/dashboard'] }
                ]
            },
            {
                label: 'Financial Management',
                icon: 'pi pi-fw pi-money-bill',
                items: [
                    {
                        label: 'Overview & Analytics',
                        icon: 'pi pi-fw pi-chart-bar',
                        items: [
                            {
                                label: 'Financial Dashboard',
                                icon: 'pi pi-fw pi-chart-bar',
                                routerLink: ['/dashboard/pages/financial-dashboard']
                            },
                            {
                                label: 'Financial Insights',
                                icon: 'pi pi-fw pi-chart-pie',
                                routerLink: ['/dashboard/pages/financial-insights']
                            },
                            {
                                label: 'Money Flow',
                                icon: 'pi pi-fw pi-sitemap',
                                routerLink: ['/dashboard/pages/money-flow']
                            }
                        ]
                    },
                    {
                        label: 'Accounts & Transactions',
                        icon: 'pi pi-fw pi-credit-card',
                        items: [
                            {
                                label: 'Accounts',
                                icon: 'pi pi-fw pi-credit-card',
                                routerLink: ['/dashboard/pages/accounts']
                            },
                            {
                                label: 'Transactions',
                                icon: 'pi pi-fw pi-list',
                                routerLink: ['/dashboard/pages/transactions']
                            },
                            {
                                label: 'Reconciliation',
                                icon: 'pi pi-fw pi-chart-line',
                                routerLink: ['/dashboard/pages/reconciliation']
                            }
                        ]
                    },
                    {
                        label: 'Bills & Payments',
                        icon: 'pi pi-fw pi-receipt',
                        items: [
                            {
                                label: 'Bills',
                                icon: 'pi pi-fw pi-receipt',
                                routerLink: ['/dashboard/pages/bills']
                            }
                        ]
                    },
                    {
                        label: 'Budgets & Goals',
                        icon: 'pi pi-fw pi-calculator',
                        items: [
                            {
                                label: 'Budget Management',
                                icon: 'pi pi-fw pi-calculator',
                                routerLink: ['/dashboard/pages/budget-management'],
                                disabled: true
                            },
                            {
                                label: 'Financial Goals',
                                icon: 'pi pi-fw pi-flag',
                                routerLink: ['/dashboard/pages/financial-goals'],
                                disabled: true
                            }
                        ]
                    },
                    {
                        label: 'Investments & Assets',
                        icon: 'pi pi-fw pi-chart-line',
                        items: [
                            {
                                label: 'Investment Portfolio',
                                icon: 'pi pi-fw pi-chart-line',
                                routerLink: ['/dashboard/pages/investment-portfolio'],
                                disabled: true
                            },
                            {
                                label: 'Debt Management',
                                icon: 'pi pi-fw pi-credit-card',
                                routerLink: ['/dashboard/pages/debt-management'],
                                disabled: true
                            }
                        ]
                    },
                    {
                        label: 'Settings & Rules',
                        icon: 'pi pi-fw pi-cog',
                        items: [
                            {
                                label: 'Categorization Rules',
                                icon: 'pi pi-fw pi-tags',
                                routerLink: ['/dashboard/pages/categorization-rules']
                            },
                            {
                                label: 'Plaid Integrations',
                                icon: 'pi pi-fw pi-link',
                                routerLink: ['/dashboard/pages/plaid-integrations']
                            }
                        ]
                    }
                ]
            }
        ];
    }

    showUIDrawer() {
        this.uiDrawerVisible = true;
    }
}

