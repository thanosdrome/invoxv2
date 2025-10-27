// components/invoice-form.tsx
// Reusable Invoice Form Component
// ====================================
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Loader2 } from 'lucide-react';

export interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

export interface InvoiceFormData {
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  lineItems: LineItem[];
  tax: number;
  discount: number;
}

interface InvoiceFormProps {
  initialData?: Partial<InvoiceFormData>;
  onSubmit: (data: InvoiceFormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  isEdit?: boolean;
}

export default function InvoiceForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Create Invoice',
  isEdit = false,
}: InvoiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<InvoiceFormData>({
    clientName: initialData?.clientName || '',
    clientEmail: initialData?.clientEmail || '',
    clientAddress: initialData?.clientAddress || '',
    lineItems: initialData?.lineItems || [
      { description: '', quantity: 1, rate: 0, total: 0 },
    ],
    tax: initialData?.tax || 0,
    discount: initialData?.discount || 0,
  });

  const addLineItem = () => {
    setFormData({
      ...formData,
      lineItems: [
        ...formData.lineItems,
        { description: '', quantity: 1, rate: 0, total: 0 },
      ],
    });
  };

  const removeLineItem = (index: number) => {
    if (formData.lineItems.length === 1) {
      alert('Invoice must have at least one line item');
      return;
    }
    const items = formData.lineItems.filter((_, i) => i !== index);
    setFormData({ ...formData, lineItems: items });
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const items = [...formData.lineItems];
    items[index] = { ...items[index], [field]: value };

    // Auto-calculate total when quantity or rate changes
    if (field === 'quantity' || field === 'rate') {
      items[index].total = items[index].quantity * items[index].rate;
    }

    setFormData({ ...formData, lineItems: items });
  };

  const calculateSubtotal = (): number => {
    return formData.lineItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateGrandTotal = (): number => {
    const subtotal = calculateSubtotal();
    return subtotal + formData.tax - formData.discount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.lineItems.some((item) => !item.description || item.quantity <= 0 || item.rate < 0)) {
      alert('Please fill in all line items with valid values');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client Information */}
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">
                Client Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="clientName"
                placeholder="Acme Corporation"
                value={formData.clientName}
                onChange={(e) =>
                  setFormData({ ...formData, clientName: e.target.value })
                }
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientEmail">
                Client Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="clientEmail"
                type="email"
                placeholder="client@example.com"
                value={formData.clientEmail}
                onChange={(e) =>
                  setFormData({ ...formData, clientEmail: e.target.value })
                }
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientAddress">
              Client Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="clientAddress"
              placeholder="123 Business St, City, State 12345"
              value={formData.clientAddress}
              onChange={(e) =>
                setFormData({ ...formData, clientAddress: e.target.value })
              }
              required
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Line Items</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLineItem}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Header Row (Desktop) */}
          <div className="hidden md:grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
            <div className="col-span-5">Description</div>
            <div className="col-span-2 text-right">Quantity</div>
            <div className="col-span-2 text-right">Rate ($)</div>
            <div className="col-span-2 text-right">Total ($)</div>
            <div className="col-span-1"></div>
          </div>

          {/* Line Items */}
          {formData.lineItems.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end pb-4 border-b md:border-0"
            >
              <div className="md:col-span-5 space-y-2">
                <Label className="md:hidden">Description</Label>
                <Input
                  placeholder="Web design services"
                  value={item.description}
                  onChange={(e) =>
                    updateLineItem(index, 'description', e.target.value)
                  }
                  required
                  disabled={loading}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label className="md:hidden">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  value={item.quantity}
                  onChange={(e) =>
                    updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)
                  }
                  required
                  disabled={loading}
                  className="md:text-right"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label className="md:hidden">Rate ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={item.rate}
                  onChange={(e) =>
                    updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)
                  }
                  required
                  disabled={loading}
                  className="md:text-right"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label className="md:hidden">Total ($)</Label>
                <Input
                  value={item.total.toFixed(2)}
                  disabled
                  className="bg-muted md:text-right font-medium"
                />
              </div>

              <div className="md:col-span-1 flex md:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLineItem(index)}
                  disabled={loading || formData.lineItems.length === 1}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader>
          <CardTitle>Calculations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tax">Tax ($)</Label>
              <Input
                id="tax"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.tax}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tax: parseFloat(e.target.value) || 0,
                  })
                }
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Discount ($)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.discount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discount: parseFloat(e.target.value) || 0,
                  })
                }
                disabled={loading}
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax:</span>
              <span className="font-medium">+${formData.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discount:</span>
              <span className="font-medium">-${formData.discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Grand Total:</span>
              <span className="text-primary">${calculateGrandTotal().toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
