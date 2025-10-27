// ====================================
// components/sign-invoice-dialog.tsx
// WebAuthn Invoice Signing Dialog
// ====================================
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { authenticateWebAuthn } from '@/lib/webauthn-client';
import { 
  Fingerprint, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Shield,
  FileSignature 
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SignInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

type SigningStep = 'confirm' | 'authenticating' | 'success' | 'error';

export default function SignInvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  onSuccess,
  onError,
}: SignInvoiceDialogProps) {
  const [step, setStep] = useState<SigningStep>('confirm');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSign = async () => {
    setLoading(true);
    setStep('authenticating');
    setError('');

    try {
      // Step 1: Initialize signing
      const initRes = await fetch(`/api/invoices/${invoiceId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'init' }),
      });

      const initData = await initRes.json();

      if (!initRes.ok) {
        throw new Error(initData.error || 'Failed to initiate signing');
      }

      // Step 2: WebAuthn authentication
      let credential;
      try {
        credential = await authenticateWebAuthn(initData.options);
      } catch (webauthnError: any) {
        throw new Error(
          webauthnError.message || 'WebAuthn authentication failed. Please try again.'
        );
      }

      // Step 3: Verify and complete signing
      const verifyRes = await fetch(`/api/invoices/${invoiceId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'verify',
          signatureId: initData.signatureId,
          credential,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Signature verification failed');
      }

      // Success!
      setStep('success');
      
      // Call success callback after a short delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
        handleClose();
      }, 2000);
    } catch (err: any) {
      console.error('Signing error:', err);
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      setStep('error');
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setStep('confirm');
      setError('');
      onOpenChange(false);
    }
  };

  const handleRetry = () => {
    setStep('confirm');
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Sign Invoice
          </DialogTitle>
          <DialogDescription>
            Invoice: <span className="font-medium">{invoiceNumber}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Confirm Step */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-6">
                  <Shield className="h-12 w-12 text-primary" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">Ready to Sign</h3>
                <p className="text-sm text-muted-foreground">
                  You are about to digitally sign this invoice using WebAuthn authentication.
                  This action cannot be undone.
                </p>
              </div>
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Your signature will be cryptographically verified and permanently recorded
                  with a timestamp. A signed PDF will be generated automatically.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Authenticating Step */}
          {step === 'authenticating' && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-6">
                  <Fingerprint className="h-12 w-12 text-primary animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Authenticating...</h3>
                <p className="text-sm text-muted-foreground">
                  Please authenticate using your security key or biometric
                </p>
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mt-4" />
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 p-6">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-green-900">
                  Invoice Signed Successfully!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your digital signature has been verified and the invoice has been marked as
                  signed. A PDF has been generated.
                </p>
              </div>
            </div>
          )}

          {/* Error Step */}
          {step === 'error' && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-red-100 p-6">
                  <AlertCircle className="h-12 w-12 text-red-600" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-red-900">Signing Failed</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {error.includes('WebAuthn') || error.includes('authentication')
                    ? 'Please ensure your security key is connected or biometric sensor is working properly.'
                    : 'Please try again. If the problem persists, contact support.'}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {step === 'confirm' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSign}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Fingerprint className="mr-2 h-4 w-4" />
                    Sign with WebAuthn
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'authenticating' && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="w-full"
            >
              Cancel
            </Button>
          )}

          {step === 'success' && (
            <Button
              type="button"
              onClick={handleClose}
              className="w-full"
            >
              Close
            </Button>
          )}

          {step === 'error' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleRetry}
                className="w-full sm:w-auto"
              >
                Try Again
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}