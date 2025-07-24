
'use client'
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function MarketingDashboardPage() {
    const { user, userData, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || userData?.role !== 'marketer')) {
            router.push('/marketing/register');
        }
    }, [user, userData, loading, router]);
    
    if (loading || !user || !userData || userData.role !== 'marketer') {
        return (
            <div className="flex flex-col">
              <div className="mb-12">
                <Skeleton className="h-12 w-3/4 mb-2" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            </div>
          );
    }

    return (
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Marketing Dashboard</CardTitle>
                    <CardDescription>Welcome, {userData.firstName}. This is your marketing hub.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Your unique marketing link: <strong>{typeof window !== 'undefined' && `${window.location.origin}/register?mref=${user.uid}`}</strong></p>
                    <p>More stats coming soon!</p>
                </CardContent>
            </Card>
        </div>
    )
}

    