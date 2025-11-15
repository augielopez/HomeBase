import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';

// Component imports
import { UpcomingBillsComponent } from './upcoming-bills/upcoming-bills.component';

@Component({
  selector: 'app-financial-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    UpcomingBillsComponent
  ],
  templateUrl: './financial-dashboard.component.html',
  styleUrls: ['./financial-dashboard.component.scss']
})
export class FinancialDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Dashboard state
  loading = false;
  lastUpdated: Date | null = null;

  constructor() {}

  ngOnInit() {
    this.lastUpdated = new Date();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refreshDashboard() {
    this.loading = true;
    // Simulate refresh
    setTimeout(() => {
      this.loading = false;
      this.lastUpdated = new Date();
    }, 500);
  }
}




