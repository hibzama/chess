
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { getAuth, sendEmailVerification, signInWithEmailAndPassword } from "firebase/auth";
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from "react";
import { MailCheck, MessageSquare } from 'lucide-react';
import Link from 'next/link';

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const [isSending, setIsSending] = useState(false);
    
    const email = searchParams.get('email');

    const handleResend = async () => {
        if (!email) {
            toast({ variant: 'destructive', title: 'Error', description: 'No email address found.' });
            return;
        }
        setIsSending(true);
        try {
            // Re-authenticate user silently is not possible without password,
            // so we send them back to login to re-trigger auth state.
            // A more direct approach needs a currently signed-in user object.
            // We can't get that here, so we prompt the user to try logging in again,
            // which would trigger our verification email send logic.
            // Best immediate action is to find the user object if they exist in auth state.
            const tempAuth = getAuth();
            if (tempAuth.currentUser && tempAuth.currentUser.email === email) {
                 await sendEmailVerification(tempAuth.currentUser);
                 toast({ title: 'Verification Email Sent', description: 'Please check your inbox.' });
            } else {
                 toast({ title: 'Action Required', description: 'Please try logging in again to trigger a new verification email.' });
                 router.push('/login');
            }

        } catch (error: any) {
            console.error("Error resending verification email:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not resend verification email. Please try logging in again.' });
        } finally {
            setIsSending(false);
        }
    };


    if (!email) {
        return (
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>Invalid Request</CardTitle>
                    <CardDescription>No email was provided. Please go back to the login page.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button asChild className="w-full"><Link href="/login">Go to Login</Link></Button>
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center items-center">
                 <div className="p-3 rounded-full bg-primary/10 mb-4">
                    <MailCheck className="w-10 h-10 text-primary" />
                </div>
                <CardTitle className="text-2xl">Verify Your Email</CardTitle>
                <CardDescription>
                    A verification link has been sent to <span className="font-bold text-primary">{email}</span>. Please check all your email folders (including Primary, Spam, and others) and click the link to activate your account.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button className="w-full" onClick={handleResend} disabled={isSending}>
                    {isSending ? "Sending..." : "Resend Verification Email"}
                </Button>
                <p className="text-xs text-muted-foreground text-center pt-2">
                    If you're having trouble or didn't receive the email, please contact our support team.
                </p>
                 <Button asChild variant="outline" className="w-full">
                    <a href="https://wa.me/+94742974001" target="_blank" rel="noopener noreferrer"><MessageSquare className="mr-2"/> Contact Support on WhatsApp</a>
                </Button>
            </CardContent>
            <CardFooter>
                <Link href="/login" className="w-full text-center text-sm underline">
                    Back to Login
                </Link>
            </CardFooter>
        </Card>
    );
}


export default function VerifyEmailPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Suspense fallback={<div>Loading...</div>}>
                <VerifyEmailContent />
            </Suspense>
        </div>
    )
}
