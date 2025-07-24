

'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getCountFromServer, collection, getDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";


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
        const password = target.password.value;
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
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const usersCollection = collection(db, "users");
            const snapshot = await getCountFromServer(usersCollection);
            const userCount = snapshot.data().count;
            
            let initialBalance = 0;
            if (userCount <= 250) {
                initialBalance = 100;
            }
            
            const userData: any = {
                uid: user.uid,
                firstName,
                lastName,
                phone,
                email,
                balance: initialBalance,
                commissionBalance: 0,
                marketingBalance: 0,
                role: 'user',
                createdAt: serverTimestamp(),
            };

            if (mref) {
                const marketerDoc = await getDoc(doc(db, 'users', mref));
                if (marketerDoc.exists() && marketerDoc.data().role === 'marketer') {
                    // This is a new user referred by a marketer. Start the chain.
                    userData.referralChain = [mref];
                }
            } else if (ref) {
                 const referrerDoc = await getDoc(doc(db, 'users', ref));
                 if (referrerDoc.exists()) {
                    const referrerData = referrerDoc.data();
                    // If referrer is a marketer, add new user to their chain
                    if(referrerData.role === 'marketer' || (referrerData.referralChain && referrerData.referralChain.length > 0)) {
                         const chain = referrerData.referralChain || [referrerData.uid]; // Start with the marketer if they are the direct referrer
                         if(chain.length < 20) {
                            userData.referralChain = [...chain, ref];
                         }
                    } else {
                        // This is a standard user referral.
                        userData.referredBy = ref;
                    }
                 }
            }

            await setDoc(doc(db, "users", user.uid), userData);
            
            const LKR_BONUS = 100;
            const USDT_RATE = 310;
            const USDT_BONUS = (LKR_BONUS / USDT_RATE).toFixed(2);

            toast({
                title: "Success!",
                description: `Your account has been created.${initialBalance > 0 ? ` A ${USDT_BONUS} USDT bonus has been added to your account!` : ''}`,
            });
            router.push('/dashboard');

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
            <CardTitle className="text-2xl">Sign Up</CardTitle>
            <CardDescription>
                Enter your information to create an account.
            </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
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

    

