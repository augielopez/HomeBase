import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `
        <ul class="layout-menu">
            <ng-container *ngFor="let item of model; let i = index">
                <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
                <li *ngIf="item.separator" class="menu-separator"></li>
            </ng-container>
        </ul>
    `,
    styles: []
})
export class AppMenu {
    model: MenuItem[] = [];

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
                expanded: false,
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
            },
            {
                label: 'Career & Resume',
                icon: 'pi pi-fw pi-file',
                expanded: false,
                items: [
                    {
                        label: 'Contact Information',
                        icon: 'pi pi-fw pi-user',
                        routerLink: ['/dashboard/pages/resume/contact']
                    },
                    {
                        label: 'Skills',
                        icon: 'pi pi-fw pi-star',
                        routerLink: ['/dashboard/pages/resume/skills']
                    },
                    {
                        label: 'Work Experience',
                        icon: 'pi pi-fw pi-briefcase',
                        routerLink: ['/dashboard/pages/resume/experience']
                    },
                    {
                        label: 'Education',
                        icon: 'pi pi-fw pi-graduation-cap',
                        routerLink: ['/dashboard/pages/resume/education']
                    },
                    {
                        label: 'Certifications',
                        icon: 'pi pi-fw pi-id-card',
                        routerLink: ['/dashboard/pages/resume/certifications']
                    },
                    {
                        label: 'Projects',
                        icon: 'pi pi-fw pi-folder',
                        routerLink: ['/dashboard/pages/resume/projects']
                    },
                    {
                        label: 'Volunteer Work',
                        icon: 'pi pi-fw pi-heart',
                        routerLink: ['/dashboard/pages/resume/volunteer']
                    },
                    {
                        label: 'Job Tailoring Assistant',
                        icon: 'pi pi-fw pi-cog',
                        routerLink: ['/dashboard/pages/resume/tailoring']
                    }
                ]
            }
        ];
    }

}

