// ====================================
// components/delete-invoice-dialog.tsx
// Delete Confirmation Dialog
// ====================================
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  onSuccess?: () => void;
}

export default function DeleteInvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  onSuccess,
}: DeleteInvoiceDialogProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    setError('');

    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete invoice');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/invoices');
      }
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('Delete error:', error);
      setError(error.message || 'Failed to delete invoice');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white shadow-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Invoice
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete invoice{' '}
            <span className="font-medium">{invoiceNumber}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">This action cannot be undone!</p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li>Invoice will be permanently deleted</li>
                <li>Associated PDF will be removed</li>
                <li>All signature data will be deleted</li>
                <li>This action is logged for audit purposes</li>
              </ul>
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
            className="w-full sm:w-auto"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Invoice
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}