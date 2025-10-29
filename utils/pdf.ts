// ====================================
// utils/pdf.ts - UPDATED
// PDF Generation with GST and Digital Signature
// ====================================
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export async function generateInvoicePDFWithGST(
  invoice: any,
  settings: any,
  signedBy: string,
  signedAt: Date,
  signatureImageUrl?: string
): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let y = height - 40;

    // === HEADER ===
    page.drawText(settings.companyName || 'Your Company', {
      x: 50,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    
    y -= 20;
    page.drawText(settings.companyAddress || '', { x: 50, y, size: 9, font });
    y -= 12;
    page.drawText(`${settings.companyEmail || ''} | ${settings.companyPhone || ''}`, {
      x: 50,
      y,
      size: 9,
      font,
    });
    
    // === INVOICE TITLE & DETAILS ===
    y -= 30;
    page.drawText('TAX INVOICE', {
      x: 50,
      y,
      size: 20,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.8),
    });
    
    y -= 25;
    page.drawText(`Invoice No: ${invoice.invoiceNumber}`, {
      x: 50,
      y,
      size: 11,
      font: fontBold,
    });
    
    page.drawText(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}`, {
      x: width - 200,
      y,
      size: 10,
      font,
    });
    
    y -= 15;
    if (invoice.orderReferenceNumber) {
      page.drawText(`Order Ref: ${invoice.orderReferenceNumber}`, {
        x: 50,
        y,
        size: 10,
        font,
      });
      y -= 15;
    }
    
    // === BILL TO ===
    y -= 10;
    page.drawText('Bill To:', { x: 50, y, size: 11, font: fontBold });
    y -= 15;
    page.drawText(invoice.clientName, { x: 50, y, size: 10, font });
    y -= 13;
    page.drawText(invoice.clientEmail, { x: 50, y, size: 9, font });
    y -= 13;
    page.drawText(invoice.clientAddress, { x: 50, y, size: 9, font });
    y -= 13;
    
    if (invoice.clientGSTNumber) {
      page.drawText(`GSTIN: ${invoice.clientGSTNumber}`, {
        x: 50,
        y,
        size: 9,
        font: fontBold,
      });
      y -= 13;
    }
    
    // === LINE ITEMS TABLE ===
    y -= 20;
    
    // Table header background
    page.drawRectangle({
      x: 40,
      y: y - 18,
      width: width - 80,
      height: 22,
      color: rgb(0.95, 0.95, 0.95),
    });
    
    // Table headers
    page.drawText('Description', { x: 45, y, size: 9, font: fontBold });
    page.drawText('HSN', { x: 260, y, size: 9, font: fontBold });
    page.drawText('Qty', { x: 315, y, size: 9, font: fontBold });
    page.drawText('Rate', { x: 360, y, size: 9, font: fontBold });
    page.drawText('Amount', { x: 480, y, size: 9, font: fontBold });
    
    y -= 25;
    
    // Line items
    for (const item of invoice.lineItems) {
      if (y < 150) {
        // Add new page if needed
        const newPage = pdfDoc.addPage([595, 842]);
        y = height - 50;
      }
      
      page.drawText(item.description.substring(0, 35), { x: 45, y, size: 9, font });
      page.drawText(item.hsnCode, { x: 260, y, size: 9, font });
      page.drawText(item.quantity.toString(), { x: 315, y, size: 9, font });
      page.drawText(`INR${item.rate.toFixed(2)}`, { x: 360, y, size: 9, font });
      page.drawText(`INR${item.total.toFixed(2)}`, { x: 470, y, size: 9, font });
      y -= 18;
    }
    
    // === TOTALS ===
    y -= 15;
    page.drawLine({
      start: { x: 350, y: y + 5 },
      end: { x: width - 40, y: y + 5 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    
    y -= 5;
    
    // Subtotal
    page.drawText('Subtotal:', { x: 380, y, size: 10, font });
    page.drawText(`INR${invoice.subtotal.toFixed(2)}`, {
      x: 470,
      y,
      size: 10,
      font,
    });
    y -= 15;
    
    // Tax breakdown
    if (invoice.taxType === 'IGST') {
      page.drawText('IGST @ 18%:', { x: 380, y, size: 10, font });
      page.drawText(`INR${invoice.igst.toFixed(2)}`, {
        x: 470,
        y,
        size: 10,
        font,
      });
      y -= 15;
    } else {
      page.drawText('CGST @ 9%:', { x: 380, y, size: 10, font });
      page.drawText(`INR${invoice.cgst.toFixed(2)}`, {
        x: 470,
        y,
        size: 10,
        font,
      });
      y -= 15;
      
      page.drawText('SGST @ 9%:', { x: 380, y, size: 10, font });
      page.drawText(`INR${invoice.sgst.toFixed(2)}`, {
        x: 470,
        y,
        size: 10,
        font,
      });
      y -= 15;
    }
    
    // Total tax
    page.drawText('Total Tax:', { x: 380, y, size: 10, font: fontBold });
    page.drawText(`INR"${invoice.totalTax.toFixed(2)}"`, {
      x: 470,
      y,
      size: 10,
      font: fontBold,
    });
    y -= 15;
    
    // Discount
    if (invoice.discount > 0) {
      page.drawText('Discount:', { x: 380, y, size: 10, font });
      page.drawText(`-INR${invoice.discount.toFixed(2)}`, {
        x: 470,
        y,
        size: 10,
        font,
      });
      y -= 15;
    }
    
    // Grand total box
    page.drawRectangle({
      x: 370,
      y: y - 22,
      width: width - 410,
      height: 25,
      color: rgb(0.9, 0.95, 1),
    });
    
    page.drawText('Grand Total:', { x: 380, y: y - 5, size: 12, font: fontBold });
    page.drawText(`INR${invoice.grandTotal.toFixed(2)}`, {
      x: 470,
      y: y - 5,
      size: 12,
      font: fontBold,
      color: rgb(0, 0.4, 0),
    });
    
    y -= 40;
    
    // === SIGNATURE SECTION ===
    if (y < 150) {
      const newPage = pdfDoc.addPage([595, 842]);
      y = height - 50;
    }
    
    y -= 20;
    page.drawText('Authorized Signatory', { x: 50, y, size: 10, font: fontBold });
    y -= 15;
    
    // If signature image URL provided, embed it
    if (signatureImageUrl) {
      try {
        const signaturePath = path.join(process.cwd(), 'public', signatureImageUrl);
        
        if (fs.existsSync(signaturePath)) {
          const signatureBytes = fs.readFileSync(signaturePath);
          let signatureImage;
          
          if (signatureImageUrl.endsWith('.png')) {
            signatureImage = await pdfDoc.embedPng(signatureBytes);
          } else if (signatureImageUrl.endsWith('.jpg') || signatureImageUrl.endsWith('.jpeg')) {
            signatureImage = await pdfDoc.embedJpg(signatureBytes);
          }
          
          if (signatureImage) {
            const signatureDims = signatureImage.scale(0.3); // Scale down
            page.drawImage(signatureImage, {
              x: 50,
              y: y - signatureDims.height,
              width: signatureDims.width,
              height: signatureDims.height,
            });
            y -= signatureDims.height + 5;
          }
        }
      } catch (error) {
        console.error('Failed to embed signature image:', error);
        // Fallback to text
        page.drawText('(Digital Signature)', {
          x: 50,
          y,
          size: 9,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
        y -= 20;
      }
    } else {
      // No image, use text signature
      page.drawText('(Digital Signature)', {
        x: 50,
        y,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      y -= 20;
    }
    
    page.drawText(signedBy, { x: 50, y, size: 10, font });
    y -= 12;
    page.drawText(`Signed: ${signedAt.toLocaleString('en-IN')}`, {
      x: 50,
      y,
      size: 8,
      font,
    });
    y -= 12;

    
    // === TERMS ===
    y -= 30;
    if (y < 80) {
      const newPage = pdfDoc.addPage([595, 842]);
      y = height - 50;
    }
    
    page.drawText('Terms & Conditions:', { x: 50, y, size: 9, font: fontBold });
    y -= 12;
    const termsText = settings.termsText || 'Payment due within 30 days.';
    page.drawText(termsText, {
      x: 50,
      y,
      size: 8,
      font,
      maxWidth: width - 100,
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