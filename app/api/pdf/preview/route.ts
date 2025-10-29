import { NextRequest, NextResponse } from 'next/server';
// NOTE: we'll dynamically import the utils/pdf module inside the handler to avoid
// any build-time import issues in edge/route contexts.
import path from 'path';
import fs from 'fs';

// Import alternative template if requested
let generateTaxInvoice: ((invoice: any, settings: any) => Promise<Uint8Array>) | null = null;
try {
  // taxInvoiceTemplate lives in public/pdfs in this repo
  // import dynamically so this file still works if the template is absent
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  // @ts-ignore
  generateTaxInvoice = require(path.join(process.cwd(), 'public', 'pdfs', 'taxInvoiceTemplate.ts')).generateTaxInvoice;
} catch (e) {
  generateTaxInvoice = null;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const template = url.searchParams.get('template') || 'default';

    // Prepare a small fixture invoice for preview
    const invoice = {
      invoiceNumber: 'PREVIEW-001',
      createdAt: new Date().toISOString(),
      clientName: 'Preview Client',
      clientEmail: 'client@example.com',
      clientAddress: '123 Preview Lane',
      lineItems: [
        { description: 'Consulting', quantity: 2, rate: 100, total: 200 },
        { description: 'Support', quantity: 1, rate: 150, total: 150 },
      ],
      subtotal: 350,
      tax: 0,
      discount: 0,
      grandTotal: 350,
      signedAt: new Date().toISOString(),
    } as any;

    const settings = {
      companyName: 'Preview Company',
      companyAddress: '1 Preview Plaza',
      companyEmail: 'info@preview.local',
      companyPhone: '+1 555 5555',
      termsText: 'Preview terms',
    } as any;

    let buffer: Buffer;

    if (template === 'tax' && generateTaxInvoice) {
      const bytes = await generateTaxInvoice(invoice, settings);
      buffer = Buffer.from(bytes);
    } else {
      const pdfModule = await import('@/utils/pdf');
      const generateInvoicePDF = (pdfModule as any).generateInvoicePDF ?? (pdfModule as any).default?.generateInvoicePDF;
      if (!generateInvoicePDF) throw new Error('generateInvoicePDF not found');
      const bytes = await generateInvoicePDF(invoice, settings, 'Preview User', new Date());
      buffer = Buffer.from(bytes);
    }

    const body = new Uint8Array(buffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="preview-${template}.pdf"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Preview PDF error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
