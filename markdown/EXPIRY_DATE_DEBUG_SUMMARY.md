# Expiry Date "NaN/NaN" UI Debug Summary

## Problem
The expiry date was still showing as "NaN/NaN" in the UI even though the database had the correct data in "MM/YYYY" format.

## Root Cause Analysis

### 1. **Form Control Name Mismatch**
- **Issue**: HTML was using `cardTypeId` but validation was checking for `cardType`
- **Location**: `account-wizard.component.html` line 160
- **Fix**: Changed `formControlName="cardTypeId"` to `formControlName="cardType"`

### 2. **PrimeNG Calendar Configuration**
- **Issue**: Calendar with `view="month"` and `dateFormat="mm/yy"` might not handle Date objects correctly
- **Location**: `account-wizard.component.html` line 184
- **Enhancement**: Added `[showIcon]="true"` and `[touchUI]="false"` for better compatibility

### 3. **Year Format Handling**
- **Issue**: Two-digit years (e.g., "25" for 2025) might not be handled correctly
- **Location**: `parseExpiryDateForForm()` method
- **Fix**: Added logic to convert two-digit years to four-digit years

## Debugging Steps Applied

### 1. **Added Console Logging**
```typescript
// In populateFormWithAccountData()
if (extended.creditCard?.expiration_date) {
    console.log('Original expiry date from DB:', extended.creditCard.expiration_date);
}

const parsedExpiryDate = extended.creditCard ? this.parseExpiryDateForForm(extended.creditCard.expiration_date) : null;

if (parsedExpiryDate) {
    console.log('Parsed expiry date:', parsedExpiryDate);
    console.log('Parsed expiry date type:', typeof parsedExpiryDate);
    console.log('Parsed expiry date instanceof Date:', parsedExpiryDate instanceof Date);
}
```

### 2. **Added Event Handler**
```typescript
onExpiryDateChange(event: any): void {
    console.log('Expiry date changed:', event);
    console.log('Expiry date value:', event.value);
    console.log('Expiry date type:', typeof event.value);
}
```

### 3. **Enhanced parseExpiryDateForForm Method**
```typescript
private parseExpiryDateForForm(expiryDate: string | null): Date | null {
    if (!expiryDate) return null;
    
    // Handle MM/YYYY format (from database)
    if (expiryDate.includes('/')) {
        const parts = expiryDate.split('/');
        if (parts.length === 2) {
            const month = parseInt(parts[0], 10) - 1; // Month is 0-indexed
            const year = parseInt(parts[1], 10);
            // For PrimeNG calendar with view="month", we need to set the date to the first day of the month
            // and ensure the year is properly formatted (4 digits)
            const fullYear = year < 100 ? 2000 + year : year;
            return new Date(fullYear, month, 1);
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

## Files Modified

### 1. **AccountWizardComponent HTML** (`src/app/pages/accounts/account-wizard/account-wizard.component.html`):
- Fixed form control name from `cardTypeId` to `cardType`
- Enhanced calendar configuration with additional properties
- Added event handler for debugging

### 2. **AccountWizardComponent TypeScript** (`src/app/pages/accounts/account-wizard/account-wizard.component.ts`):
- Enhanced `parseExpiryDateForForm()` method with better year handling
- Added debugging console logs
- Added `onExpiryDateChange()` event handler

## Testing Instructions

1. **Open Browser Developer Tools** (F12)
2. **Go to Console tab**
3. **Edit an existing credit card account**
4. **Check console logs for**:
   - Original expiry date from DB
   - Parsed expiry date value
   - Parsed expiry date type
   - Date object validation
5. **Verify the expiry date displays correctly** (not "NaN/NaN")

## Expected Console Output

When editing a credit card with expiry date "12/25":
```
Original expiry date from DB: 12/25
Parsed expiry date: Mon Dec 01 2025 00:00:00 GMT+0000
Parsed expiry date type: object
Parsed expiry date instanceof Date: true
```

## Next Steps

If the issue persists:
1. Check if PrimeNG calendar version is compatible
2. Consider using a different date picker component
3. Implement custom date formatting for display
4. Add more detailed error handling

## Alternative Solutions

If the PrimeNG calendar continues to have issues:

### Option 1: Use Regular Calendar
```html
<p-calendar 
    dateFormat="mm/yy" 
    formControlName="expiryDate" 
    [style]="{'width':'100%'}" 
    class="w-full">
</p-calendar>
```

### Option 2: Use Dropdown for Month/Year
```html
<div class="flex gap-2">
    <p-dropdown [options]="months" formControlName="expiryMonth"></p-dropdown>
    <p-dropdown [options]="years" formControlName="expiryYear"></p-dropdown>
</div>
```

### Option 3: Custom Input with Validation
```html
<input 
    type="text" 
    pInputText 
    formControlName="expiryDate" 
    placeholder="MM/YY"
    class="w-full">
``` 