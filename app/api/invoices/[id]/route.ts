// ====================================
// app/api/invoices/[id]/route.ts
// ====================================
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import Invoice from '@/models/Invoice';
import { createLog, LogActions } from '@/utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function getUserFromToken(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  if (!token) throw new Error('Unauthorized');
  return jwt.verify(token, JWT_SECRET) as any;
}

// GET - Get single invoice
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Add Promise wrapper
) {
  try {
    await dbConnect();
    const user = getUserFromToken(req);
    
    // Await the params promise first
    const { id } = await params;
    
    const invoice = await Invoice.findById(id)
      .populate('createdBy', 'name email')
      .populate('signedBy', 'name email')
      .lean() as any;
    
    console.log('Fetching invoice with ID:', id); // Use id instead of params.id
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    if (user.role !== 'admin' && invoice.createdBy._id.toString() !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return NextResponse.json({ invoice });
  } catch (error) {
    return NextResponse.json({ error: error }, { status: 400 });
  }
}

// PUT - Update invoice
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const user = getUserFromToken(req);
    const body = await req.json();
    
    const invoice = await Invoice.findById(params.id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    if (invoice.status === 'signed') {
      return NextResponse.json({ error: 'Cannot update signed invoice' }, { status: 400 });
    }
    
    if (user.role !== 'admin' && invoice.createdBy.toString() !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Recalculate totals if lineItems changed
    if (body.lineItems) {
      const subtotal = body.lineItems.reduce((sum: any, item: { total: any; }) => sum + item.total, 0);
      body.subtotal = subtotal;
      body.grandTotal = subtotal + (body.tax || 0) - (body.discount || 0);
    }
    
    const updated = await Invoice.findByIdAndUpdate(params.id, body, { new: true });
    
    await createLog({
      userId: user.userId,
      action: LogActions.INVOICE_UPDATED,
      entity: 'invoice',
      entityId: params.id,
      description: `Invoice updated: ${updated.invoiceNumber}`,
      ipAddress: req.headers.get('x-forwarded-for') || "unknown",
    });
    
    return NextResponse.json({ invoice: updated });
  } catch (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
}

// DELETE - Delete invoice
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const user = getUserFromToken(req);
    
    const invoice = await Invoice.findById(params.id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await Invoice.findByIdAndDelete(params.id);
    
    await createLog({
      userId: user.userId,
      action: LogActions.INVOICE_DELETED,
      entity: 'invoice',
      entityId: params.id,
      description: `Invoice deleted: ${invoice.invoiceNumber}`,
      ipAddress: req.headers.get('x-forwarded-for') || "unknown",
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error}, { status: 400 });
  }
}