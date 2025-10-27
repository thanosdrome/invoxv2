
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestPDFAccess() {
  const [pdfFiles, setPdfFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const listPDFs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/list-pdfs');
      const data = await res.json();
      setPdfFiles(data.files || []);
    } catch (error) {
      console.error('Failed to list PDFs:', error);
    } finally {
      setLoading(false);
    }
  };

  const testDirectAccess = (filename: string) => {
    window.open(`/pdfs/${filename}`, '_blank');
  };

  const testAPIAccess = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/pdf/${invoiceId}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        alert('API access failed');
      }
    } catch (error) {
      alert('Error: ' + error);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>PDF Access Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={listPDFs} disabled={loading}>
            {loading ? 'Loading...' : 'List All PDFs'}
          </Button>

          {pdfFiles.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Available PDFs:</h3>
              {pdfFiles.map((file) => (
                <div key={file} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{file}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testDirectAccess(file)}
                  >
                    Open
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Quick Tests:</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={() => window.open('/pdfs/test-pdf.pdf', '_blank')}
              >
                Test Direct URL Access
              </Button>
              <Button
                variant="outline"
                onClick={() => testAPIAccess('test-invoice-id')}
              >
                Test API Access
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}