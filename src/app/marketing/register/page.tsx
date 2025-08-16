
'use client'
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";

export default function MarketingRegisterPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const target = e.target as typeof e.target & {
            'first-name': { value: string };
            'last-name': { value: string };
            phone: { value: string };
            email: { value: string };
            password: { value: string };
            'marketing-plan': { value: string };
        };
        
        const applicationData = {
            firstName: target['first-name'].value,
            lastName: target['last-name'].value,
            phone: target.phone.value,
            email: target.email.value,
            password: target.password.value,
            marketingPlan: target['marketing-plan'].value,
            status: 'pending',
            createdAt: serverTimestamp(),
        };

        try {
            await addDoc(collection(db, 'marketing_applications'), applicationData);
            toast({
                title: "Application Submitted!",
                description: "Your application has been sent for review. We will notify you upon approval.",
            });
            router.push('/');
        } catch (error) {
            console.error("Error submitting application: ", error);
            toast({
                variant: 'destructive',
                title: "Submission Failed",
                description: "There was an error submitting your application. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-lg">
                <form onSubmit={handleSubmit}>
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 rounded-full bg-primary/10">
                                <Trophy className="w-8 h-8 text-primary" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl">Marketing Partner Application</CardTitle>
                        <CardDescription>
                            Apply to unlock a 20-level referral network and exclusive commission rates.
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
                            <Input id="email" type="email" placeholder="m@example.com" required />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" required/>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="marketing-plan">How do you plan to market this?</Label>
                            <Textarea id="marketing-plan" placeholder="Describe your marketing strategy, e.g., social media channels, community groups, etc." required />
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
                        <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Submitting...' : 'Submit Application'}</Button>
                        <div className="text-center text-sm">
                            Already a partner?{" "}
                            <Link href="/marketing/login" className="underline">
                                Sign In
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
