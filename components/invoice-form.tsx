// ====================================
// components/invoice-form.tsx - UPDATED
// Enhanced Form with GST Features
// ====================================
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Trash2, Loader2 } from 'lucide-react';

export interface LineItem {
  description: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  total: number;
}

export interface InvoiceFormData {
  invoiceNumber: string;
  orderReferenceNumber?: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  clientGSTNumber?: string;
  lineItems: LineItem[];
  taxType: 'IGST' | 'CGST_SGST';
  discount: number;
}

interface InvoiceFormProps {
  initialData?: Partial<InvoiceFormData>;
  onSubmit: (data: InvoiceFormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  isEdit?: boolean;
}

export default function InvoiceFormEnhanced({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Create Invoice',
  isEdit = false,
}: InvoiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoiceNumber: initialData?.invoiceNumber || '',
    orderReferenceNumber: initialData?.orderReferenceNumber || '',
    clientName: initialData?.clientName || '',
    clientEmail: initialData?.clientEmail || '',
    clientAddress: initialData?.clientAddress || '',
    clientGSTNumber: initialData?.clientGSTNumber || '',
    lineItems: initialData?.lineItems || [
      { description: '', hsnCode: '', quantity: 1, rate: 0, total: 0 },
    ],
    taxType: initialData?.taxType || 'IGST',
    discount: initialData?.discount || 0,
  });

  const addLineItem = () => {
    setFormData({
      ...formData,
      lineItems: [
        ...formData.lineItems,
        { description: '', hsnCode: '', quantity: 1, rate: 0, total: 0 },
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

    if (field === 'quantity' || field === 'rate') {
      items[index].total = items[index].quantity * items[index].rate;
    }

    setFormData({ ...formData, lineItems: items });
  };

  const calculateSubtotal = (): number => {
    return formData.lineItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTax = (): { igst: number; cgst: number; sgst: number; total: number } => {
    const subtotal = calculateSubtotal();
    
    if (formData.taxType === 'IGST') {
      const igst = subtotal * 0.18; // 18% IGST
      return { igst, cgst: 0, sgst: 0, total: igst };
    } else {
      const cgst = subtotal * 0.09; // 9% CGST
      const sgst = subtotal * 0.09; // 9% SGST
      return { igst: 0, cgst, sgst, total: cgst + sgst };
    }
  };

  const calculateGrandTotal = (): number => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    return subtotal + tax.total ;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    // if (!formData.invoiceNumber) {
    //   alert('Invoice number is required');
    //   return;
    // }

    if (formData.lineItems.some((item) => !item.description || !item.hsnCode || item.quantity <= 0)) {
      alert('Please fill in all line items with valid values including HSN codes');
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

  const tax = calculateTax();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Invoice Details */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">
                Invoice Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="invoiceNumber"
                placeholder={initialData?.invoiceNumber}
                value={initialData?.invoiceNumber}
                onChange={(e) =>
                  setFormData({ ...formData, invoiceNumber: e.target.value })
                }
                required
                disabled={loading || isEdit}
              />
              {isEdit && (
                <p className="text-xs text-muted-foreground">
                  Invoice number cannot be changed after creation
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderReference">Order/PO Reference</Label>
              <Input
                id="orderReference"
                placeholder="PO-2024-123"
                value={formData.orderReferenceNumber}
                onChange={(e) =>
                  setFormData({ ...formData, orderReferenceNumber: e.target.value })
                }
                disabled={loading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

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

          <div className="space-y-2">
            <Label htmlFor="clientGST">Client GST Number</Label>
            <Input
              id="clientGST"
              placeholder="22AAAAA0000A1Z5"
              value={formData.clientGSTNumber}
              onChange={(e) =>
                setFormData({ ...formData, clientGSTNumber: e.target.value.toUpperCase() })
              }
              disabled={loading}
              maxLength={15}
            />
            <p className="text-xs text-muted-foreground">
              15-character GST Identification Number (optional)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Line Items with HSN */}
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
          {/* Header Row */}
          <div className="hidden lg:grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
            <div className="col-span-4">Description</div>
            <div className="col-span-2">HSN/SAC Code</div>
            <div className="col-span-2 text-right">Quantity</div>
            <div className="col-span-2 text-right">Rate (₹)</div>
            <div className="col-span-1 text-right">Total (₹)</div>
            <div className="col-span-1"></div>
          </div>

          {/* Line Items */}
          {formData.lineItems.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end pb-4 border-b lg:border-0"
            >
              <div className="lg:col-span-4 space-y-2">
                <Label className="lg:hidden">Description</Label>
                <Input
                  placeholder="Product/Service description"
                  value={item.description}
                  onChange={(e) =>
                    updateLineItem(index, 'description', e.target.value)
                  }
                  required
                  disabled={loading}
                />
              </div>

                <div className="lg:col-span-2 space-y-0">
                <Label className="lg:hidden">HSN/SAC Code</Label>
                <Input
                  list={`hsn-options-${index}`}
                  placeholder="9954"
                  value={item.hsnCode}
                  onChange={(e) =>
                  updateLineItem(index, 'hsnCode', e.target.value)
                  }
                  required
                  disabled={loading}
                />
                <datalist id={`hsn-options-${index}`}>
                  <option value="998313" />
                  <option value="852380" />
                </datalist>
                </div>

              <div className="lg:col-span-2 space-y-2">
                <Label className="lg:hidden">Quantity</Label>
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
                  className="lg:text-right"
                />
              </div>

              <div className="lg:col-span-2 space-y-2">
                <Label className="lg:hidden">Rate (₹)</Label>
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
                  className="lg:text-right"
                />
              </div>

              <div className="lg:col-span-1 space-y-2">
                <Label className="lg:hidden">Total (₹)</Label>
                <Input
                  value={item.total.toFixed(2)}
                  disabled
                  className="bg-muted lg:text-right font-medium"
                />
              </div>

              <div className="lg:col-span-1 flex lg:justify-end">
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

      {/* Tax Calculation */}
      <Card>
        <CardHeader>
          <CardTitle>Tax & Totals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tax Type Selection */}
          <div className="space-y-3">
            <Label>Tax Type <span className="text-red-500">*</span></Label>
            <RadioGroup
              value={formData.taxType}
              onValueChange={(value: 'IGST' | 'CGST_SGST') =>
                setFormData({ ...formData, taxType: value })
              }
              disabled={loading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="IGST" id="igst" />
                <Label htmlFor="igst" className="font-normal cursor-pointer">
                  IGST @ 18% (Inter-state supply)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="CGST_SGST" id="cgst_sgst" />
                <Label htmlFor="cgst_sgst" className="font-normal cursor-pointer">
                  CGST @ 9% + SGST @ 9% (Intra-state supply)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Discount */}
          {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount">Discount (₹)</Label>
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
          </div> */}

          {/* Totals Breakdown */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">₹{calculateSubtotal().toFixed(2)}</span>
            </div>

            {formData.taxType === 'IGST' ? (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IGST @ 18%:</span>
                <span className="font-medium">+₹{tax.igst.toFixed(2)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">CGST @ 9%:</span>
                  <span className="font-medium">+₹{tax.cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">SGST @ 9%:</span>
                  <span className="font-medium">+₹{tax.sgst.toFixed(2)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Tax:</span>
              <span className="font-medium">+₹{tax.total.toFixed(2)}</span>
            </div>


            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Grand Total:</span>
              <span className="text-primary">₹{calculateGrandTotal().toFixed(2)}</span>
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