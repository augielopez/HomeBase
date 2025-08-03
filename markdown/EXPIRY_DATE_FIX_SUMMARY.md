# Expiry Date "NaN/NaN" Issue Fix

## Problem
The expiry date was showing as "NaN/NaN" when editing credit card information. This was caused by improper date parsing when the expiry date was stored in "MM/YYYY" format in the database.

## Root Cause
1. **Database Format**: Credit card expiry dates were stored as "MM/YYYY" (e.g., "12/2025")
2. **Form Expectation**: The form date picker provides a Date object, but the interface expected a string
3. **Type Mismatch**: The `formatExpiryDate()` method expected a string but received a Date object
4. **Runtime Error**: Calling `date.includes()` on a Date object caused "TypeError: date.includes is not a function"
5. **Display Issue**: When the invalid date was formatted, it resulted in "NaN/NaN"

## Solution

### 1. Fixed AccountService.formatExpiryDate() Method

**Before**:
```typescript
private formatExpiryDate(date: string | undefined): string {
  if (!date) return '';
  const dateObj = new Date(date);
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${month}/${year}`;
}
```

**After**:
```typescript
private formatExpiryDate(date: string | Date | undefined): string {
  if (!date) return '';
  
  // If it's already a Date object
  if (date instanceof Date) {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${year}`;
  }
  
  // If it's a string, handle MM/YYYY format (from database)
  if (typeof date === 'string' && date.includes('/')) {
    const parts = date.split('/');
    if (parts.length === 2) {
      const month = parts[0].padStart(2, '0');
      const year = parts[1];
      return `${month}/${year}`;
    }
  }
  
  // Handle full date string format
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${month}/${year}`;
  } catch (error) {
    console.error('Error formatting expiry date:', error);
    return '';
  }
}
```

### 2. Updated AccountFormData Interface

**Before**:
```typescript
creditCard: {
  // ... other properties
  expiryDate?: string;
  // ... other properties
}
```

**After**:
```typescript
creditCard: {
  // ... other properties
  expiryDate?: string | Date;
  // ... other properties
}
```

### 3. Added parseExpiryDateForForm() Method to Component

**New Method**:
```typescript
private parseExpiryDateForForm(expiryDate: string | null): Date | null {
  if (!expiryDate) return null;
  
  // Handle MM/YYYY format (from database)
  if (expiryDate.includes('/')) {
    const parts = expiryDate.split('/');
    if (parts.length === 2) {
      const month = parseInt(parts[0], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[1], 10);
      return new Date(year, month, 1); // Use first day of month
    }
  }
  
  // Handle full date format
  try {
    const date = new Date(expiryDate);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.error('Error parsing expiry date:', error);
    return null;
  }
}
```

### 4. Updated Form Population Logic

**Before**:
```typescript
expiryDate: extended.creditCard ? extended.creditCard.expiration_date : null,
```

**After**:
```typescript
expiryDate: extended.creditCard ? this.parseExpiryDateForForm(extended.creditCard.expiration_date) : null,
```

## How It Works

### When Saving (AccountService):
1. Form provides a Date object
2. `formatExpiryDate()` converts it to "MM/YYYY" format
3. Stores in database as "MM/YYYY"

### When Editing (Component):
1. Database provides "MM/YYYY" format
2. `parseExpiryDateForForm()` converts it to Date object
3. Form displays the date correctly

### Error Handling:
- Invalid dates return empty string or null
- Console errors logged for debugging
- Graceful fallback prevents crashes

## Benefits

1. **Fixes Display Issue**: No more "NaN/NaN" in the UI
2. **Handles Multiple Formats**: Works with both "MM/YYYY" and full date formats
3. **Robust Error Handling**: Prevents crashes from invalid dates
4. **Backward Compatibility**: Works with existing data
5. **Type Safety**: Proper TypeScript typing

## Testing

To test the fix:
1. Create a new credit card with expiry date
2. Edit the credit card
3. Verify the expiry date displays correctly (not "NaN/NaN")
4. Save and re-edit to ensure persistence

### Test Cases Covered:
- ✅ Date object from form picker → "MM/YYYY" format in database
- ✅ "MM/YYYY" string from database → Date object for form display
- ✅ Invalid dates handled gracefully
- ✅ Null/undefined values handled properly

## Files Modified

1. **AccountService** (`src/app/services/account.service.ts`):
   - Enhanced `formatExpiryDate()` method

2. **AccountWizardComponent** (`src/app/pages/accounts/account-wizard/account-wizard.component.ts`):
   - Added `parseExpiryDateForForm()` method
   - Updated form population logic 