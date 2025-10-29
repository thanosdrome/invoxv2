// ====================================
// app/(auth)/login/page.tsx
// Login Page with WebAuthn Authentication
// ====================================
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authenticateWebAuthn } from '@/lib/webauthn-client';
import {
  Fingerprint,
  Loader2,
  LogIn,
  Shield,
  AlertCircle,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import Image from 'next/image';

type LoginStep = 'email' | 'webauthn' | 'success' | 'error';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Step 1: Get WebAuthn challenge
      const initRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'init', email }),
        credentials: 'same-origin',
      });

      const initData = await initRes.json();

      if (!initRes.ok) {
        throw new Error(initData.error || 'Login failed');
      }

      setStep('webauthn');

      // Step 2: WebAuthn authentication
      let credential;
      try {
        credential = await authenticateWebAuthn(initData.options);
      } catch (webauthnError: any) {
        throw new Error(
          'WebAuthn authentication failed. Please try again or check your security key.'
        );
      }

      // Step 3: Verify credential
      const verifyRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'verify',
          userId: initData.userId,
          credential,
        }),
        credentials: 'same-origin',
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Verification failed');
      }

      // Success!
      setStep('success');
      
      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
      
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('email');
    setError('');
    setEmail('');
  };

  // Clear stale/invalid cookie when middleware redirected with ?clear=1
  useEffect(() => {
    try {
      const shouldClear = searchParams?.get('clear') === '1';
      if (shouldClear) {
        // call logout endpoint to ensure cookie is cleared server-side
        fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
          .then(() => {
            // optionally we could show a notice to the user, but keep it silent
            console.log('Cleared stale auth cookie');
          })
          .catch((err) => console.error('Failed to clear cookie:', err));
      }
    } catch (e) {
      // ignore
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Image src="/logo.svg" alt="KIPL Logo" width={250} height={40} />
            </div>
          </div>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>
              {step === 'email' && 'Enter your email to continue'}
              {step === 'webauthn' && 'Authenticate with WebAuthn'}
              {step === 'success' && 'Login successful!'}
              {step === 'error' && 'Login failed'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Email Step */}
            {step === 'email' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    disabled={loading}
                    className="h-11"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full h-11 bg-[#0070b2] text-white cursor-pointer" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Continue with WebAuthn
                    </>
                  )}
                </Button>

              </form>
            )}

            {/* WebAuthn Step */}
            {step === 'webauthn' && (
              <div className="space-y-6 py-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-primary/10 p-8">
                    <Fingerprint className="h-16 w-16 text-primary animate-pulse" />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">Authenticate with WebAuthn</h3>
                  <p className="text-sm text-muted-foreground">
                    Use your security key, fingerprint, or Face ID to login
                  </p>
                </div>

                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Follow your browser's instructions to complete authentication.
                    This may include inserting your security key or using biometric authentication.
                  </AlertDescription>
                </Alert>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleReset}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Success Step */}
            {step === 'success' && (
              <div className="space-y-6 py-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-green-100 p-8">
                    <CheckCircle2 className="h-16 w-16 text-green-600" />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold text-green-900">
                    Login Successful!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Redirecting to your dashboard...
                  </p>
                </div>

                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                </div>
              </div>
            )}

            {/* Error Step */}
            {step === 'error' && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium">Troubleshooting tips:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Make sure you're using the correct email address</li>
                    <li>Ensure your security key is properly connected</li>
                    <li>Check that WebAuthn is enabled in your browser</li>
                    <li>Try a different browser if the issue persists</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleReset}
                  >
                    Try Again
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => setStep('email')}
                  >
                    Use Different Email
                  </Button>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            {step === 'email' && (
              <>
                <div className="text-sm text-center text-muted-foreground w-full">
                  Don't have an account?{' '}
                  <Link
                    href="/register"
                    className="text-primary font-medium hover:underline"
                  >
                    Register
                  </Link>
                </div>

              </>
            )}
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}