// ====================================
// utils/pdf.ts - PDF Generation
// ====================================
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { IInvoice } from '@/models/Invoice';
import { ISetting } from '@/models/Setting';
import fs from 'fs/promises';
import path from 'path';

export async function generateInvoicePDF(
  invoice: IInvoice,
  settings: ISetting,
  signedBy: string,
  signedAt: Date
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let y = height - 50;

  // Company Header
  page.drawText(settings.companyName, {
    x: 50,
    y,
    size: 20,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  
  y -= 20;
  page.drawText(settings.companyAddress, { x: 50, y, size: 10, font });
  y -= 15;
  page.drawText(`${settings.companyEmail} | ${settings.companyPhone}`, { x: 50, y, size: 10, font });
  
  // Invoice Title
  y -= 40;
  page.drawText('INVOICE', {
    x: 50,
    y,
    size: 24,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.8),
  });
  
  // Invoice Details
  y -= 30;
  page.drawText(`Invoice #: ${invoice.invoiceNumber}`, { x: 50, y, size: 12, font: fontBold });
  page.drawText(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, {
    x: width - 200,
    y,
    size: 10,
    font,
  });
  
  // Client Info
  y -= 40;
  page.drawText('Bill To:', { x: 50, y, size: 12, font: fontBold });
  y -= 15;
  page.drawText(invoice.clientName, { x: 50, y, size: 10, font });
  y -= 15;
  page.drawText(invoice.clientEmail, { x: 50, y, size: 10, font });
  y -= 15;
  page.drawText(invoice.clientAddress, { x: 50, y, size: 10, font });
  
  // Line Items Header
  y -= 40;
  page.drawRectangle({ x: 50, y: y - 15, width: width - 100, height: 20, color: rgb(0.9, 0.9, 0.9) });
  page.drawText('Description', { x: 60, y, size: 10, font: fontBold });
  page.drawText('Qty', { x: 320, y, size: 10, font: fontBold });
  page.drawText('Rate', { x: 380, y, size: 10, font: fontBold });
  page.drawText('Total', { x: 460, y, size: 10, font: fontBold });
  
  // Line Items
  y -= 25;
  for (const item of invoice.lineItems) {
    page.drawText(item.description.substring(0, 40), { x: 60, y, size: 9, font });
    page.drawText(item.quantity.toString(), { x: 320, y, size: 9, font });
    page.drawText(`$${item.rate.toFixed(2)}`, { x: 380, y, size: 9, font });
    page.drawText(`$${item.total.toFixed(2)}`, { x: 460, y, size: 9, font });
    y -= 20;
  }
  
  // Totals
  y -= 20;
  page.drawText(`Subtotal: $${invoice.subtotal.toFixed(2)}`, {
    x: width - 200,
    y,
    size: 10,
    font,
  });
  y -= 15;
  page.drawText(`Tax: $${invoice.tax.toFixed(2)}`, { x: width - 200, y, size: 10, font });
  y -= 15;
  page.drawText(`Discount: -$${invoice.discount.toFixed(2)}`, { x: width - 200, y, size: 10, font });
  y -= 20;
  page.drawText(`Grand Total: $${invoice.grandTotal.toFixed(2)}`, {
    x: width - 200,
    y,
    size: 12,
    font: fontBold,
  });
  
  // Signature Section
  y -= 60;
  page.drawText('Digitally Signed By:', { x: 50, y, size: 10, font: fontBold });
  y -= 15;
  page.drawText(signedBy, { x: 50, y, size: 10, font });
  y -= 15;
  page.drawText(`Signed At: ${signedAt.toLocaleString()}`, { x: 50, y, size: 9, font });
  y -= 15;
  page.drawText('✓ Verified via WebAuthn (FIDO2)', {
    x: 50,
    y,
    size: 9,
    font,
    color: rgb(0, 0.6, 0),
  });
  
  // Terms
  y -= 40;
  page.drawText('Terms & Conditions:', { x: 50, y, size: 10, font: fontBold });
  y -= 15;
  page.drawText(settings.termsText, { x: 50, y, size: 8, font, maxWidth: width - 100 });
  
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function savePDF(buffer: Buffer, invoiceNumber: string): Promise<string> {
  const publicDir = path.join(process.cwd(), 'public', 'pdfs');
  
  try {
    await fs.access(publicDir);
  } catch {
    await fs.mkdir(publicDir, { recursive: true });
  }
  
  const filename = `${invoiceNumber}.pdf`;
  const filepath = path.join(publicDir, filename);
  
  await fs.writeFile(filepath, buffer);
  
  return `/pdfs/${filename}`;
}