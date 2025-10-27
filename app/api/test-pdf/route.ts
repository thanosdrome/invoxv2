// ====================================
// app/api/test-pdf/route.ts
// PDF Generation Test Endpoint
// ====================================
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const publicDir = path.join(process.cwd(), 'public', 'pdfs');
    
    // Test 1: Check if directory exists
    const dirExists = fs.existsSync(publicDir);
    
    // Test 2: Try to create directory if it doesn't exist
    if (!dirExists) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Test 3: Try to write a test file
    const testFilePath = path.join(publicDir, 'test.txt');
    fs.writeFileSync(testFilePath, 'Test write successful');
    const testFileExists = fs.existsSync(testFilePath);
    
    // Test 4: Generate a simple PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    page.drawText('Test PDF Generation', {
      x: 50,
      y: 750,
      size: 20,
      font,
      color: rgb(0, 0, 0),
    });
    
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);
    
    // Test 5: Save PDF
    const pdfPath = path.join(publicDir, 'test-pdf.pdf');
    fs.writeFileSync(pdfPath, pdfBuffer);
    const pdfExists = fs.existsSync(pdfPath);
    
    // Test 6: Read PDF back
    const pdfReadBuffer = fs.readFileSync(pdfPath);
    
    // Clean up test files
    if (testFileExists) fs.unlinkSync(testFilePath);
    
    return NextResponse.json({
      success: true,
      tests: {
        directoryExists: dirExists,
        directoryPath: publicDir,
        canWriteFile: testFileExists,
        canGeneratePDF: true,
        canSavePDF: pdfExists,
        canReadPDF: pdfReadBuffer.length > 0,
        pdfSize: pdfReadBuffer.length,
        testPDFPath: '/pdfs/test-pdf.pdf',
      },
      message: 'All tests passed! PDF generation is working correctly.',
    });
    
  } catch (error: any) {
    console.error('PDF test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}