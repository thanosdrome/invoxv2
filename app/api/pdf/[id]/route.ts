// ====================================
// app/api/pdf/[id]/route.ts
// ====================================
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import Invoice from '@/models/Invoice';
import fs from 'fs/promises';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function getUserFromToken(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  if (!token) throw new Error('Unauthorized');
  return jwt.verify(token, JWT_SECRET) as any;
}

export async function GET(
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
    
    if (invoice.status !== 'signed' || !invoice.pdfUrl) {
      return NextResponse.json({ error: 'PDF not available' }, { status: 400 });
    }
    
    if (user.role !== 'admin' && invoice.createdBy.toString() !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const pdfPath = path.join(process.cwd(), 'public', invoice.pdfUrl);
    const pdfBuffer = await fs.readFile(pdfPath);
    
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Get PDF error:', error);
    return NextResponse.json({ error }, { status: 400 });
  }
}