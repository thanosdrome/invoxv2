// components/signature-upload.tsx
// Digital Signature Upload Component
// ====================================
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, Check, Loader2, FileImage } from 'lucide-react';
import Image from 'next/image';

interface SignatureUploadProps {
  currentSignatureUrl?: string | null;
  onUploadSuccess?: (url: string) => void;
}

export default function SignatureUpload({
  currentSignatureUrl,
  onUploadSuccess,
}: SignatureUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentSignatureUrl || null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, or JPEG)');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    await uploadSignature(file);
  };

  const uploadSignature = async (file: File) => {
    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('signature', file);

      const res = await fetch('/api/user/signature', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setSuccess('Signature uploaded successfully!');
      if (onUploadSuccess) {
        onUploadSuccess(data.signatureUrl);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to upload signature');
      setPreview(currentSignatureUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError('');
    setSuccess('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileImage className="h-5 w-5" />
          Digital Signature
        </CardTitle>
        <CardDescription>
          Upload an image of your signature for use in signed invoices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Preview */}
        {preview ? (
          <div className="space-y-3">
            <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="flex justify-center">
                <div className="relative max-w-sm max-h-32">
                  <img
                    src={preview}
                    alt="Signature preview"
                    className="max-h-32 object-contain"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleRemove}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1"
              >
                Change Signature
              </Button>
            </div>
          </div>
        ) : (
          // Upload area
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-full bg-primary/10 p-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Click to upload signature</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG or JPEG (max 2MB)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />

        {uploading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Uploading signature...</span>
          </div>
        )}

        {/* Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Signature Guidelines:
          </h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Use a clear, high-contrast image on white background</li>
            <li>• Sign on white paper and scan/photograph it</li>
            <li>• Crop to remove excess white space</li>
            <li>• Image should be landscape orientation</li>
            <li>• File size must be less than 2MB</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}