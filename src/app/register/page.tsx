
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState, Suspense } from "react";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, getCountFromServer, collection, getDoc, serverTimestamp, updateDoc, increment } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Ban } from "lucide-react";
import { boyAvatars, girlAvatars } from "@/components/icons/avatars";
import { renderToString } from "react-dom/server";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";


function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [gender, setGender] = useState("");

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const target = e.target as typeof e.target & {
            'first-name': { value: string };
            'last-name': { value: string };
            'phone': { value: string };
            'email': { value: string };
            'password': { value: string };
            'confirm-password': { value: string };
            'address': { value: string };
            'city': { value: string };
            'country': { value: string };
        };

        const firstName = target['first-name'].value;
        const lastName = target['last-name'].value;
        const phone = target.phone.value;
        const email = target.email.value;
        const password = target.password.value;
        const confirmPassword = target['confirm-password'].value;
        const address = target.address.value;
        const city = target.city.value;
        const country = target.country.value;
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

        if (!gender) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Please select your gender.",
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

            const avatarCollection = gender === 'male' ? boyAvatars : girlAvatars;
            const randomAvatar = avatarCollection[Math.floor(Math.random() * avatarCollection.length)];
            const svgString = renderToString(React.createElement(randomAvatar));
            const defaultAvatarUri = `data:image/svg+xml;base64,${'btoa' in window ? window.btoa(svgString) : svgString}`;
            
            const userData: any = {
                uid: user.uid,
                firstName,
                lastName,
                phone,
                email,
                address,
                city,
                country,
                gender,
                binancePayId: '',
                balance: 0,
                commissionBalance: 0,
                marketingBalance: 0,
                role: 'user',
                createdAt: serverTimestamp(),
                l1Count: 0,
                photoURL: defaultAvatarUri,
                ipAddress: ipAddress,
                emailVerified: true, 
            };
            
            const directReferrerId = mref || ref;
            if (directReferrerId) {
                const referrerDoc = await getDoc(doc(db, 'users', directReferrerId));
                if (referrerDoc.exists()) {
                    const referrerData = referrerDoc.data();
                    userData.referredBy = directReferrerId; // Always set the direct referrer

                    // If the referrer has a chain, it means they are part of a marketer's downline.
                    // The new user should inherit this chain and add the direct referrer to it.
                    if (referrerData.referralChain) {
                        userData.referralChain = [...referrerData.referralChain, directReferrerId];
                    } 
                    // If the referrer is a marketer themselves (and thus the start of a chain)
                    else if (referrerData.role === 'marketer') {
                        userData.referralChain = [directReferrerId];
                    }

                    // Increment the direct referrer's L1 count if they are a regular user
                    if (referrerData.role === 'user') {
                        await updateDoc(doc(db, 'users', directReferrerId), { l1Count: increment(1) });
                    }
                }
            }


            await setDoc(doc(db, "users", user.uid), userData);
            
            toast({
                title: "Account Created!",
                description: "Welcome to Nexbattle! You can now explore your dashboard.",
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
      <Card className="w-full max-w-md">
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
                <Label htmlFor="gender">Gender</Label>
                 <RadioGroup onValueChange={setGender} value={gender} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="male" />
                        <Label htmlFor="male">Male</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="female" />
                        <Label htmlFor="female">Female</Label>
                    </div>
                </RadioGroup>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" placeholder="+1 234 567 890" required />
            </div>
             <div className="grid gap-2">
                <Label htmlFor="address">Home Address</Label>
                <Input id="address" placeholder="123 Main St" required />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" placeholder="New York" required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" placeholder="USA" required />
                </div>
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

export default function RegisterPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Suspense fallback={<div>Loading...</div>}>
                <RegisterForm />
            </Suspense>
        </div>
    )
}

    