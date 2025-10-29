// ====================================
// utils/pdf.ts - FIXED VERSION with Data Validation
// PDF Generation with Proper Error Handling
// ====================================
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { IInvoice } from '@/models/Invoice';
import { ISetting } from '@/models/Setting';
import fs from 'fs';
import path from 'path';

/**
 * Format currency for Indian Rupees without ₹ symbol
 */
function formatINR(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'INR 0';
  }
  return `INR ${amount.toLocaleString('en-IN')}`;
}

/**
 * Safe text drawing with fallbacks
 */
function drawSafeText(page: any, text: string | undefined | null, options: any) {
  const safeText = text?.toString() || '';
  page.drawText(safeText, options);
}

/**
 * Generate Tax Invoice PDF matching Figma design
 */
export async function generateInvoicePDF(
  invoice: any,
  settings: any,
  signedBy: string,
  signedAt: Date
): Promise<Buffer> {
  try {
    // Validate required invoice data
    if (!invoice) {
      throw new Error('Invoice data is required');
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const margin = 50;
    let yPosition = height - margin;

    // Colors matching the design
    const primaryColor = rgb(0.2, 0.2, 0.2);
    const accentColor = rgb(0.9, 0.3, 0.2);
    const lightColor = rgb(0.6, 0.6, 0.6);

    // Title - TAX INVOICE (Centered)
    page.drawText('TAX INVOICE', {
      x: width / 2 - 60,
      y: yPosition,
      size: 24,
      font: fontBold,
      color: primaryColor,
    });

    yPosition -= 50;

    // Two column layout for FROM and BILL TO
    const columnWidth = (width - 2 * margin) / 2;

    // FROM Section
    page.drawText('FROM', {
      x: margin,
      y: yPosition,
      size: 14,
      font: fontBold,
      color: primaryColor,
    });

    yPosition -= 20;
    drawSafeText(page, settings?.companyName || 'KEYZOTRICK INTELLIGENCE PRIVATE LIMITED', {
      x: margin,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: primaryColor,
    });

    yPosition -= 15;
    const fromAddressLines = [
      settings?.companyAddress?.split('\n')[0] || 'A-704, Ratnaakar Nine Square, Opp.',
      settings?.companyAddress?.split('\n')[1] || 'ITC Narmada, Keshavbaug, Vastrapur,',
      settings?.companyAddress?.split('\n')[2] || 'Ahmedabad, India - 380015',
      `PH: ${settings?.companyPhone || '987654321'}`,
      `GSTIN: ${settings?.companyGSTIN || '567 3252 20'}`
    ];

    fromAddressLines.forEach(line => {
      page.drawText(line, {
        x: margin,
        y: yPosition,
        size: 10,
        font: font,
        color: primaryColor,
      });
      yPosition -= 12;
    });

    // Reset Y position for BILL TO section
    yPosition = height - margin - 70;

    // BILL TO Section
    page.drawText('BILL TO', {
      x: margin + columnWidth,
      y: yPosition,
      size: 14,
      font: fontBold,
      color: primaryColor,
    });

    yPosition -= 20;
    drawSafeText(page, invoice?.clientName || 'XYZ CONSULTANCY PRIVATE LIMITED', {
      x: margin + columnWidth,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: primaryColor,
    });

    yPosition -= 15;
    const billToAddressLines = [
      ...(invoice?.clientAddress?.split('\n') || ['2300 N Street,', 'EW Suite 200 Washington DC', '20037, United States']),
      `GSTIN: ${invoice?.clientGSTIN || '22-2143333'}`
    ];

    billToAddressLines.forEach(line => {
      page.drawText(line, {
        x: margin + columnWidth,
        y: yPosition,
        size: 10,
        font: font,
        color: primaryColor,
      });
      yPosition -= 12;
    });

    // Line separator
    yPosition = height - margin - 180;
    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: width - margin, y: yPosition },
      thickness: 1,
      color: lightColor,
    });

    yPosition -= 30;

    // Table Headers
    const tableColumns = {
      description: margin,
      quantity: margin + 250,
      rate: margin + 320,
      hsn: margin + 380,
      total: margin + 450
    };

    // Table Headers
    page.drawText('DESCRIPTION', {
      x: tableColumns.description,
      y: yPosition,
      size: 10,
      font: fontBold,
      color: primaryColor,
    });

    page.drawText('QUANTITY', {
      x: tableColumns.quantity,
      y: yPosition,
      size: 10,
      font: fontBold,
      color: primaryColor,
    });

    page.drawText('RATE', {
      x: tableColumns.rate,
      y: yPosition,
      size: 10,
      font: fontBold,
      color: primaryColor,
    });

    page.drawText('HSN/SAC', {
      x: tableColumns.hsn,
      y: yPosition,
      size: 10,
      font: fontBold,
      color: primaryColor,
    });

    page.drawText('TOTAL', {
      x: tableColumns.total,
      y: yPosition,
      size: 10,
      font: fontBold,
      color: primaryColor,
    });

    yPosition -= 20;

    // Table separator line
    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: width - margin, y: yPosition },
      thickness: 0.5,
      color: lightColor,
    });

    yPosition -= 15;

    // Table Rows - with safe data handling
    const lineItems = invoice?.lineItems || [];
    lineItems.forEach((item: any) => {
      drawSafeText(page, item?.description, {
        x: tableColumns.description,
        y: yPosition,
        size: 9,
        font: font,
        color: primaryColor,
      });

      drawSafeText(page, item?.quantity?.toString(), {
        x: tableColumns.quantity,
        y: yPosition,
        size: 9,
        font: font,
        color: primaryColor,
      });

      page.drawText(formatINR(item?.rate), {
        x: tableColumns.rate,
        y: yPosition,
        size: 9,
        font: font,
        color: primaryColor,
      });

      drawSafeText(page, item?.hsnSac || '998511', {
        x: tableColumns.hsn,
        y: yPosition,
        size: 9,
        font: font,
        color: primaryColor,
      });

      page.drawText(formatINR(item?.total), {
        x: tableColumns.total,
        y: yPosition,
        size: 9,
        font: font,
        color: primaryColor,
      });

      yPosition -= 20;

      // Check if we need a new page
      if (yPosition < 150) {
        const newPage = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }
    });

    // Bottom separator line
    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: width - margin, y: yPosition },
      thickness: 1,
      color: lightColor,
    });

    yPosition -= 30;

    // Totals Section - Right aligned
    const totalsX = width - margin - 150;

    page.drawText('SUBTOTAL', {
      x: totalsX,
      y: yPosition,
      size: 10,
      font: font,
      color: primaryColor,
    });

    page.drawText(formatINR(invoice?.subTotal), {
      x: totalsX + 80,
      y: yPosition,
      size: 10,
      font: font,
      color: primaryColor,
    });

    yPosition -= 15;

    page.drawText(`IGST (${invoice?.taxPercentage || 18}%)`, {
      x: totalsX,
      y: yPosition,
      size: 10,
      font: font,
      color: primaryColor,
    });

    page.drawText(formatINR(invoice?.taxAmount), {
      x: totalsX + 80,
      y: yPosition,
      size: 10,
      font: font,
      color: primaryColor,
    });

    yPosition -= 20;

    page.drawText('TOTAL AMOUNT', {
      x: totalsX,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: primaryColor,
    });

    page.drawText(formatINR(invoice?.grandTotal), {
      x: totalsX + 80,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: primaryColor,
    });

    yPosition -= 40;

    // Amount in words
    page.drawText('Amount Chargeable (in words)', {
      x: margin,
      y: yPosition,
      size: 10,
      font: fontBold,
      color: primaryColor,
    });

    yPosition -= 15;
    drawSafeText(page, invoice?.amountInWords || 'Indian Rupees One lakh Thirty Four Thousand Nine Hundred Fifty Three Only', {
      x: margin,
      y: yPosition,
      size: 9,
      font: font,
      color: primaryColor,
      maxWidth: width - 100
    });

    yPosition -= 40;

    // Payment Information
    page.drawText('Payment Information', {
      x: margin,
      y: yPosition,
      size: 11,
      font: fontBold,
      color: primaryColor,
    });

    yPosition -= 20;
    const paymentInfo = [
      `Account Name : ${settings?.paymentInfo?.accountName || 'Keyzotrick Intelligence Private Limited'}`,
      `Bank Name    : ${settings?.paymentInfo?.bankName || ''}`,
      `A/c No.      : ${settings?.paymentInfo?.accountNumber || ''}`,
      `Branch & IFS Code : ${settings?.paymentInfo?.branchAndIFSC || ''}`
    ];

    paymentInfo.forEach(line => {
      page.drawText(line, {
        x: margin,
        y: yPosition,
        size: 9,
        font: font,
        color: primaryColor,
      });
      yPosition -= 15;
    });

    yPosition -= 20;

    // Terms and Conditions
    page.drawText('Terms and Conditions:', {
      x: margin,
      y: yPosition,
      size: 11,
      font: fontBold,
      color: primaryColor,
    });

    yPosition -= 15;
    const terms = settings?.termsAndConditions || [
      'All payments are made subject to realization of the same',
      'Payment should be done within 07 days from generated invoice date',
      'Cheque return charges should be INR 500'
    ];

    terms.forEach((line: string) => {
      page.drawText(line, {
        x: margin,
        y: yPosition,
        size: 9,
        font: font,
        color: primaryColor,
        maxWidth: width - 100
      });
      yPosition -= 12;
    });

    // Signature Section (if signed)
    if (signedBy && signedAt) {
      yPosition -= 30;
      page.drawText('Digitally Signed By:', {
        x: margin,
        y: yPosition,
        size: 10,
        font: fontBold,
      });
      
      yPosition -= 15;
      drawSafeText(page, signedBy, { 
        x: margin, 
        y: yPosition, 
        size: 10, 
        font 
      });
      
      yPosition -= 15;
      page.drawText(`Signed At: ${signedAt.toLocaleString()}`, { 
        x: margin, 
        y: yPosition, 
        size: 9, 
        font 
      });
    }

    yPosition -= 30;

    // Footer
    page.drawText('Thank you for choosing our Business', {
      x: width / 2 - 100,
      y: yPosition,
      size: 10,
      font: fontBold,
      color: accentColor,
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