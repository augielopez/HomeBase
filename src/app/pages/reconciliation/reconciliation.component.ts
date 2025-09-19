import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'primeng/tabs';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { BadgeModule } from 'primeng/badge';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';

@Component({
    selector: 'app-reconciliation',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        CardModule,
        InputTextModule,
        DropdownModule,
        CheckboxModule,
        TagModule,
        TabsModule,
        OverlayBadgeModule,
        BadgeModule,
        InputGroupModule,
        InputGroupAddonModule
    ],
    templateUrl: './reconciliation.component.html',
    styleUrls: ['./reconciliation.component.scss']
})
export class ReconciliationComponent {
    selectedMonth: string = '';
    monthOptions: any[] = [];
    activeTabValue: string = '0';
    selectedAccount: string = '';
    accountOptions: any[] = [];
    unreconciledCount: number = 3;
    billsCount: number = 3;

    constructor() {
        this.initializeMonthOptions();
        this.initializeAccountOptions();
    }

    private initializeMonthOptions() {
        const currentDate = new Date();
        const options = [];

        // Generate options for current month + 11 previous months
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            
            options.push({ label, value });
        }
        
        this.monthOptions = options;
        this.selectedMonth = options[0]?.value || '';
    }

    private initializeAccountOptions() {
        // Sample account options - in a real app, this would come from a service
        this.accountOptions = [
            { id: '1', name: 'Bank Checking Account' },
            { id: '2', name: 'US Bank Checking' },
            { id: '3', name: 'Fidelity Checking' },
            { id: '4', name: 'First Tech Checking' },
            { id: '5', name: 'Marcus Savings' }
        ];
        
        // Set default selection
        this.selectedAccount = this.accountOptions[0]?.id || '';
    }
}