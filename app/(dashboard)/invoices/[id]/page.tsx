// ====================================
// Updated: app/(dashboard)/invoices/[id]/page.tsx
// Add Edit & Delete buttons to Invoice Detail
// ====================================
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import DeleteInvoiceDialog from '@/components/delete-invoice-dialog';
import {
  Download,
  FileSignature,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Edit,
  Trash2,
  MoreVertical,
} from 'lucide-react';

export default function InvoiceDetailPageWithActions() {
  const router = useRouter();
  const params = useParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');

  useEffect(() => {
    if (params.id) {
      fetchInvoice();
      checkUserRole();
    }
  }, [params.id]);

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`/api/invoices/${params.id}`);
      const data = await res.json();
      
      if (res.ok) {
        setInvoice(data.invoice);
      }
    } catch (error) {
      console.error('Failed to fetch invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserRole = async () => {
    try {
      const res = await fetch('/api/user/profile');
      const data = await res.json();
      if (res.ok) {
        setUserRole(data.user.role);
      }
    } catch (error) {
      console.error('Failed to check user role:', error);
    }
  };

  const handleEdit = () => {
    router.push(`/invoices/${params.id}/edit`);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    router.push('/invoices');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return <div className="text-center py-12">Invoice not found</div>;
  }

  const canEdit = invoice.status === 'draft';
  const canDelete = userRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/invoices')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
          <p className="text-gray-500 mt-1">
            Created on {new Date(invoice.createdAt).toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Primary Actions */}
          {invoice.status === 'draft' && (
            <>
              <Button
                variant="outline"
                onClick={handleEdit}
                disabled={!canEdit}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button onClick={() => {/* handleSign */}}>
                <FileSignature className="h-4 w-4 mr-2" />
                Sign Invoice
              </Button>
            </>
          )}
          
          {invoice.status === 'signed' && invoice.pdfUrl && (
            <>
              <Button variant="outline" onClick={() => window.open(invoice.pdfUrl, '_blank')}>
                View PDF
              </Button>
              <Button variant="outline" onClick={() => {/* handleDownloadPDF */}}>
                <Download className="h-4 w-4 mr-2"  />
                Download PDF
              </Button>
            </>
          )}

          {/* More Actions Menu */}
          {(canEdit || canDelete) && (<>
            <Button onClick={handleEdit}  variant="outline">
              Edit Invoice
            </Button>
          
            <Button onClick={handleDelete}  variant="outline">
              Delete Invoice
            </Button>
          </>
          )}
        </div>
      </div>

      {/* Status Alerts */}
      {invoice.status === 'signed' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-medium text-green-900">Invoice Signed</p>
            <p className="text-sm text-green-700">
              Signed by {invoice.signedBy?.name} on{' '}
              {new Date(invoice.signedAt).toLocaleString()}
            </p>
          </div>
        </Alert>
      )}

      {!canEdit && invoice.status === 'draft' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This invoice is in draft status. Sign it to generate a PDF.
          </AlertDescription>
        </Alert>
      )}

      {/* Client and Invoice Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{invoice.clientName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{invoice.clientEmail}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">{invoice.clientAddress}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <span
                className={`inline-block px-2 py-1 text-xs rounded mt-1 ${
                  invoice.status === 'signed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {invoice.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created By</p>
              <p className="font-medium">{invoice.createdBy?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Invoice Number</p>
              <p className="font-medium">{invoice.invoiceNumber}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-right">Quantity</div>
              <div className="col-span-2 text-right">Rate</div>
              <div className="col-span-2 text-right">Total</div>
            </div>

            {/* Items */}
            {invoice.lineItems.map((item: any, index: number) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 text-sm pb-4 border-b md:border-0"
              >
                <div className="md:col-span-6">
                  <span className="md:hidden text-xs text-muted-foreground">Description: </span>
                  {item.description}
                </div>
                <div className="md:col-span-2 md:text-right">
                  <span className="md:hidden text-xs text-muted-foreground">Qty: </span>
                  {item.quantity}
                </div>
                <div className="md:col-span-2 md:text-right">
                  <span className="md:hidden text-xs text-muted-foreground">Rate: </span>
                  ${item.rate.toFixed(2)}
                </div>
                <div className="md:col-span-2 md:text-right font-medium">
                  <span className="md:hidden text-xs text-muted-foreground">Total: </span>
                  ${item.total.toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax</span>
              <span>${invoice.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Discount</span>
              <span>-${invoice.discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Grand Total</span>
              <span className="text-primary">${invoice.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <DeleteInvoiceDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        invoiceId={invoice._id}
        invoiceNumber={invoice.invoiceNumber}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}