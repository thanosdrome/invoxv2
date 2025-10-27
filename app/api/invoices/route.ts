// ====================================
// app/api/invoices/route.ts
// ====================================
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import Invoice from '@/models/Invoice';
import Setting from '@/models/Setting';
import { createLog, LogActions } from '@/utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  rate: z.number().positive(),
  total: z.number(),
});

const createInvoiceSchema = z.object({
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientAddress: z.string().min(5),
  lineItems: z.array(lineItemSchema).min(1),
  tax: z.number().optional(),
  discount: z.number().optional(),
});

function getUserFromToken(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  if (!token) throw new Error('Unauthorized: no token');

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (err: any) {
    // Provide clearer error during development and log masked token
    const masked = token ? token.slice(0, 8) + '...' : 'no-token';
    console.error(`JWT verification failed for token=${masked}:`, err?.message || err);
    throw new Error('Invalid token');
  }
}

// GET - List invoices
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const user = getUserFromToken(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    
    const query: any = {};
    if (user.role !== 'admin') {
      query.createdBy = user.userId;
    }
    if (status) {
      query.status = status;
    }
    
    const invoices = await Invoice.find(query)
      .populate('createdBy', 'name email')
      .populate('signedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    
    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('Get invoices error:', error);
      return NextResponse.json({ error }, { status: 400 });
    }
  }

// POST - Create invoice
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const user = getUserFromToken(req);
    const body = await req.json();
    const data = createInvoiceSchema.parse(body);
    
    // Calculate totals
    const subtotal = data.lineItems.reduce((sum, item) => sum + item.total, 0);
    const tax = data.tax || 0;
    const discount = data.discount || 0;
    const grandTotal = subtotal + tax - discount;
    
    // Generate invoice number
    const settings = await Setting.findOne() || {
      invoicePrefix: 'INV',
    };
    
    const count = await Invoice.countDocuments();
    const invoiceNumber = `${settings.invoicePrefix}-${String(count + 1).padStart(6, '0')}`;
    
    const invoice = await Invoice.create({
      invoiceNumber,
      createdBy: user.userId,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientAddress: data.clientAddress,
      lineItems: data.lineItems,
      subtotal,
      tax,
      discount,
      grandTotal,
      status: 'draft',
    });
    
    await createLog({
      userId: user.userId,
      action: LogActions.INVOICE_CREATED,
      entity: 'invoice',
      entityId: invoice._id.toString(),
      description: `Invoice created: ${invoiceNumber}`,
      ipAddress: req.headers.get('x-forwarded-for') || "unknown",
    });
    
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error: any) {
    console.error('Create invoice error:', error);
    return NextResponse.json({ error }, { status: 400 });
  } }