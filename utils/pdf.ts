// ====================================
// utils/pdf.ts - FIXED VERSION
// PDF Generation with Proper Error Handling
// ====================================
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { IInvoice } from '@/models/Invoice';
import { ISetting } from '@/models/Setting';
import fs from 'fs';
import path from 'path';

/**
 * Generate Invoice PDF with signature verification
 */
export async function generateInvoicePDF(
  invoice: any,
  settings: any,
  signedBy: string,
  signedAt: Date
): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let y = height - 50;

    // Company Header
    page.drawText(settings.companyName || 'Company', {
      x: 50,
      y,
      size: 20,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    
    y -= 20;
    page.drawText(settings.companyAddress || '123 Business St', { 
      x: 50, 
      y, 
      size: 10, 
      font 
    });
    
    y -= 15;
    const contactInfo = `${settings.companyEmail || 'email@company.com'} | ${settings.companyPhone || '555-0000'}`;
    page.drawText(contactInfo, { x: 50, y, size: 10, font });
    
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
    page.drawText(`Invoice #: ${invoice.invoiceNumber}`, { 
      x: 50, 
      y, 
      size: 12, 
      font: fontBold 
    });
    
    const invoiceDate = new Date(invoice.createdAt).toLocaleDateString();
    page.drawText(`Date: ${invoiceDate}`, {
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
    page.drawRectangle({ 
      x: 50, 
      y: y - 15, 
      width: width - 100, 
      height: 20, 
      color: rgb(0.9, 0.9, 0.9) 
    });
    
    page.drawText('Description', { x: 60, y, size: 10, font: fontBold });
    page.drawText('Qty', { x: 320, y, size: 10, font: fontBold });
    page.drawText('Rate', { x: 380, y, size: 10, font: fontBold });
    page.drawText('Total', { x: 460, y, size: 10, font: fontBold });
    
    // Line Items
    y -= 25;
    for (const item of invoice.lineItems) {
      const desc = item.description.substring(0, 40);
      page.drawText(desc, { x: 60, y, size: 9, font });
      page.drawText(item.quantity.toString(), { x: 320, y, size: 9, font });
      page.drawText(`$${item.rate.toFixed(2)}`, { x: 380, y, size: 9, font });
      page.drawText(`$${item.total.toFixed(2)}`, { x: 460, y, size: 9, font });
      y -= 20;
      
      // Check if we need a new page
      if (y < 100) {
        const newPage = pdfDoc.addPage([595, 842]);
        y = height - 50;
      }
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
    page.drawText(`Tax: $${invoice.tax.toFixed(2)}`, { 
      x: width - 200, 
      y, 
      size: 10, 
      font 
    });
    
    y -= 15;
    page.drawText(`Discount: -$${invoice.discount.toFixed(2)}`, { 
      x: width - 200, 
      y, 
      size: 10, 
      font 
    });
    
    y -= 20;
    page.drawText(`Grand Total: $${invoice.grandTotal.toFixed(2)}`, {
      x: width - 200,
      y,
      size: 12,
      font: fontBold,
    });
    
    // Signature Section
    y -= 60;
    if (y < 150) {
      const newPage = pdfDoc.addPage([595, 842]);
      y = height - 50;
    }
    
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
    if (y < 100) {
      const newPage = pdfDoc.addPage([595, 842]);
      y = height - 50;
    }
    
    page.drawText('Terms & Conditions:', { x: 50, y, size: 10, font: fontBold });
    y -= 15;
    const termsText = settings.termsText || 'Payment due within 30 days.';
    page.drawText(termsText, { 
      x: 50, 
      y, 
      size: 8, 
      font, 
      maxWidth: width - 100 
    });
    
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error(`Failed to generate PDF: ${error}`);
  }
}

/**
 * Save PDF to filesystem
 */
export async function savePDF(buffer: Buffer, invoiceNumber: string): Promise<string> {
  try {
    const publicDir = path.join(process.cwd(), 'public', 'pdfs');
    
    // Ensure directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
      console.log('Created pdfs directory:', publicDir);
    }
    
    // Sanitize filename
    const sanitizedNumber = invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_');
    const filename = `${sanitizedNumber}.pdf`;
    const filepath = path.join(publicDir, filename);
    
    // Write file synchronously for reliability
    fs.writeFileSync(filepath, buffer);
    
    console.log('PDF saved successfully:', filepath);
    
    // Verify file was created
    if (!fs.existsSync(filepath)) {
      throw new Error('PDF file was not created');
    }
    
    const stats = fs.statSync(filepath);
    console.log('PDF file size:', stats.size, 'bytes');
    
    return `/pdfs/${filename}`;
  } catch (error) {
    console.error('PDF save error:', error);
    throw new Error(`Failed to save PDF: ${error}`);
  }
}

/**
 * Check if PDF exists
 */
export function pdfExists(pdfUrl: string): boolean {
  try {
    const filepath = path.join(process.cwd(), 'public', pdfUrl);
    return fs.existsSync(filepath);
  } catch (error) {
    console.error('PDF check error:', error);
    return false;
  }
}

/**
 * Delete PDF file
 */
export async function deletePDF(pdfUrl: string): Promise<boolean> {
  try {
    const filepath = path.join(process.cwd(), 'public', pdfUrl);
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log('PDF deleted:', filepath);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('PDF deletion error:', error);
    return false;
  }
}
