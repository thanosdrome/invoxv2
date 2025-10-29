// ====================================
// app/(dashboard)/invoices/new/page.tsx
// Use shared InvoiceFormEnhanced component so GST/HSN/tax logic stays consistent
// ====================================
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import InvoiceFormEnhanced, { InvoiceFormData } from '@/components/invoice-form';

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: InvoiceFormData) => {
    setLoading(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create invoice');

      router.push(`/invoices/${json.invoice._id}`);
    } catch (err) {
      console.error('Create invoice failed', err);
      // surface to user via alert for now
      alert((err as Error).message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Invoice</h1>
        <p className="text-gray-500 mt-1">Fill in the details below to create a new invoice</p>
      </div>

      <InvoiceFormEnhanced onSubmit={handleSubmit} submitLabel={loading ? 'Creating...' : 'Create Invoice'} />
    </div>
  );
}
