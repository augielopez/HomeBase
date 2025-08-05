import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Observable, from, BehaviorSubject } from 'rxjs';
import { User } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private supabaseService: SupabaseService) {
    this.initializeAuth();
  }

  private async initializeAuth() {
    // Check for existing session
    const { data: { session } } = await this.supabaseService.getClient().auth.getSession();
    if (session?.user) {
      this.currentUserSubject.next(session.user);
    }

    // Listen for auth changes
    this.supabaseService.getClient().auth.onAuthStateChange((event, session) => {
      this.currentUserSubject.next(session?.user || null);
    });
  }

  async signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
      console.log('AuthService: Attempting sign in with Supabase...');
      const { data, error } = await this.supabaseService.getClient().auth.signInWithPassword({
        email,
        password
      });

      console.log('AuthService: Supabase response:', { data, error });

      if (error) {
        console.error('AuthService: Authentication error:', error);
        return { user: null, error: error.message };
      }

      console.log('AuthService: Authentication successful');
      return { user: data.user, error: null };
    } catch (error: any) {
      console.error('AuthService: Unexpected error:', error);
      return { user: null, error: error.message || 'Authentication failed' };
    }
  }

  async signUp(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
      const { data, error } = await this.supabaseService.getClient().auth.signUp({
        email,
        password
      });

      if (error) {
        return { user: null, error: error.message };
      }

      return { user: data.user, error: null };
    } catch (error: any) {
      return { user: null, error: error.message || 'Registration failed' };
    }
  }

  async signOut(): Promise<void> {
    await this.supabaseService.getClient().auth.signOut();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }
} 