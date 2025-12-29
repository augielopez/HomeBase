import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';

export interface ParsedReceiptItem {
    name: string;
    category?: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

export interface ParsedReceipt {
    store: {
        name: string;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        zipCode?: string | null;
    };
    receiptDate: string; // YYYY-MM-DD format
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod?: string | null;
    cardLastFour?: string | null;
    notes?: string | null;
    items: ParsedReceiptItem[];
}

@Injectable({
    providedIn: 'root'
})
export class ReceiptParserService {
    private readonly OPENAI_API_KEY = environment.openaiApiKey;
    private readonly OPENAI_API_URL = `${environment.openaiApiUrl}/chat/completions`;

    /**
     * Parse receipt text using ChatGPT
     */
    async parseReceipt(receiptText: string): Promise<ParsedReceipt> {
        if (!this.OPENAI_API_KEY || this.OPENAI_API_KEY.trim() === '') {
            throw new Error('OpenAI API key is not configured');
        }

        const prompt = this.buildParsingPrompt(receiptText);
        const response = await this.callOpenAI(prompt);
        
        if (!response) {
            throw new Error('Failed to get response from OpenAI');
        }

        return this.parseResponse(response);
    }

    /**
     * Build the prompt for ChatGPT
     */
    private buildParsingPrompt(receiptText: string): string {
        return `You are a receipt parsing assistant. Extract structured data from the following receipt text. The receipt text may be from OCR, a website, or manually typed.

Receipt Text:
${receiptText}

Extract the following information and return ONLY valid JSON (no markdown, no code blocks, no explanations):
{
  "store": {
    "name": "Store name",
    "address": "Street address or null",
    "city": "City name or null",
    "state": "State abbreviation (2 letters) or null",
    "zipCode": "ZIP code or null"
  },
  "receiptDate": "YYYY-MM-DD format (use today's date if not found)",
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00,
  "paymentMethod": "Payment method (e.g., 'Credit Card', 'Debit Card', 'Cash', 'EBT') or null",
  "cardLastFour": "Last 4 digits of card (only if card was used) or null",
  "notes": "Any additional notes or null",
  "items": [
    {
      "name": "Item name",
      "category": "Category (e.g., 'Groceries', 'Home Goods') or null",
      "quantity": 1.0,
      "unitPrice": 0.00,
      "totalPrice": 0.00
    }
  ]
}

Important rules:
- Extract ALL items from the receipt
- If quantity is not specified, assume 1.0
- If unit price is not specified but total price is, set unitPrice = totalPrice
- Dates should be in YYYY-MM-DD format
- If date is not found, use today's date: ${new Date().toISOString().split('T')[0]}
- Payment method should be a simple string like "Credit Card", "Debit Card", "Cash", "EBT", etc.
- cardLastFour should only be included if a card was used (extract from receipt text)
- Return ONLY the JSON object, nothing else`;
    }

    /**
     * Call OpenAI API
     */
    private async callOpenAI(prompt: string): Promise<string> {
        try {
            const response = await fetch(this.OPENAI_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a receipt parsing assistant. Extract structured data from receipt text and return ONLY valid JSON, no markdown, no explanations.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 2000,
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                if (response.status === 401) {
                    throw new Error('OpenAI API key is invalid or expired');
                } else if (response.status === 429) {
                    throw new Error('OpenAI API rate limit exceeded. Please wait a moment and try again.');
                } else {
                    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
                }
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content?.trim();
            
            if (!content) {
                throw new Error('Empty response from OpenAI');
            }

            return content;

        } catch (error: any) {
            console.error('Error calling OpenAI:', error);
            
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                throw new Error('Network error: Unable to connect to OpenAI API');
            }
            
            throw error;
        }
    }

    /**
     * Parse the JSON response from OpenAI
     */
    private parseResponse(response: string): ParsedReceipt {
        try {
            // Remove markdown code blocks if present
            let jsonString = response.trim();
            if (jsonString.startsWith('```json')) {
                jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (jsonString.startsWith('```')) {
                jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            const parsed = JSON.parse(jsonString);

            // Validate required fields
            if (!parsed.store || !parsed.store.name) {
                throw new Error('Missing store name in parsed data');
            }

            if (!parsed.receiptDate) {
                parsed.receiptDate = new Date().toISOString().split('T')[0];
            }

            if (typeof parsed.subtotal !== 'number') {
                throw new Error('Invalid subtotal in parsed data');
            }

            if (typeof parsed.tax !== 'number') {
                parsed.tax = 0;
            }

            if (typeof parsed.total !== 'number') {
                throw new Error('Invalid total in parsed data');
            }

            if (!Array.isArray(parsed.items)) {
                parsed.items = [];
            }

            // Validate items
            parsed.items = parsed.items.map((item: any) => ({
                name: item.name || 'Unknown Item',
                category: item.category || null,
                quantity: typeof item.quantity === 'number' ? item.quantity : 1.0,
                unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : (item.totalPrice || 0),
                totalPrice: typeof item.totalPrice === 'number' ? item.totalPrice : (item.unitPrice || 0)
            }));

            return parsed as ParsedReceipt;

        } catch (error: any) {
            console.error('Error parsing OpenAI response:', error);
            if (error instanceof SyntaxError) {
                throw new Error('Failed to parse receipt data. The AI response was not valid JSON.');
            }
            throw error;
        }
    }
}


