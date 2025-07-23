'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

// For this example, we'll hardcode the admin credentials.
// In a real app, you'd use a more secure method like custom claims in Firebase Auth.
const ADMIN_EMAIL = "admin@janitha.com";
const ADMIN_PASSWORD = "Jda@#12345";

export default function AdminLoginPage() {
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

    if (email !== ADMIN_EMAIL) {
        toast({
            variant: "destructive",
            title: "Login failed",
            description: "You are not authorized to access this page.",
        });
        setIsLoading(false);
        return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Admin Login Successful!",
        description: "Welcome back.",
      });
      router.push('/admin');
    } catch (error: any) {
        console.error("Error signing in:", error);
        toast({
            variant: "destructive",
            title: "Login failed",
            description: "Invalid email or password.",
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
            <CardTitle className="text-2xl">Admin Login</CardTitle>
            <CardDescription>
              Enter your admin credentials to access the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="admin@example.com" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Signing In...' : 'Sign in'}</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
