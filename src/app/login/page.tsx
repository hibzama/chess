
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailForResend, setEmailForResend] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const target = e.target as typeof e.target & {
        email: { value: string };
        password: { value: string };
    };
    
    const email = target.email.value;
    const password = target.password.value;
    setEmailForResend(email); // Store email for the resend button

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      if (!userCredential.user.emailVerified) {
        await auth.signOut(); // Sign out the user
        toast({
          variant: "destructive",
          title: "Email Not Verified",
          description: "Please check your inbox and verify your email address before logging in. You can use the link below to resend it.",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Login Successful!",
        description: "Welcome back.",
      });
      router.push('/dashboard');
    } catch (error: any) {
        console.error("Error signing in:", error);
        let errorMessage = "An unknown error occurred.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = "Invalid email or password. Please try again.";
        } else if (error.message) {
            errorMessage = error.message;
        }
        toast({
            variant: "destructive",
            title: "Login failed",
            description: errorMessage,
        });
    } finally {
        setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!emailForResend) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please enter your email in the form first.' });
        return;
    }
    try {
        // This is a bit of a workaround since we can't get the current user object without logging in.
        // We simulate a login to get the user object, send the email, then sign them out.
        const userCredential = await signInWithEmailAndPassword(auth, emailForResend, 'any-dummy-password-will-work-here').catch(() => {
            // If login fails, it might be because the user is not found, which is fine. We try to get the user if they exist.
            if(auth.currentUser) return { user: auth.currentUser };
            throw new Error('User not found.');
        });
        
        if (auth.currentUser) {
             await sendEmailVerification(auth.currentUser);
             toast({ title: 'Verification Email Sent', description: 'Please check your inbox.' });
             await auth.signOut();
        } else {
             toast({ variant: 'destructive', title: 'Error', description: 'Could not find a user with that email.' });
        }
    } catch (error: any) {
         if (error.code === 'auth/invalid-credential') {
             if (auth.currentUser) {
                await sendEmailVerification(auth.currentUser);
                toast({ title: 'Verification Email Sent', description: 'Please check your inbox.' });
                await auth.signOut();
                return;
             }
        }
        console.error("Error resending verification email:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not resend verification email.' });
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleLogin}>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>
              Enter your email below to login to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" required onChange={(e) => setEmailForResend(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Signing In...' : 'Sign in'}</Button>
            <div className="text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="underline">
                Sign up
              </Link>
            </div>
             <div className="text-center text-sm">
              <button type="button" onClick={handleResendVerification} className="underline text-muted-foreground">
                Resend verification email
              </button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
