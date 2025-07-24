
'use client'
import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Copy, Share, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MarketingDashboardPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();

    const marketingLink = (typeof window !== 'undefined' && user) ? `${window.location.origin}/register?mref=${user.uid}` : '';

    const copyLink = () => {
        navigator.clipboard.writeText(marketingLink);
        toast({ title: "Copied!", description: "Your marketing link has been copied." });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Marketing Dashboard</CardTitle>
                    <CardDescription>Welcome, {userData?.firstName}. This is your marketing hub.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <p className="font-semibold">Your unique marketing link:</p>
                    <div className="flex gap-2">
                        <input readOnly value={marketingLink} className="w-full bg-muted p-2 rounded-md text-sm" />
                        <Button variant="outline" size="icon" onClick={copyLink}><Copy/></Button>
                         <Button variant="outline" size="icon" onClick={() => navigator.share({ url: marketingLink, title: 'Join me on Nexbattle!'})}><Share/></Button>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Commission Wallet</CardTitle>
                    <CardDescription>View your earnings and request withdrawals.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Available Balance</p>
                        <p className="text-2xl font-bold">LKR {userData?.marketingBalance?.toFixed(2) || '0.00'}</p>
                    </div>
                    <Button asChild>
                        <Link href="/marketing/dashboard/wallet"><Wallet className="mr-2"/> Go to Wallet</Link>
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Your Network</CardTitle>
                    <CardDescription>More stats coming soon!</CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
}
