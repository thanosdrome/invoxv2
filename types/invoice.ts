// types/index.ts
export interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  hsnSac: string;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  dueDate: string;
  
  // Company Info
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyGSTIN: string;
  
  // Client Info
  clientName: string;
  clientAddress: string;
  clientGSTIN: string;
  
  // Line Items
  lineItems: LineItem[];
  
  // Totals
  subTotal: number;
  taxAmount: number;
  taxPercentage: number;
  grandTotal: number;
  
  // Additional fields
  amountInWords: string;
  paymentInfo: {
    accountName: string;
    bankName: string;
    accountNumber: string;
    branchAndIFSC: string;
  };
  termsAndConditions: string[];
}

export interface CompanySettings {
  companyName: string;
  address: string;
  phone: string;
  gstin: string;
  logo?: string;
  paymentInfo: {
    accountName: string;
    bankName: string;
    accountNumber: string;
    branchAndIFSC: string;
  };
  defaultTerms: string[];
}