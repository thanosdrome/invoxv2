// ====================================
// app/api/pdf/[id]/route.ts - FIXED VERSION
// PDF Download Endpoint
// ====================================
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import Invoice from '@/models/Invoice';
import path from 'path';
import fs from 'fs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function getUserFromToken(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  if (!token) throw new Error('Unauthorized');
  return jwt.verify(token, JWT_SECRET) as any;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Add Promise wrapper
) {
  
  try {
    await dbConnect();
    const user = getUserFromToken(req);
    const { id } = await params;
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    // Check if invoice is signed
    if (invoice.status !== 'signed') {
      console.log('Invoice not signed');
      return NextResponse.json(
        { error: 'PDF not available. Invoice must be signed first.' }, 
        { status: 400 }
      );
    }else if(!invoice.pdfUrl){
       console.log('no PDF URL');
      return NextResponse.json(
        { error: 'PDF not available. No PDF URL.' }, 
        { status: 400 }
      );
    }
    
    // Check permissions
    if (user.role !== 'admin' && invoice.createdBy.toString() !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Build file path
    const pdfPath = path.join(process.cwd(), 'public', invoice.pdfUrl);
    
    console.log('Attempting to read PDF from:', pdfPath);
    
    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      console.error('PDF file not found at path:', pdfPath);
      return NextResponse.json(
        { 
          error: 'PDF file not found on server',
          path: invoice.pdfUrl,
          message: 'The PDF may not have been generated correctly. Please try signing the invoice again.'
        }, 
        { status: 404 }
      );
    }
    
    // Read file
    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log('PDF read successfully, size:', pdfBuffer.length, 'bytes');
    
    // Return PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Get PDF error:', error);
    
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve PDF',
        message: error.message 
      }, 
      { status: 500 }
    );
  }
}