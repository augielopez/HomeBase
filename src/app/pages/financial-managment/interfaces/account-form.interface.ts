export interface AccountFormData {
    account: AccountGroup;
    bill: BillGroup;
    creditCard: CreditCardGroup;
    warranty: WarrantyGroup;
}

export interface AccountGroup {
    accountName: string;
    ownerTypeId: string;  // UUID
    username: string;
    password: string;
    url: string;
    description: string;
}

export interface BillGroup {
    hasBill: boolean;
    billTypeId: string;  // UUID
    billAmount: number;
    dueDate: string;
    isActive: boolean;
    priorityId: string;  // UUID
    frequencyId: string;  // UUID
    lastPaid: string;
    isFixedBill: boolean;
    paymentTypeId: string;  // UUID
    tagId: string | null;  // UUID
    isIncludedInMonthlyPayment: boolean;
}

export interface CreditCardGroup {
    hasCreditCard: boolean;
    cardTypeId: string; // UUID
    cardNumber: string;
    cardHolderName: string;
    expiryDate: string;
    creditLimit: number | null;
    apr: number | null;
    purchaseRate: number | null;
    cashAdvanceRate: number | null;
    balanceTransferRate: number | null;
    annualFee: number | null;
}

export interface WarrantyGroup {
    hasWarranty: boolean;
    warrantyTypeId: string;
    provider: string;
    coverageStart: string;
    coverageEnd: string;
    terms: string;
    claimProcedure: string;

}
