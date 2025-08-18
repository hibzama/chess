
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import React, { useState } from "react";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

export default function RegisterPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const target = e.target as typeof e.target & {
            email: { value: string };
            password: { value: string };
            'confirm-password': { value: string };
        };

        const email = target.email.value;
        const password = target.password.value;
        const confirmPassword = target['confirm-password'].value;

        if (password !== confirmPassword) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Passwords do not match.",
            });
            setIsLoading(false);
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(userCredential.user);
            
            toast({
                title: "Account Created!",
                description: "A verification link has been sent to your email. Please verify before logging in.",
            });

            // Redirect to a page that tells the user to check their email
            router.push(`/verify-email?email=${email}`);

        } catch (error: any) {
            console.error("Error signing up:", error);
            let errorMessage = "An unknown error occurred.";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "This email address is already in use.";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "The password is too weak. Please choose a stronger password.";
            } else if (error.message) {
                errorMessage = error.message;
            }
            toast({
                variant: "destructive",
                title: "Registration failed",
                description: errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-sm">
                <form onSubmit={handleRegister}>
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Create an Account</CardTitle>
                        <CardDescription>
                            Enter your email and password to sign up.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" placeholder="m@example.com" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirm-password">Confirm Password</Label>
                            <Input id="confirm-password" type="password" required />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <p className="text-xs text-muted-foreground px-6 text-center">
                            By creating an account, you agree to our{' '}
                            <Link href="/terms" className="underline hover:text-primary">
                                Terms & Conditions
                            </Link>
                            .
                        </p>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Creating Account...' : 'Create an account'}
                        </Button>
                        <div className="text-center text-sm">
                            Already have an account?{" "}
                            <Link href="/login" className="underline">
                                Sign in
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

    