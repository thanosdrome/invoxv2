// ====================================
// app/(dashboard)/dashboard/page.tsx
// ====================================
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, FilePlus, FileCheck, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    signed: 0,
    recent: [],
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
  const res = await fetch('/api/invoices', { credentials: 'same-origin' });
      const data = await res.json();
      
      if (res.ok) {
        const invoices = data.invoices || [];
        setStats({
          total: invoices.length,
          draft: invoices.filter((i: any) => i.status === 'draft').length,
          signed: invoices.filter((i: any) => i.status === 'signed').length,
          recent: invoices.slice(0, 5),
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome to your invoice management system</p>
        </div>
        <Button onClick={() => router.push('/invoices/new')}>
          <FilePlus className="h-4 w-4 mr-2" />
          New Invoice
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className='shadow-sm'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card className='shadow-sm'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Invoices</CardTitle>
            <FilePlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
            <p className="text-xs text-muted-foreground">Pending signature</p>
          </CardContent>
        </Card>

        <Card className='shadow-sm'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signed Invoices</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.signed}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>

        <Card className='shadow-sm'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signature Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total > 0 ? Math.round((stats.signed / stats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Signed vs Total</p>
          </CardContent>
        </Card>
      </div>

      <Card className='shadow-sm'>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>Your latest invoice activity</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No invoices yet. Create your first invoice to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {stats.recent.map((invoice: any) => (
                <div
                  key={invoice._id}
                  className="flex items-center justify-between p-4 shadow-sm rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/invoices/${invoice._id}`)}
                >
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-gray-500">{invoice.clientName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${invoice.grandTotal.toFixed(2)}</p>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        invoice.status === 'signed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}