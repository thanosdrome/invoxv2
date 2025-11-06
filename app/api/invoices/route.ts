// app/api/invoices/route.ts - UPDATED
// Create Invoice with GST Features
// ====================================
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import Invoice from '@/models/Invoice';
import { createLog, LogActions } from '@/utils/logger';
import { validateToken, createAuthErrorResponse } from '@/lib/auth';

const lineItemSchema = z.object({
  description: z.string(),
  hsnCode: z.string(),
  quantity: z.number().positive(),
  rate: z.number().positive(),
  total: z.number(),
});

const createInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1),
  orderReferenceNumber: z.string().optional(),
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientAddress: z.string().min(5),
  clientGSTNumber: z.string().length(15).optional().or(z.literal('')),
  lineItems: z.array(lineItemSchema).min(1),
  taxType: z.enum(['IGST', 'CGST_SGST']),
  discount: z.number().optional(),
});



// POST - Create invoice
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const user = await validateToken(req);
    const body = await req.json();
    const data = createInvoiceSchema.parse(body);
    
    // Check if invoice number already exists
    const existing = await Invoice.findOne({ invoiceNumber: data.invoiceNumber });
    if (existing) {
      return NextResponse.json(
        { error: 'Invoice number already exists. Please use a unique invoice number.' },
        { status: 400 }
      );
    }
    
    // Calculate totals
    const subtotal = data.lineItems.reduce((sum, item) => sum + item.total, 0);
    
    // Calculate tax based on type
    let igst = 0, cgst = 0, sgst = 0, totalTax = 0;
    
    if (data.taxType === 'IGST') {
      igst = subtotal * 0.18; // 18% IGST
      totalTax = igst;
    } else {
      cgst = subtotal * 0.09; // 9% CGST
      sgst = subtotal * 0.09; // 9% SGST
      totalTax = cgst + sgst;
    }
    
    const discount = data.discount || 0;
    const grandTotal = subtotal + totalTax - discount;
    
    const invoice = await Invoice.create({
      invoiceNumber: data.invoiceNumber,
      orderReferenceNumber: data.orderReferenceNumber,
      createdBy: user.userId,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientAddress: data.clientAddress,
      clientGSTNumber: data.clientGSTNumber,
      lineItems: data.lineItems,
      subtotal,
      taxType: data.taxType,
      igst,
      cgst,
      sgst,
      totalTax,
      discount,
      grandTotal,
      status: 'draft',
    });
    
    await createLog({
      userId: user.userId,
      action: LogActions.INVOICE_CREATED,
      entity: 'invoice',
      entityId: invoice._id.toString(),
      description: `Invoice created: ${data.invoiceNumber}`,
      ipAddress: req.headers.get('x-forwarded-for') || "unknown",
    });
    
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error: any) {
    console.error('Create invoice error:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    // Handle authentication/authorization errors
    if (error.message.includes('token')) {
      return createAuthErrorResponse(error.message);
    }
    
    // Handle other errors
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// GET - List invoices
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const user = await validateToken(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    
    const query: any = {};
    if (user.role !== 'admin') {
      query.createdBy = user.userId;
    }
    if (status) {
      query.status = status;
    }
    
    try {
      const invoices = await Invoice.find(query)
        .populate('createdBy', 'name email')
        .populate('signedBy', 'name email')
        .sort({ createdAt: -1 })
        .lean();
      
      if (!invoices || invoices.length === 0) {
        // Return empty array instead of null/undefined
        return NextResponse.json({ invoices: [] });
      }
      
      return NextResponse.json({ invoices });
    } catch (dbError) {
      console.error('Database query error:', dbError);
      throw new Error('Failed to fetch invoices');
    }
  } catch (error: any) {
    console.error('Get invoices error:', error);
    
    // Handle authentication/authorization errors
    if (error.message.includes('token')) {
      return createAuthErrorResponse(error.message);
    }
    
    // Handle other errors
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

