// lib/pdf/taxInvoiceTemplate.ts
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Invoice } from '@/types';

export async function generateTaxInvoice(invoice: any, settings: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Header
  page.drawText(settings.companyName, {
    x: 50,
    y: height - 50,
    size: 20,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  page.drawText('TAX INVOICE', {
    x: width - 150,
    y: height - 50,
    size: 18,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Invoice Details
  let yPosition = height - 100;
  
  page.drawText(`Invoice Number: ${invoice.invoiceNumber}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font: font,
  });

  yPosition -= 20;
  page.drawText(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font: font,
  });

  // Client Details
  yPosition -= 40;
  page.drawText('Bill To:', {
    x: 50,
    y: yPosition,
    size: 14,
    font: boldFont,
  });

  yPosition -= 20;
  page.drawText(invoice.clientName, {
    x: 50,
    y: yPosition,
    size: 12,
    font: font,
  });

  yPosition -= 15;
  page.drawText(invoice.clientEmail, {
    x: 50,
    y: yPosition,
    size: 12,
    font: font,
  });

  yPosition -= 15;
  page.drawText(invoice.clientAddress, {
    x: 50,
    y: yPosition,
    size: 12,
    font: font,
  });

  // Line Items Table
  yPosition -= 40;
  const tableTop = yPosition;
  
  // Table Headers
  page.drawText('Description', { x: 50, y: tableTop, size: 12, font: boldFont });
  page.drawText('Qty', { x: 300, y: tableTop, size: 12, font: boldFont });
  page.drawText('Rate', { x: 350, y: tableTop, size: 12, font: boldFont });
  page.drawText('Total', { x: 450, y: tableTop, size: 12, font: boldFont });

  yPosition = tableTop - 20;
  
  // Table Rows
  invoice.lineItems.forEach((item: any) => {
    page.drawText(item.description, { x: 50, y: yPosition, size: 10, font: font });
    page.drawText(item.quantity.toString(), { x: 300, y: yPosition, size: 10, font: font });
    page.drawText(item.rate.toString(), { x: 350, y: yPosition, size: 10, font: font });
    page.drawText(item.total.toString(), { x: 450, y: yPosition, size: 10, font: font });
    yPosition -= 15;
  });

  // Totals
  yPosition -= 20;
  page.drawText(`Subtotal: ${invoice.currency} ${invoice.subTotal}`, {
    x: 350,
    y: yPosition,
    size: 12,
    font: font,
  });

  yPosition -= 15;
  page.drawText(`Tax: ${invoice.currency} ${invoice.tax}`, {
    x: 350,
    y: yPosition,
    size: 12,
    font: font,
  });

  yPosition -= 15;
  page.drawText(`Grand Total: ${invoice.currency} ${invoice.grandTotal}`, {
    x: 350,
    y: yPosition,
    size: 14,
    font: boldFont,
  });

  // Signature Section if signed
  if (invoice.status === 'SIGNED' && invoice.signedBy) {
    yPosition -= 40;
    page.drawText('Digitally Signed By:', {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
    });

    yPosition -= 15;
    page.drawText(`Signed: ${new Date(invoice.signedAt!).toLocaleString()}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
    });
  }

  return await pdfDoc.save();
}