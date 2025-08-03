
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, getCountFromServer, collection, getDoc, serverTimestamp, updateDoc, increment } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Ban } from "lucide-react";
import { boyAvatars, girlAvatars } from "@/components/icons/avatars";
import { renderToString } from "react-dom/server";


export default function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const target = e.target as typeof e.target & {
            'first-name': { value: string };
            'last-name': { value: string };
            phone: { value: string };
            email: { value: string };
            password: { value: string };
            'confirm-password': { value: string };
        };

        const firstName = target['first-name'].value;
        const lastName = target['last-name'].value;
        const phone = target.phone.value;
        const email = target.email.value;
        const password = target['password'].value;
        const confirmPassword = target['confirm-password'].value;
        const ref = searchParams.get('ref');
        const mref = searchParams.get('mref');

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
            // Fetch IP address
            let ipAddress = 'unknown';
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                ipAddress = data.ip;
            } catch (ipError) {
                console.error("Could not fetch IP address:", ipError);
            }


            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Send verification email
            await sendEmailVerification(user);

            const usersCollection = collection(db, "users");
            const snapshot = await getCountFromServer(usersCollection);
            const userCount = snapshot.data().count;
            
            let initialBalance = 0;
            if (userCount < 250) {
                initialBalance = 100;
            }

            const allAvatars = [...boyAvatars, ...girlAvatars];
            const randomAvatar = allAvatars[Math.floor(Math.random() * allAvatars.length)];
            const svgString = renderToString(React.createElement(randomAvatar));
            const defaultAvatarUri = `data:image/svg+xml;base64,${btoa(svgString)}`;
            
            const userData: any = {
                uid: user.uid,
                firstName,
                lastName,
                phone,
                email,
                binancePayId: '',
                balance: initialBalance,
                commissionBalance: 0,
                marketingBalance: 0,
                role: 'user',
                createdAt: serverTimestamp(),
                l1Count: 0,
                photoURL: defaultAvatarUri,
                ipAddress: ipAddress,
                emailVerified: false, // Explicitly set to false
            };

            const referrerId = mref || ref;

            if (referrerId) {
                const referrerDoc = await getDoc(doc(db, 'users', referrerId));
                if (referrerDoc.exists()) {
                    const referrerData = referrerDoc.data();
                    
                    if (mref && referrerData.role === 'marketer') {
                         userData.referralChain = [mref];
                    } else if (ref) {
                        userData.referredBy = ref;
                        await updateDoc(doc(db, 'users', ref), { l1Count: increment(1) });
                        
                        if (referrerData.referralChain) {
                             userData.referralChain = [...referrerData.referralChain, ref];
                        }
                    }
                }
            }


            await setDoc(doc(db, "users", user.uid), userData);
            
            toast({
                title: "Almost there!",
                description: "A verification link has been sent to your email.",
                duration: 9000,
            });
            await auth.signOut();
            router.push(`/verify-email?email=${encodeURIComponent(email)}`);

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
      <Card className="w-full max-w-sm">
        <form onSubmit={handleRegister}>
            <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create an Account</CardTitle>
            <CardDescription>
                Enter your details to sign up.
            </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
            <Alert variant="destructive">
                <Ban className="h-4 w-4" />
                <AlertTitle>Fair Play Policy</AlertTitle>
                <AlertDescription>
                    Creating multiple accounts from the same device is strictly prohibited and will result in suspension.
                </AlertDescription>
            </Alert>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                  <Label htmlFor="first-name">First name</Label>
                  <Input id="first-name" placeholder="Max" required />
              </div>
              <div className="grid gap-2">
                  <Label htmlFor="last-name">Last name</Label>
                  <Input id="last-name" placeholder="Robinson" required />
              </div>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" placeholder="+1 234 567 890" required />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required/>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input id="confirm-password" type="password" required/>
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
                <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Creating Account...' : 'Create an account'}</Button>
                <div className="text-center text-sm">
                    Already have an account?{" "}
                    <Link href="/login" className="underline">
                        Sign in
                    </Link>
                </div>
            </CardFooter>
        </form>
      </Card>
  );
}
