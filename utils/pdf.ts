// ====================================
// utils/pdf.ts - UPDATED
// PDF Generation with GST and Digital Signature
// ====================================
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  hsnCode: string;
  total: number;
}

interface InvoiceData {
  invoiceNumber: string;
  createdAt: Date;
  orderReferenceNumber?: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  clientGSTNumber?: string;
  lineItems: LineItem[];
  subtotal: number;
  taxType: 'IGST' | 'CGST_SGST';
  igst: number;
  cgst: number;
  sgst: number;
  totalTax: number;
  discount: number;
  grandTotal: number;
}

interface CompanySettings {
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  companyGSTIN: string;
  termsText?: string;
}

export async function generateInvoicePDFWithGST(
  invoice: InvoiceData,
  settings: CompanySettings,
  signedBy: string,
  signedAt: Date,
  signatureImageUrl?: string
): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let y = height - 40;

    // === DECORATIVE VECTORS (Top Right) ===
    drawTopRightDecoration(page, width);

    // === COMPANY LOGO ===
    page.drawText('KIPL', {
      x: 32,
      y: y - 5,
      size: 24,
      font: fontBold,
      color: rgb(0, 0.44, 0.7), // #0070b2
    });
    
    y -= 35;

    // === FROM SECTION ===
    page.drawText('FROM', {
      x: 33,
      y,
      size: 9,
      font: fontBold,
      color: rgb(0, 0.44, 0.7),
    });
    
    y -= 15;
    page.drawText(settings.companyName.toUpperCase(), {
      x: 33,
      y,
      size: 9,
      font: fontBold,
      color: rgb(0.06, 0.06, 0.07),
    });
    
    y -= 14;
    const addressLines = wrapText(settings.companyAddress, 168, font, 9);
    for (const line of addressLines) {
      page.drawText(line, {
        x: 33,
        y,
        size: 9,
        font,
        color: rgb(0.28, 0.29, 0.3),
      });
      y -= 14;
    }
    
    page.drawText(`PH: ${settings.companyPhone}`, {
      x: 33,
      y,
      size: 9,
      font,
      color: rgb(0.28, 0.29, 0.3),
    });
    
    y -= 14;
    page.drawText(`GSTIN: ${settings.companyGSTIN}`, {
      x: 33,
      y,
      size: 9,
      font,
      color: rgb(0.28, 0.29, 0.3),
    });

    // === TAX INVOICE HEADER (Top Right) ===
    page.drawText('TAX INVOICE', {
      x: 410,
      y: height - 45,
      size: 24,
      font: fontBold,
      color: rgb(0, 0.44, 0.7),
    });

    // === BILL TO SECTION ===
    const billToY = height - 103;
    page.drawText('BILL TO', {
      x: 392,
      y: billToY,
      size: 9,
      font: fontBold,
      color: rgb(0, 0.44, 0.7),
    });
    
    let billY = billToY - 15;
    page.drawText(invoice.clientName.toUpperCase(), {
      x: 392,
      y: billY,
      size: 9,
      font: fontBold,
      color: rgb(0.06, 0.06, 0.07),
    });
    
    billY -= 14;
    const clientAddressLines = wrapText(invoice.clientAddress, 152, font, 9);
    for (const line of clientAddressLines) {
      page.drawText(line, {
        x: 392,
        y: billY,
        size: 9,
        font,
        color: rgb(0.28, 0.29, 0.3),
      });
      billY -= 14;
    }
    
    if (invoice.clientGSTNumber) {
      page.drawText(`GSTIN: ${invoice.clientGSTNumber}`, {
        x: 392,
        y: billY,
        size: 9,
        font,
        color: rgb(0.28, 0.29, 0.3),
      });
    }

    // === TABLE HEADER ===
    y = height - 261;
    
    // Blue header background
    page.drawRectangle({
      x: 32,
      y: y - 4,
      width: 525,
      height: 23,
      color: rgb(0, 0.44, 0.7),
    });
    
    // Table headers
    page.drawText('DESCRIPTION', {
      x: 42,
      y: y + 5,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    
    page.drawText('QUANTITY', {
      x: 357,
      y: y + 5,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    
    page.drawText('RATE', {
      x: 432,
      y: y + 5,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    
    page.drawText('HSN/SAC', {
      x: 492,
      y: y + 5,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    
    page.drawText('TOTAL', {
      x: 507,
      y: y + 5,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    
    y -= 30;

    // === LINE ITEMS ===
    let isAlternate = false;
    for (const item of invoice.lineItems) {
      if (y < 150) {
        page = pdfDoc.addPage([595, 842]);
        y = height - 50;
      }
      
      // Alternating row background
      const bgColor = isAlternate 
        ? rgb(0.88, 0.9, 0.92) 
        : rgb(0.82, 0.85, 0.85);
      
      page.drawRectangle({
        x: 32,
        y: y - 4,
        width: 525,
        height: 26,
        color: bgColor,
      });
      
      page.drawText(item.description.substring(0, 35), {
        x: 42,
        y: y + 5,
        size: 9,
        font: fontBold,
        color: rgb(0.06, 0.06, 0.07),
      });
      
      page.drawText(item.quantity.toString(), {
        x: 367,
        y: y + 5,
        size: 9,
        font,
        color: rgb(0.06, 0.06, 0.07),
      });
      
      page.drawText('INR', {
        x: 432,
        y: y + 5,
        size: 9,
        font: fontBold,
        color: rgb(0.06, 0.06, 0.07),
      });
      
      page.drawText(item.rate.toFixed(0), {
        x: 440,
        y: y + 5,
        size: 9,
        font,
        color: rgb(0.06, 0.06, 0.07),
      });
      
      page.drawText(item.hsnCode, {
        x: 492,
        y: y + 5,
        size: 9,
        font,
        color: rgb(0.06, 0.06, 0.07),
      });
      
      page.drawText('INR', {
        x: 507,
        y: y + 5,
        size: 9,
        font: fontBold,
        color: rgb(0.06, 0.06, 0.07),
      });
      
      page.drawText(item.total.toLocaleString('en-IN'), {
        x: 515,
        y: y + 5,
        size: 9,
        font: fontBold,
        color: rgb(0.06, 0.06, 0.07),
      });
      
      y -= 30;
      isAlternate = !isAlternate;
    }

    // === AMOUNT IN WORDS ===
    y -= 10;
    page.drawText('Amount Chargeable (in words)', {
      x: 42,
      y,
      size: 9,
      font,
      color: rgb(0.28, 0.29, 0.31),
    });
    
    y -= 12;
    const amountInWords = numberToWords(invoice.grandTotal);
    page.drawText(amountInWords, {
      x: 42,
      y,
      size: 9,
      font: fontBold,
      color: rgb(0, 0.17, 0.28),
    });

    // === TOTALS SECTION ===
    y -= 40;
    
    // Subtotal
    page.drawText('SUBTOTAL', {
      x: 372,
      y,
      size: 9,
      font: fontBold,
      color: rgb(0, 0.44, 0.7),
    });
    
    page.drawText('INR', {
      x: 507,
      y,
      size: 9,
      font: fontBold,
      color: rgb(0.06, 0.06, 0.07),
    });
    
    page.drawText(invoice.subtotal.toLocaleString('en-IN'), {
      x: 515,
      y,
      size: 9,
      font,
      color: rgb(0.28, 0.29, 0.3),
    });
    
    y -= 28;
    
    // Tax
    if (invoice.taxType === 'IGST') {
      page.drawText('IGST (18%)', {
        x: 372,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0, 0.44, 0.7),
      });
      
      page.drawText('INR', {
        x: 507,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0.06, 0.06, 0.07),
      });
      
      page.drawText(invoice.igst.toLocaleString('en-IN'), {
        x: 515,
        y,
        size: 9,
        font,
        color: rgb(0.28, 0.29, 0.3),
      });
    } else {
      page.drawText('CGST (9%)', {
        x: 372,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0, 0.44, 0.7),
      });
      
      page.drawText('INR', {
        x: 507,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0.06, 0.06, 0.07),
      });
      
      page.drawText(invoice.cgst.toLocaleString('en-IN'), {
        x: 515,
        y,
        size: 9,
        font,
        color: rgb(0.28, 0.29, 0.3),
      });
      
      y -= 14;
      
      page.drawText('SGST (9%)', {
        x: 372,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0, 0.44, 0.7),
      });
      
      page.drawText('INR', {
        x: 507,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0.06, 0.06, 0.07),
      });
      
      page.drawText(invoice.sgst.toLocaleString('en-IN'), {
        x: 515,
        y,
        size: 9,
        font,
        color: rgb(0.28, 0.29, 0.3),
      });
    }
    
    y -= 30;
    
    // Grand Total
    page.drawRectangle({
      x: 367,
      y: y - 8,
      width: 192,
      height: 33,
      color: rgb(0, 0.44, 0.7),
    });
    
    page.drawText('TOTAL AMOUNT', {
      x: 377,
      y: y + 7,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    
    page.drawText('INR', {
      x: 490,
      y: y + 7,
      size: 12,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    
    page.drawText(invoice.grandTotal.toLocaleString('en-IN'), {
      x: 500,
      y: y + 7,
      size: 12,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // === PAYMENT INFORMATION ===
    y -= 50;
    
    page.drawText('Payment Information', {
      x: 25,
      y,
      size: 9,
      font: fontBold,
      color: rgb(0, 0.35, 0.56),
    });
    
    y -= 15;
    page.drawText('Bank Name', { x: 25, y, size: 9, font, color: rgb(0.28, 0.29, 0.31) });
    page.drawText(':', { x: 109, y, size: 9, font, color: rgb(0.28, 0.29, 0.31) });
    
    y -= 11;
    page.drawText('Account Name', { x: 25, y, size: 9, font, color: rgb(0.28, 0.29, 0.31) });
    page.drawText(':', { x: 109, y, size: 9, font, color: rgb(0.28, 0.29, 0.31) });
    page.drawText(settings.companyName, { x: 115, y, size: 9, font, color: rgb(0.28, 0.29, 0.31) });
    
    y -= 11;
    page.drawText('A/c No.', { x: 25, y, size: 9, font, color: rgb(0.28, 0.29, 0.31) });
    page.drawText(':', { x: 109, y, size: 9, font, color: rgb(0.28, 0.29, 0.31) });
    
    y -= 11;
    page.drawText('Branch & IFS Code', { x: 25, y, size: 9, font, color: rgb(0.28, 0.29, 0.31) });
    page.drawText(':', { x: 109, y, size: 9, font, color: rgb(0.28, 0.29, 0.31) });

    // === TERMS & CONDITIONS ===
    y -= 25;
    page.drawText('Terms and Conditions:', {
      x: 25,
      y,
      size: 9,
      font: fontBold,
      color: rgb(0, 0.35, 0.56),
    });
    
    y -= 14;
    const terms = settings.termsText || 
      'All payments are made subject to realization of the same\n' +
      'Payment should be done within 07 days from generated invoice date\n' +
      'Cheque return charges should be INR500';
    
    const termsLines = terms.split('\n');
    for (const line of termsLines) {
      page.drawText(line, {
        x: 25,
        y,
        size: 9,
        font,
        color: rgb(0.28, 0.29, 0.31),
      });
      y -= 11;
    }

    // === AUTHORIZED SIGNATORY ===
    let signatureY = 88;
    
    // If signature image URL provided, embed it
    if (signatureImageUrl) {
      console.log('Embedding signature image from URL:', signatureImageUrl);
      try {
        // Fetch the image
        const imageResponse = await fetch(signatureImageUrl);
        const imageBytes = await imageResponse.arrayBuffer();
        console.log(imageResponse)
        let signatureImage;
        
        // Determine image type and embed
        if (signatureImageUrl.toLowerCase().endsWith('.png')) {
          signatureImage = await pdfDoc.embedPng(imageBytes);
        } else if (
          signatureImageUrl.toLowerCase().endsWith('.jpg') || 
          signatureImageUrl.toLowerCase().endsWith('.jpeg')
        ) {
          signatureImage = await pdfDoc.embedJpg(imageBytes);
        }
        
        if (signatureImage) {
          // Scale the signature to fit nicely
          const signatureScale = 0.3; // Adjust this to make signature bigger/smaller
          const signatureDims = signatureImage.scale(signatureScale);
          
          // Position signature above the text
          const signatureX = 479;
          const signatureYPos = signatureY + 15; // 15px above the text
          
          page.drawImage(signatureImage, {
            x: signatureX,
            y: signatureYPos,
            width: signatureDims.width,
            height: signatureDims.height,
          });
          
          // Adjust text position to be below signature
          signatureY = signatureYPos - 5;
        }
      } catch (error) {
        console.error('Failed to embed signature image:', error);
        // Continue without signature image
      }
    }

    page.drawText('Authorised Signatory', {
      x: 479,
      y: 88,
      size: 9,
      font,
      color: rgb(0, 0.35, 0.56),
    });

    // === FOOTER ===
    page.drawRectangle({
      x: 130,
      y: 0,
      width: 465,
      height: 27,
      color: rgb(0, 0.44, 0.7),
    });
    
    page.drawText('Thankyou for choosing our Business', {
      x: 225,
      y: 9,
      size: 9,
      font,
      color: rgb(1, 1, 1),
    });
    
    page.drawText(`${settings.companyEmail}`, {
      x: 445,
      y: 9,
      size: 9,
      font,
      color: rgb(1, 1, 1),
    });

    // === DECORATIVE VECTORS (Bottom Left) ===
    drawBottomLeftDecoration(page);

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error(`Failed to generate PDF: ${error}`);
  }
}

// Helper function to wrap text
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

// Helper function to convert number to words (simplified)
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  if (num === 0) return 'Zero';
  
  let words = 'Indian Rupees ';
  
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor((num % 1000) / 100);
  const remainder = Math.floor(num % 100);
  
  if (crore > 0) words += `${ones[crore]} Crore `;
  if (lakh > 0) words += `${ones[lakh]} Lakh `;
  if (thousand > 0) words += `${ones[thousand]} Thousand `;
  if (hundred > 0) words += `${ones[hundred]} Hundred `;
  
  if (remainder >= 20) {
    words += `${tens[Math.floor(remainder / 10)]} `;
    if (remainder % 10 > 0) words += `${ones[remainder % 10]} `;
  } else if (remainder >= 10) {
    words += `${teens[remainder - 10]} `;
  } else if (remainder > 0) {
    words += `${ones[remainder]} `;
  }
  
  return words.trim() + ' Only';
}

// Decorative elements
function drawTopRightDecoration(page: any, width: number): void {
  // Simplified decorative shapes
  page.drawRectangle({
    x: width - 146,
    y: 722,
    width: 146,
    height: 119,
    color: rgb(0.95, 0.97, 0.98),
    opacity: 0.5,
  });
}

function drawBottomLeftDecoration(page: any): void {
  // Simplified decorative shapes
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 145,
    height: 120,
    color: rgb(0.95, 0.97, 0.98),
    opacity: 0.5,
  });
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