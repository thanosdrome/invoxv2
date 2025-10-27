// ====================================
// app/api/settings/route.ts
// Settings API Endpoint
// ====================================
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import Setting from '@/models/Setting';
import { createLog } from '@/utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const settingsSchema = z.object({
  companyName: z.string().min(2),
  companyAddress: z.string().min(5),
  companyEmail: z.string().email(),
  companyPhone: z.string().min(5),
  logoUrl: z.string().optional(),
  invoicePrefix: z.string().min(1).max(10),
  taxRate: z.number().min(0).max(100),
  termsText: z.string().min(10),
});

function getUserFromToken(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  if (!token) throw new Error('Unauthorized');
  return jwt.verify(token, JWT_SECRET) as any;
}

// GET - Get settings
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    getUserFromToken(req); // Verify authentication
    
    let settings = await Setting.findOne();
    
    if (!settings) {
      // Create default settings
      settings = await Setting.create({
        companyName: 'Your Company',
        companyAddress: '123 Business Street, City, State 12345',
        companyEmail: 'contact@company.com',
        companyPhone: '(555) 123-4567',
        invoicePrefix: 'INV',
        taxRate: 0,
        termsText: 'Payment due within 30 days.',
      });
    }
    
    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// PUT - Update settings (admin only)
export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const user = getUserFromToken(req);
    
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const body = await req.json();
    const data = settingsSchema.parse(body);
    
    let settings = await Setting.findOne();
    
    if (settings) {
      settings = await Setting.findByIdAndUpdate(settings._id, data, { new: true });
    } else {
      settings = await Setting.create(data);
    }
    
    await createLog({
      userId: user.userId,
      action: 'SETTINGS_UPDATED',
      entity: 'settings',
      entityId: settings._id.toString(),
      description: 'Company settings updated',
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
    });
    
    return NextResponse.json({ settings });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}