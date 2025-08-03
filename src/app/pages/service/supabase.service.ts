import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  // Example methods for common operations
  async getData(table: string) {
    const { data, error } = await this.supabase
      .from(table)
      .select('*');

    if (error) throw error;
    return data;
  }

  async insertData(table: string, data: any) {
    const { data: result, error } = await this.supabase
      .from(table)
      .insert(data)
      .select();

    if (error) throw error;
    return result;
  }

  async updateData(table: string, id: string, data: any) {
    const { data: result, error } = await this.supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select();

    if (error) throw error;
    return result;
  }

  async deleteData(table: string, id: string) {
    const { error } = await this.supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

    async getCurrentUserId(): Promise<string> {
        const { data: { user }, error } = await this.supabase.auth.getUser();

        if (error) {
            console.error('Error fetching current user:', error.message);
            throw error;
        }

        if (!user) {
            throw new Error('No user is currently authenticated');
        }

        return user.id;
    }

    async getCurrentUser(): Promise<User | null> {
        const { data: { user }, error } = await this.supabase.auth.getUser();

        if (error) {
            console.error('Error fetching current user:', error.message);
            throw error;
        }

        return user;
    }

}
