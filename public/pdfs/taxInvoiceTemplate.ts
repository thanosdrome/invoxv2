// lib/pdf/taxInvoiceTemplate.ts
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Invoice, CompanySettings } from '@/types/invoice';

export async function generateTaxInvoice(invoice: any, settings: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const margin = 50;
  let yPosition = height - margin;

  // Colors matching the design
  const primaryColor = rgb(0.2, 0.2, 0.2);
  const accentColor = rgb(0.9, 0.3, 0.2);
  const lightColor = rgb(0.6, 0.6, 0.6);

  // Title - TAX INVOICE
  page.drawText('TAX INVOICE', {
    x: width / 2 - 60,
    y: yPosition,
    size: 24,
    font: boldFont,
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
    font: boldFont,
    color: primaryColor,
  });

  yPosition -= 20;
  page.drawText('KEYZOTRICK INTELLIGENCE PRIVATE LIMITED', {
    x: margin,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: primaryColor,
  });

  yPosition -= 15;
  const fromAddressLines = [
    'A-704, Ratnaakar Nine Square, Opp.',
    'ITC Narmada, Keshavbaug, Vastrapur,',
    'Ahmedabad, India - 380015',
    'PH: 987654321',
    'GSTIN: 567 3252 20'
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
    font: boldFont,
    color: primaryColor,
  });

  yPosition -= 20;
  page.drawText('XYZ CONSULTANCY PRIVATE LIMITED', {
    x: margin + columnWidth,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: primaryColor,
  });

  yPosition -= 15;
  const billToAddressLines = [
    '2300 N Street,',
    'EW Suite 200 Washington DC',
    '20037, United States',
    'GSTIN : 22-2143333'
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
    font: boldFont,
    color: primaryColor,
  });

  page.drawText('QUANTITY', {
    x: tableColumns.quantity,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: primaryColor,
  });

  page.drawText('RATE', {
    x: tableColumns.rate,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: primaryColor,
  });

  page.drawText('HSN/SAC', {
    x: tableColumns.hsn,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: primaryColor,
  });

  page.drawText('TOTAL', {
    x: tableColumns.total,
    y: yPosition,
    size: 10,
    font: boldFont,
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

  // Table Rows
  const lineItems = [
    { description: 'Security Consultation', quantity: '2', rate: '₹100', hsn: '998511', total: '₹20,000' },
    { description: 'Server Support', quantity: '1', rate: '₹50', hsn: '998313', total: '₹15,000' },
    { description: 'Security Audit', quantity: '3', rate: '₹100', hsn: '998511', total: '₹10,000' },
    { description: 'VAPT', quantity: '2', rate: '₹100', hsn: '998313', total: '₹15,700' },
    { description: 'SOC Support', quantity: '4', rate: '₹100', hsn: '998313', total: '₹40,000' }
  ];

  lineItems.forEach(item => {
    page.drawText(item.description, {
      x: tableColumns.description,
      y: yPosition,
      size: 9,
      font: font,
      color: primaryColor,
    });

    page.drawText(item.quantity, {
      x: tableColumns.quantity,
      y: yPosition,
      size: 9,
      font: font,
      color: primaryColor,
    });

    page.drawText(item.rate, {
      x: tableColumns.rate,
      y: yPosition,
      size: 9,
      font: font,
      color: primaryColor,
    });

    page.drawText(item.hsn, {
      x: tableColumns.hsn,
      y: yPosition,
      size: 9,
      font: font,
      color: primaryColor,
    });

    page.drawText(item.total, {
      x: tableColumns.total,
      y: yPosition,
      size: 9,
      font: font,
      color: primaryColor,
    });

    yPosition -= 20;
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

  page.drawText('₹1,14,450', {
    x: totalsX + 80,
    y: yPosition,
    size: 10,
    font: font,
    color: primaryColor,
  });

  yPosition -= 15;

  page.drawText('IGST (18%)', {
    x: totalsX,
    y: yPosition,
    size: 10,
    font: font,
    color: primaryColor,
  });

  page.drawText('₹20,500', {
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
    font: boldFont,
    color: primaryColor,
  });

  page.drawText('₹1,34,950', {
    x: totalsX + 80,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: primaryColor,
  });

  yPosition -= 40;

  // Amount in words
  page.drawText('Amount Chargeable (in words)', {
    x: margin,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: primaryColor,
  });

  yPosition -= 15;
  page.drawText('Indian Rupees One lakh Thirty Four Thousand Nine Hundred Fifty Three Only', {
    x: margin,
    y: yPosition,
    size: 9,
    font: font,
    color: primaryColor,
  });

  yPosition -= 40;

  // Payment Information
  page.drawText('Payment Information', {
    x: margin,
    y: yPosition,
    size: 11,
    font: boldFont,
    color: primaryColor,
  });

  yPosition -= 20;
  const paymentInfo = [
    'Account Name : Keyzotrick Intelligence Private Limited',
    'Bank Name    :',
    'A/c No.      :',
    'Branch & IFS Code :'
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
    font: boldFont,
    color: primaryColor,
  });

  yPosition -= 15;
  const terms = [
    'All payments are made subject to realization of the same',
    'Payment should be done within 07 days from generated invoice date',
    'Cheque return charges should be ₹500'
  ];

  terms.forEach(line => {
    page.drawText(line, {
      x: margin,
      y: yPosition,
      size: 9,
      font: font,
      color: primaryColor,
    });
    yPosition -= 12;
  });

  yPosition -= 30;

  // Footer
  page.drawText('Thank you for choosing our Business', {
    x: width / 2 - 100,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: accentColor,
  });

  return await pdfDoc.save();
}