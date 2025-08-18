
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState } from "react";
import { auth, db, functions } from "@/lib/firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Ban } from "lucide-react";
import { boyAvatars, girlAvatars } from "@/components/icons/avatars";
import { renderToString } from "react-dom/server";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function RegisterForm() {
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

        // --- referral params ---
        const ref = searchParams.get('ref');
        const mref = searchParams.get('mref');
        const rcid = searchParams.get('rcid');

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
            // 1. Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const avatarCollection = gender === 'male' ? boyAvatars : girlAvatars;
            const randomAvatar = avatarCollection[Math.floor(Math.random() * avatarCollection.length)];
            const svgString = renderToString(React.createElement(randomAvatar));
            const defaultAvatarUri = `data:image/svg+xml;base64,${btoa(svgString)}`;

            // 2. Prepare user data for Cloud Function
            const userData: any = {
                uid: user.uid,
                email: user.email,
                firstName,
                lastName,
                phone,
                address,
                city,
                country,
                gender,
                photoURL: defaultAvatarUri,
            };

            if (ref) userData.standardReferredBy = ref;
            if (mref) userData.marketingReferredBy = mref;
            if (rcid && ref) {
                userData.campaignInfo = {
                    campaignId: rcid,
                    referrerId: ref,
                };
            }

            // 3. Call Cloud Function to create user document in Firestore
            const createDbUser = httpsCallable(functions, 'createDbUser');
            await createDbUser(userData);
            
            // 4. Send verification email from the client
            await sendEmailVerification(user);

            toast({
                title: "Account Created!",
                description: "Please check your email to verify your account before logging in.",
            });
            
            router.push(`/verify-email?email=${email}`);

        } catch (error: any) {
            console.error("Error signing up:", error);
            let errorMessage = "An unknown error occurred.";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "This email address is already in use.";
            } else if (error.code === 'functions/internal' || error.message.includes('createDbUser')) {
                errorMessage = "An error occurred creating your user profile. Please contact support.";
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
    );
}
