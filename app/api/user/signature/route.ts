// ====================================
// app/api/user/signature/route.ts - NEW
// Upload Digital Signature Image
// ====================================
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { writeFile } from 'fs/promises';
import path from 'path';
import dbConnect from '@/lib/db';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function getUserFromToken(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  if (!token) throw new Error('Unauthorized');
  return jwt.verify(token, JWT_SECRET) as any;
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const user = getUserFromToken(req);
    
    const formData = await req.formData();
    const file = formData.get('signature') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 2MB' },
        { status: 400 }
      );
    }
    
    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const filename = `signature-${user.userId}-${Date.now()}.${file.type.split('/')[1]}`;
    const filepath = path.join(process.cwd(), 'public', 'signatures', filename);
    
    // Ensure directory exists
    const dir = path.dirname(filepath);
    const fs = require('fs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    await writeFile(filepath, buffer);
    
    const signatureUrl = `/signatures/${filename}`;
    
    // Update user
    await User.findByIdAndUpdate(user.userId, {
      signatureImageUrl: signatureUrl,
    });
    
    return NextResponse.json({
      success: true,
      signatureUrl,
    });
  } catch (error: any) {
    console.error('Upload signature error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Get current signature
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const user = getUserFromToken(req);
    
    const userDoc = await User.findById(user.userId).select('signatureImageUrl');
    
    return NextResponse.json({
      signatureUrl: userDoc?.signatureImageUrl || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
