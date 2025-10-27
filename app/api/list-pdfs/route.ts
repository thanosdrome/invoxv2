
// ====================================
// API Route to list PDFs
// app/api/list-pdfs/route.ts
// ====================================

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const pdfsDir = path.join(process.cwd(), 'public', 'pdfs');
    
    if (!fs.existsSync(pdfsDir)) {
      return NextResponse.json({ files: [], message: 'Directory does not exist' });
    }
    
    const files = fs.readdirSync(pdfsDir).filter(file => file.endsWith('.pdf'));
    
    const fileDetails = files.map(file => {
      const filepath = path.join(pdfsDir, file);
      const stats = fs.statSync(filepath);
      return {
        name: file,
        size: stats.size,
        created: stats.birthtime,
        url: `/pdfs/${file}`,
      };
    });
    
    return NextResponse.json({
      files: fileDetails,
      directory: pdfsDir,
      count: files.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}