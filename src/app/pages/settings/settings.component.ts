import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MasterDataService } from '../service/master-data.service';
import { SupabaseService } from '../service/supabase.service';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SidebarModule } from 'primeng/sidebar';
import { DropdownModule } from 'primeng/dropdown';
import { TypeCrudTableComponent } from './type-crud-table.component';

export interface SettingsType {
  id: string;
  name: string;
  displayName: string;
  tableName: string;
  description?: string;
}

@Component({
    selector: 'app-settings',
    standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    SidebarModule,
    DropdownModule,
    TypeCrudTableComponent
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  // Settings type categories
  settingsTypes: SettingsType[] = [
    { id: 'bill-categories', name: 'Bill Categories', displayName: 'Bill Categories', tableName: 'hb_bill_categories' },
    { id: 'bill-types', name: 'Bill Types', displayName: 'Bill Types', tableName: 'hb_bill_types' },
    { id: 'frequency-types', name: 'Frequency Types', displayName: 'Frequency Types', tableName: 'hb_frequency_types' },
    { id: 'payment-types', name: 'Payment Types', displayName: 'Payment Types', tableName: 'hb_payment_types' },
    { id: 'priority-types', name: 'Priority Types', displayName: 'Priority Types', tableName: 'hb_priority_types' },
    { id: 'warranty-types', name: 'Warranty Types', displayName: 'Warranty Types', tableName: 'hb_warranty_types' },
    { id: 'tags', name: 'Tags', displayName: 'Tags', tableName: 'hb_tags' },
    { id: 'login-types', name: 'Login Types', displayName: 'Login Types', tableName: 'hb_login_types' },
    { id: 'credit-card-types', name: 'Credit Card Types', displayName: 'Credit Card Types', tableName: 'hb_credit_card_types' },
    { id: 'bill-status-types', name: 'Bill Status Types', displayName: 'Bill Status Types', tableName: 'hb_bill_status_types' },
    { id: 'card-types', name: 'Card Types', displayName: 'Card Types', tableName: 'hb_card_types' },
    { id: 'owner-types', name: 'Owner Types', displayName: 'Owner Types', tableName: 'hb_owner_types' }
  ];

  selectedType: SettingsType | null = null;
  isMobile = false;
  sidebarVisible = false;

    constructor(
    private masterDataService: MasterDataService,
        private supabaseService: SupabaseService,
        private messageService: MessageService
    ) {}

  ngOnInit() {
    this.checkScreenSize();
    this.selectedType = this.settingsTypes[0]; // Default to first item
    
    // Load all master data
    this.masterDataService.loadAllMasterData().subscribe();
    
    // Listen for window resize
    window.addEventListener('resize', () => {
      this.checkScreenSize();
    });
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
  }

  onTypeSelect(type: SettingsType) {
    this.selectedType = type;
    
    // Close sidebar on mobile after selection
    if (this.isMobile) {
      this.sidebarVisible = false;
    }
  }

  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
  }

  getTypeIcon(typeId: string): string {
    const iconMap: { [key: string]: string } = {
      'bill-categories': 'pi pi-folder',
      'bill-types': 'pi pi-file',
      'frequency-types': 'pi pi-clock',
      'payment-types': 'pi pi-credit-card',
      'priority-types': 'pi pi-flag',
      'warranty-types': 'pi pi-shield',
      'tags': 'pi pi-tag',
      'login-types': 'pi pi-key',
      'credit-card-types': 'pi pi-id-card',
      'bill-status-types': 'pi pi-check-circle',
      'card-types': 'pi pi-credit-card',
      'owner-types': 'pi pi-user'
    };
    return iconMap[typeId] || 'pi pi-cog';
  }

  getTypeDescription(typeId: string): string {
    const descriptionMap: { [key: string]: string } = {
      'bill-categories': 'Manage bill categories for organizing bills',
      'bill-types': 'Manage different types of bills',
      'frequency-types': 'Manage billing frequencies (monthly, yearly, etc.)',
      'payment-types': 'Manage payment methods',
      'priority-types': 'Manage bill priority levels',
      'warranty-types': 'Manage warranty types for products',
      'tags': 'Manage tags for categorization',
      'login-types': 'Manage login method types',
      'credit-card-types': 'Manage credit card types',
      'bill-status-types': 'Manage bill status types (Active, Paid, etc.)',
      'card-types': 'Manage card types for credit cards',
      'owner-types': 'Manage owner types (Personal, Business, etc.)'
    };
    return descriptionMap[typeId] || 'Manage settings for this category';
    }
} 