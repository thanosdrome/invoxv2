// ====================================
// components/invoice-table.tsx
// Reusable Invoice Table Component
// ====================================
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  Download,
  Trash2,
  FileSignature,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  grandTotal: number;
  status: 'draft' | 'signed' | 'cancelled';
  createdAt: string;
  signedAt?: string;
  signedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  pdfUrl?: string;
}

interface InvoiceTableProps {
  invoices: Invoice[];
  loading?: boolean;
  onView?: (invoice: Invoice) => void;
  onSign?: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
  onDownload?: (invoice: Invoice) => void;
  showActions?: boolean;
  emptyMessage?: string;
}

export default function InvoiceTable({
  invoices,
  loading = false,
  onView,
  onSign,
  onDelete,
  onDownload,
  showActions = true,
  emptyMessage = 'No invoices found',
}: InvoiceTableProps) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getStatusBadge = (status: Invoice['status']) => {
    const variants = {
      draft: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
      signed: 'bg-green-100 text-green-800 hover:bg-green-100',
      cancelled: 'bg-red-100 text-red-800 hover:bg-red-100',
    };

    return (
      <Badge variant="secondary" className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleAction = async (
    action: () => void | Promise<void>,
    invoiceId: string
  ) => {
    setActionLoading(invoiceId);
    try {
      await action();
    } finally {
      setActionLoading(null);
    }
  };

  const handleView = (invoice: Invoice) => {
    if (onView) {
      onView(invoice);
    } else {
      router.push(`/invoices/${invoice._id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Created</TableHead>
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow
              key={invoice._id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleView(invoice)}
            >
              <TableCell className="font-medium">
                {invoice.invoiceNumber}
              </TableCell>
              <TableCell>{invoice.clientName}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {invoice.clientEmail}
              </TableCell>
              <TableCell className="text-right font-medium">
                ${invoice.grandTotal.toFixed(2)}
              </TableCell>
              <TableCell>{getStatusBadge(invoice.status)}</TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground">
                {new Date(invoice.createdAt).toLocaleDateString()}
              </TableCell>
              {showActions && (
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleView(invoice)}
                      title="View Invoice"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    {invoice.status === 'draft' && onSign && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleAction(() => onSign(invoice), invoice._id)
                        }
                        disabled={actionLoading === invoice._id}
                        title="Sign Invoice"
                      >
                        {actionLoading === invoice._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileSignature className="h-4 w-4" />
                        )}
                      </Button>
                    )}

                    {invoice.status === 'signed' && invoice.pdfUrl && onDownload && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleAction(() => onDownload(invoice), invoice._id)
                        }
                        disabled={actionLoading === invoice._id}
                        title="Download PDF"
                      >
                        {actionLoading === invoice._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    )}

                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleAction(() => onDelete(invoice), invoice._id)
                        }
                        disabled={actionLoading === invoice._id}
                        className="text-destructive hover:text-destructive"
                        title="Delete Invoice"
                      >
                        {actionLoading === invoice._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
const handleDownloadSimple = (invoice: Invoice) => {
  if (invoice.pdfUrl) {
    // Method 1: Direct link (simplest)
    const link = document.createElement('a');
    link.href = invoice.pdfUrl;
    link.download = `${invoice.invoiceNumber}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};