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
                        label: 'Admin Tools',
                        icon: 'pi pi-fw pi-shield',
                        items: [
                            {
                                label: 'Settings',
                                icon: 'pi pi-fw pi-sliders-h',
                                routerLink: ['/financial-managment/settings']
                            },
                            {
                                label: 'Duplicate Checker',
                                icon: 'pi pi-fw pi-clone',
                                routerLink: ['/financial-managment/duplicate-checker']
                            }
                        ]
                    },
                    {
                        label: 'Overview & Analytics',
                        icon: 'pi pi-fw pi-chart-bar',
                        items: [
                            {
                                label: 'Financial Dashboard',
                                icon: 'pi pi-fw pi-chart-bar',
                                routerLink: ['/financial-managment/financial-dashboard']
                            },
                            {
                                label: 'Financial Insights',
                                icon: 'pi pi-fw pi-chart-pie',
                                routerLink: ['/financial-managment/financial-insights']
                            },
                            {
                                label: 'Money Flow',
                                icon: 'pi pi-fw pi-sitemap',
                                routerLink: ['/financial-managment/money-flow']
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
                                routerLink: ['/financial-managment/accounts']
                            },
                            {
                                label: 'Transactions',
                                icon: 'pi pi-fw pi-list',
                                routerLink: ['/financial-managment/transactions']
                            },
                            {
                                label: 'Reconciliation',
                                icon: 'pi pi-fw pi-chart-line',
                                routerLink: ['/financial-managment/reconciliation']
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
                                routerLink: ['/financial-managment/bills']
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
                                routerLink: ['/financial-managment/budget-management'],
                                disabled: true
                            },
                            {
                                label: 'Financial Goals',
                                icon: 'pi pi-fw pi-flag',
                                routerLink: ['/financial-managment/financial-goals'],
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
                                routerLink: ['/financial-managment/investment-portfolio'],
                                disabled: true
                            },
                            {
                                label: 'Debt Management',
                                icon: 'pi pi-fw pi-credit-card',
                                routerLink: ['/financial-managment/debt-management'],
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
                                routerLink: ['/financial-managment/categorization-rules']
                            },
                            {
                                label: 'Plaid Integrations',
                                icon: 'pi pi-fw pi-link',
                                routerLink: ['/financial-managment/plaid-integrations']
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
                        routerLink: ['/career-resume/contact']
                    },
                    {
                        label: 'Skills',
                        icon: 'pi pi-fw pi-star',
                        routerLink: ['/career-resume/skills']
                    },
                    {
                        label: 'Work Experience',
                        icon: 'pi pi-fw pi-briefcase',
                        routerLink: ['/career-resume/experience']
                    },
                    {
                        label: 'Education',
                        icon: 'pi pi-fw pi-graduation-cap',
                        routerLink: ['/career-resume/education']
                    },
                    {
                        label: 'Certifications',
                        icon: 'pi pi-fw pi-id-card',
                        routerLink: ['/career-resume/certifications']
                    },
                    {
                        label: 'Projects',
                        icon: 'pi pi-fw pi-folder',
                        routerLink: ['/career-resume/projects']
                    },
                    {
                        label: 'Volunteer Work',
                        icon: 'pi pi-fw pi-heart',
                        routerLink: ['/career-resume/volunteer']
                    },
                    {
                        label: 'Job Tailoring Assistant',
                        icon: 'pi pi-fw pi-cog',
                        routerLink: ['/career-resume/tailoring']
                    },
                    {
                        label: 'Gap Analysis',
                        icon: 'pi pi-fw pi-chart-bar',
                        routerLink: ['/career-resume/comparison']
                    },
                    {
                        label: 'Resume Card Style',
                        icon: 'pi pi-fw pi-id-card',
                        routerLink: ['/career-resume/card-style']
                    }
                ]
            }
        ];
    }

}

