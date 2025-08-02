
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { getDoc, doc } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const target = e.target as typeof e.target & {
        email: { value: string };
        password: { value: string };
    };
    
    const email = target.email.value;
    const password = target.password.value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check for Firestore document to get custom claims like emailVerified
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      // --- Email Verification Logic ---
      if (!user.emailVerified && !userData?.emailVerified) { // Check both Firebase Auth and Firestore
        // Define a cutoff date. Users created before this date can log in without verification.
        const verificationCutoffDate = new Date('2024-07-26T00:00:00Z');
        const creationTime = user.metadata.creationTime ? new Date(user.metadata.creationTime) : new Date();

        // If user is new (created after the cutoff), enforce verification
        if (creationTime > verificationCutoffDate) {
            await auth.signOut(); // Sign out the user
            router.push(`/verify-email?email=${encodeURIComponent(email)}`);
            return;
        }
      }
      // --- End Verification Logic ---

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
              <Input id="email" type="email" placeholder="m@example.com" required />
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
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
