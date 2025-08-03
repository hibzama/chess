
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { MailCheck } from 'lucide-react';
import Link from 'next/link';

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const email = searchParams.get('email');

    if (!email) {
        // Handle case where email is not in the query params
        router.push('/login');
        return null;
    }

    const handleResend = async () => {
        if (!auth.currentUser) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'You must be logged in to resend a verification email.'
            });
            return;
        }
        try {
            await sendEmailVerification(auth.currentUser);
            toast({
                title: 'Email Sent!',
                description: 'A new verification link has been sent to your email.'
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to send verification email. Please try again.'
            });
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                        <MailCheck className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Verify Your Email</CardTitle>
                    <CardDescription>
                        A verification link has been sent to <span className="font-bold text-primary">{email}</span>. Please check all your email folders (including Primary, Spam, and others) and click the link to activate your account.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button className="w-full" onClick={handleResend}>
                        Resend Verification Email
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
                        <a href="https://wa.me/94742974001" target="_blank" rel="noopener noreferrer">
                            Contact Support on WhatsApp
                        </a>
                    </Button>
                    <Button variant="link" asChild>
                        <Link href="/login">Back to Login</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}


export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyEmailContent />
        </Suspense>
    )
}
