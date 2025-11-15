import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';

// Services
import { SupabaseService } from '../../../service/supabase.service';

export interface CreditCard {
  id: string;
  brand: string;
  last_four: string;
  cardholder_name?: string;
  balance: number;
  credit_limit: number;
  expiration_month?: number;
  expiration_year?: number;
  account_id?: string;
}

export interface CardTransaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  category?: {
    name: string;
  };
  description?: string;
}

@Component({
  selector: 'app-credit-card-carousel',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    DialogModule,
    TableModule,
    TagModule,
    SkeletonModule
  ],
  providers: [MessageService],
  templateUrl: './credit-card-carousel.component.html',
  styleUrls: ['./credit-card-carousel.component.scss']
})
export class CreditCardCarouselComponent implements OnInit, OnDestroy {
  @Output() loadingChange = new EventEmitter<boolean>();

  private destroy$ = new Subject<void>();
  
  creditCards: CreditCard[] = [];
  loading = true;
  selectedCard: CreditCard | null = null;
  showCardDetails = false;
  cardTransactions: CardTransaction[] = [];
  transactionsLoading = false;

  // Carousel state
  currentIndex = 0;
  autoSlideInterval: any;

  constructor(
    private supabaseService: SupabaseService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadCreditCards();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
  }

  async loadCreditCards() {
    try {
      this.loading = true;
      this.loadingChange.emit(true);

      const userId = await this.supabaseService.getCurrentUserId();
      
      const { data, error } = await this.supabaseService.getClient()
        .from('hb_credit_cards')
        .select(`
          id,
          brand,
          last_four,
          cardholder_name,
          balance,
          credit_limit,
          expiration_month,
          expiration_year,
          account_id
        `)
        .eq('user_id', userId)
        .order('brand, last_four');

      if (error) throw error;

      this.creditCards = data || [];
      
      // Start auto-slide if there are multiple cards
      if (this.creditCards.length > 1) {
        this.startAutoSlide();
      }

    } catch (error) {
      console.error('Error loading credit cards:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load credit cards'
      });
    } finally {
      this.loading = false;
      this.loadingChange.emit(false);
    }
  }

  private startAutoSlide() {
    this.autoSlideInterval = setInterval(() => {
      this.nextCard();
    }, 5000); // Auto-advance every 5 seconds
  }

  nextCard() {
    if (this.creditCards.length > 1) {
      this.currentIndex = (this.currentIndex + 1) % this.creditCards.length;
    }
  }

  previousCard() {
    if (this.creditCards.length > 1) {
      this.currentIndex = this.currentIndex === 0 
        ? this.creditCards.length - 1 
        : this.currentIndex - 1;
    }
  }

  selectCard(index: number) {
    this.currentIndex = index;
  }

  async openCardDetails(card: CreditCard) {
    this.selectedCard = card;
    this.showCardDetails = true;
    await this.loadCardTransactions(card.id);
  }

  async loadCardTransactions(cardId: string) {
    try {
      this.transactionsLoading = true;

      const userId = await this.supabaseService.getCurrentUserId();
      
      const { data, error } = await this.supabaseService.getClient()
        .from('hb_transactions')
        .select(`
          id,
          name,
          amount,
          date,
          description,
          category:category_id (
            name
          )
        `)
        .eq('user_id', userId)
        .eq('credit_card_id', cardId)
        .order('date', { ascending: false })
        .limit(10);

      if (error) throw error;

      this.cardTransactions = (data || []).map((tx: any) => ({
        ...tx,
        category: tx.category || { name: 'Uncategorized' }
      }));

    } catch (error) {
      console.error('Error loading card transactions:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load card transactions'
      });
    } finally {
      this.transactionsLoading = false;
    }
  }

  closeCardDetails() {
    this.showCardDetails = false;
    this.selectedCard = null;
    this.cardTransactions = [];
  }

  getCardBrandLogo(brand: string): string {
    const brandLower = brand.toLowerCase();
    switch (brandLower) {
      case 'visa':
        return 'pi pi-credit-card text-blue-600';
      case 'mastercard':
        return 'pi pi-credit-card text-red-600';
      case 'amex':
      case 'american express':
        return 'pi pi-credit-card text-green-600';
      case 'discover':
        return 'pi pi-credit-card text-orange-600';
      default:
        return 'pi pi-credit-card text-gray-600';
    }
  }

  getCardGradient(brand: string): string {
    const brandLower = brand.toLowerCase();
    switch (brandLower) {
      case 'visa':
        return 'bg-gradient-to-br from-blue-600 to-blue-800';
      case 'mastercard':
        return 'bg-gradient-to-br from-red-500 to-red-700';
      case 'amex':
      case 'american express':
        return 'bg-gradient-to-br from-green-500 to-green-700';
      case 'discover':
        return 'bg-gradient-to-br from-orange-500 to-orange-700';
      default:
        return 'bg-gradient-to-br from-gray-600 to-gray-800';
    }
  }

  getUtilizationPercentage(card: CreditCard): number {
    if (!card.credit_limit || card.credit_limit === 0) return 0;
    return Math.round((card.balance / card.credit_limit) * 100);
  }

  getUtilizationColor(percentage: number): string {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 75) return 'text-orange-500';
    if (percentage >= 50) return 'text-yellow-500';
    return 'text-green-500';
  }

  formatExpiration(card: CreditCard): string {
    if (!card.expiration_month || !card.expiration_year) return '';
    const month = card.expiration_month.toString().padStart(2, '0');
    const year = card.expiration_year.toString().slice(-2);
    return `${month}/${year}`;
  }

  formatCardNumber(card: CreditCard): string {
    return `**** **** **** ${card.last_four}`;
  }

  getAvailableCredit(card: CreditCard): number {
    return Math.max(0, card.credit_limit - card.balance);
  }

  addNewCard() {
    // TODO: Implement add new card functionality
    // This could open a dialog or navigate to a card creation form
    this.messageService.add({
      severity: 'info',
      summary: 'Coming Soon',
      detail: 'Add new card functionality will be implemented'
    });
  }
}
