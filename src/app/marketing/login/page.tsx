'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";

export default function MarketingLoginPage() {
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

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().role === 'marketer') {
          toast({
            title: "Marketing Login Successful!",
            description: "Welcome back.",
          });
          router.push('/marketing/dashboard');
      } else {
        await auth.signOut();
        toast({
            variant: "destructive",
            title: "Login failed",
            description: "You are not authorized to access the marketing dashboard.",
        });
      }

    } catch (error: any) {
        console.error("Error signing in:", error);

        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
            // Check if there's a pending application
            const q = query(collection(db, "marketing_applications"), where("email", "==", email), where("status", "==", "pending"));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                 toast({
                    title: "Application Pending",
                    description: "Your marketing partner application is still under review. We'll notify you upon approval.",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Login failed",
                    description: "Invalid email or password.",
                });
            }
        } else {
             toast({
                variant: "destructive",
                title: "Login failed",
                description: "An unexpected error occurred. Please try again.",
            });
        }
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleLogin}>
           <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10">
                        <Trophy className="w-8 h-8 text-primary" />
                    </div>
                </div>
                <CardTitle className="text-2xl">Marketing Login</CardTitle>
                <CardDescription>
                  Enter your credentials to access the marketing dashboard.
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
                Not a partner yet?{" "}
                <Link href="/marketing/register" className="underline">
                    Apply now
                </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
