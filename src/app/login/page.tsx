
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { getDoc, doc } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
          throw new Error("User data not found.");
      }
      
      const userData = userDoc.data();

      // Check for forced verification by admin
      if (userData.emailVerified === false) {
          if (user.emailVerified === false) {
            // Send a new verification email just in case
            await sendEmailVerification(user);
            // Redirect to the verification page
            router.push(`/verify-email?email=${email}`);
            toast({
                title: "Verification Required",
                description: "An admin has required you to verify your account. Please check your email to verify before logging in.",
            });
            return;
          } else {
            // User has verified through Firebase, but admin hasn't re-enabled them yet.
            // For now, let's let them in if they've done their part. 
            // A more strict system could keep them out until admin re-enables.
          }
      }


      toast({
        title: "Login Successful!",
        description: "Welcome back.",
      });

      if (userData?.role === 'admin') {
        router.push('/admin');
      } else if (userData?.role === 'marketer') {
        router.push('/marketing/dashboard');
      } else {
        router.push('/dashboard');
      }

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

  const handlePasswordReset = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter your email address above to reset your password.",
      });
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Password Reset Email Sent",
        description: "Check your email inbox (and spam folder) for a link to reset your password.",
      });
    } catch (error: any) {
       console.error("Error sending password reset email:", error);
       toast({
            variant: "destructive",
            title: "Error",
            description: "Could not send password reset email. Please ensure the email address is correct and try again.",
        });
    } finally {
        setIsLoading(false);
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
              <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Signing In...' : 'Sign in'}</Button>
            <div className="text-sm text-center w-full">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="underline">
                Sign up
              </Link>
            </div>
             <Button variant="link" size="sm" type="button" onClick={handlePasswordReset} disabled={isLoading} className="text-muted-foreground">
                Forgot Password?
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
