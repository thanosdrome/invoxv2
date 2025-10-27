// ====================================
// app/(dashboard)/invoices/[id]/edit/page.tsx
// Invoice Edit Page
// ====================================
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import InvoiceForm, { InvoiceFormData } from '@/components/invoice-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => {
    if (params.id) {
      fetchInvoice();
    }
  }, [params.id]);

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`/api/invoices/${params.id}`);
      const data = await res.json();
      
      if (res.ok) {
        setInvoice(data.invoice);
      } else {
        setError(data.error || 'Invoice not found');
      }
    } catch (error) {
      console.error('Failed to fetch invoice:', error);
      setError('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: InvoiceFormData) => {
    try {
      const res = await fetch(`/api/invoices/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update invoice');
      }

      alert('Invoice updated successfully!');
      router.push(`/invoices/${params.id}`);
    } catch (error: any) {
      alert(error.message || 'Failed to update invoice');
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Invoice not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (invoice.status === 'signed') {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Cannot edit a signed invoice. Signed invoices are locked for compliance.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Edit Invoice</h1>
        <p className="text-gray-500 mt-1">
          Editing: {invoice.invoiceNumber}
        </p>
      </div>

      <InvoiceForm
        initialData={{
          clientName: invoice.clientName,
          clientEmail: invoice.clientEmail,
          clientAddress: invoice.clientAddress,
          lineItems: invoice.lineItems,
          tax: invoice.tax,
          discount: invoice.discount,
        }}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/invoices/${params.id}`)}
        submitLabel="Update Invoice"
        isEdit={true}
      />
    </div>
  );
}