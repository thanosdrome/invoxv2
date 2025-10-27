// ====================================
// app/(dashboard)/diagnostics/page.tsx
// PDF Diagnostic Page
// ====================================
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, TestTube, Download } from 'lucide-react';

interface TestResult {
  label: string;
  passed: boolean;
  details?: string;
}

function TestResult({ label, passed, details }: TestResult) {
  return (
    <div className="flex items-start justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2">
        {passed ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
        <span className="font-medium">{label}</span>
      </div>
      {details && (
        <span className="text-sm text-gray-500 font-mono">{details}</span>
      )}
    </div>
  );
}

export default function DiagnosticsPage() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runDiagnostics = async () => {
    setTesting(true);
    setResults(null);

    try {
      const res = await fetch('/api/test-pdf');
      const data = await res.json();
      setResults(data);
    } catch (error: any) {
      setResults({
        success: false,
        error: error.message,
      });
    } finally {
      setTesting(false);
    }
  };

  const downloadTestPDF = () => {
    window.open('/pdfs/test-pdf.pdf', '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Diagnostics</h1>
        <p className="text-gray-500 mt-1">
          Test PDF generation and file system access
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PDF Generation Test</CardTitle>
          <CardDescription>
            Run diagnostics to verify PDF generation is working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => runDiagnostics} disabled={testing}>
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <TestTube className="mr-2 h-4 w-4" />
                Run Diagnostics
              </>
            )}
          </Button>

          {results && (
            <div className="space-y-4 mt-4">
              <Alert variant={results.success ? 'default' : 'destructive'}>
                {results.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {results.success
                    ? results.message
                    : `Test failed: ${results.error}`}
                </AlertDescription>
              </Alert>

              {results.tests && (
                <div className="space-y-2 border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Test Results:</h3>
                  
                  <TestResult
                    label="Directory Exists"
                    passed={results.tests.directoryExists}
                    details={results.tests.directoryPath}
                  />
                  
                  <TestResult
                    label="Can Write Files"
                    passed={results.tests.canWriteFile}
                  />
                  
                  <TestResult
                    label="Can Generate PDF"
                    passed={results.tests.canGeneratePDF}
                  />
                  
                  <TestResult
                    label="Can Save PDF"
                    passed={results.tests.canSavePDF}
                  />
                  
                  <TestResult
                    label="Can Read PDF"
                    passed={results.tests.canReadPDF}
                    details={`${results.tests.pdfSize} bytes`}
                  />

                  {results.success && (
                    <div className="pt-4 border-t mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadTestPDF}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Test PDF
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {results.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-2">Error Details:</h3>
                  <pre className="text-xs text-red-800 overflow-auto">
                    {results.stack || results.error}
                  </pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold mb-1">1. Check Directory Permissions</h4>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs block">
                mkdir -p public/pdfs && chmod 755 public/pdfs
              </code>
            </div>

            <div>
              <h4 className="font-semibold mb-1">2. Restart Development Server</h4>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs block">
                npm run dev
              </code>
            </div>

            <div>
              <h4 className="font-semibold mb-1">3. Verify Node.js File System Access</h4>
              <p className="text-gray-600 mt-1">
                Ensure your Node.js environment has proper file system permissions
                and that the public directory exists in your project root.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-1">4. Check for Build Issues</h4>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs block">
                npm run build
              </code>
              <p className="text-gray-600 mt-1">
                Run a production build to ensure no build-time errors exist.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-1">5. Verify Dependencies</h4>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs block">
                npm install pdf-lib
              </code>
              <p className="text-gray-600 mt-1">
                Ensure pdf-lib is properly installed in your node_modules.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-1">6. Check Environment Variables</h4>
              <p className="text-gray-600 mt-1">
                Verify that your NODE_ENV is set correctly and that there are no
                conflicting environment configurations.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-1">7. Review Server Logs</h4>
              <p className="text-gray-600 mt-1">
                Check your terminal output for any errors or warnings related to
                file system operations or PDF generation.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-1">8. Clear Next.js Cache</h4>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs block">
                rm -rf .next && npm run dev
              </code>
              <p className="text-gray-600 mt-1">
                Sometimes clearing the Next.js build cache resolves unexpected issues.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Common Issues & Solutions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-blue-900 mb-1">
                Permission Denied Error
              </h4>
              <p className="text-gray-600">
                If you see EACCES or permission errors, your application doesn't have
                write access to the public directory. Run the chmod command above or
                check your system permissions.
              </p>
            </div>

            <div className="border-l-4 border-yellow-500 pl-4">
              <h4 className="font-semibold text-yellow-900 mb-1">
                Module Not Found
              </h4>
              <p className="text-gray-600">
                If pdf-lib is not found, reinstall dependencies with npm install.
                Ensure you're using Node.js version 16 or higher.
              </p>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-semibold text-purple-900 mb-1">
                PDF Not Generating
              </h4>
              <p className="text-gray-600">
                Check that StandardFonts is properly imported from pdf-lib and that
                your PDF document creation logic doesn't have any async/await issues.
              </p>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold text-green-900 mb-1">
                Production Environment
              </h4>
              <p className="text-gray-600">
                In production (Vercel, etc.), file system writes are not supported.
                Consider using cloud storage (S3, Cloudinary) or streaming PDFs
                directly to the client instead of saving to disk.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}