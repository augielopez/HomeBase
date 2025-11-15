import { Injectable } from '@angular/core';
import { SupabaseService } from '../../service/supabase.service';

@Injectable({ providedIn: 'root' })
export class PlaidLinkService {
    constructor(private supabaseService: SupabaseService) {}

    async createLinkToken(): Promise<string> {
        try {
            console.log('Creating link token...');
            
            const { data, error } = await this.supabaseService.getClient().functions.invoke('plaid-link-token');
            
            console.log('Link token response:', { data, error });
            
            if (error) throw error;
            return data.link_token;
        } catch (error) {
            console.error('Error creating link token:', error);
            throw error;
        }
    }

    async exchangePublicToken(publicToken: string, metadata: any): Promise<any> {
        try {
            const { data, error } = await this.supabaseService.getClient().functions.invoke('plaid-exchange-token', {
                body: { public_token: publicToken, metadata }
            });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error exchanging public token:', error);
            throw error;
        }
    }

    async syncTransactions(): Promise<any> {
        try {
            const { data, error } = await this.supabaseService.getClient().functions.invoke('plaid-sync-transactions');
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error syncing transactions:', error);
            throw error;
        }
    }

    openPlaid(onSuccess: (public_token: string, metadata: any) => void, onExit?: (err: any, metadata: any) => void) {
        this.createLinkToken().then(linkToken => {
            console.log('Link token created:', linkToken);
            
            // Check if Plaid is loaded, with retry mechanism
            this.waitForPlaid().then(() => {
                const handler = (window as any).Plaid.create({
                    token: linkToken,
                    onSuccess: (public_token: string, metadata: any) => {
                        console.log('🎉 Plaid onSuccess called!', { public_token, metadata });
                        onSuccess(public_token, metadata);
                    },
                    onExit: (err: any, metadata: any) => {
                        console.log('🚪 Plaid onExit called!', { err, metadata });
                        if (onExit) {
                            onExit(err, metadata);
                        } else {
                            console.error('Plaid exited', err, metadata);
                        }
                    },
                    onEvent: (eventName: string, metadata: any) => {
                        console.log('📡 Plaid event:', eventName, metadata);
                    }
                });

                console.log('Plaid handler created, opening...');
                handler.open();
            }).catch(error => {
                console.error('Plaid script not available:', error);
                if (onExit) {
                    onExit({ error_message: 'Plaid script not loaded' }, {});
                }
            });
        }).catch(error => {
            console.error('Failed to create link token:', error);
            if (onExit) {
                onExit({ error_message: 'Failed to create link token' }, {});
            }
        });
    }

    private waitForPlaid(): Promise<void> {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            
            const checkPlaid = () => {
                attempts++;
                
                if ((window as any).Plaid) {
                    console.log('Plaid script loaded successfully');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Plaid script failed to load after 5 seconds'));
                } else {
                    setTimeout(checkPlaid, 100);
                }
            };
            
            checkPlaid();
        });
    }
}
