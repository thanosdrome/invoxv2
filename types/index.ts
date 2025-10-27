export type UserRole = 'ADMINISTRATION' | 'ADMIN' | 'USER';

export type InvoiceType = 
  | 'TAX_INVOICE' 
  | 'PROFORMA' 
  | 'BUDGETARY_QUOTATION' 
  | 'PURCHASE_ORDER';

export type InvoiceStatus = 'DRAFT' | 'SIGNED' | 'CANCELLED';

export type Currency = 'INR' | 'USD' | 'EUR';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  signatureImageUrl?: string;
  createdAt: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  type: InvoiceType;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  clientGSTNumber?: string;
  orderReference?: string;
  currency: Currency;
  lineItems: LineItem[];
  subTotal: number;
  tax: number;
  discount: number;
  grandTotal: number;
  status: InvoiceStatus;
  createdBy: User;
  signedBy?: User;
  signedAt?: string;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Log {
  _id: string;
  userId?: User;
  action: 'LOGIN_SUCCESS' | 'INVOICE_CREATED' | 'INVOICE_SIGNED' | 'PDF_GENERATED';
  entity: 'USER' | 'INVOICE' | 'SIGNATURE';
  entityId?: string;
  description: string;
  ipAddress: string;
  createdAt: string;
}

export interface Settings {
  companyName: string;
  companyLogoUrl?: string;
  invoicePrefix: string;
  taxRate: number;
  defaultCurrency: Currency;
  termsText: string;
}
