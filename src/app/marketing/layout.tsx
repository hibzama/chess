
'use client'
import MainLayout from "@/components/layout/main-layout";
import { useAuth } from "@/context/auth-context";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function MarketingLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { user, userData, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const isAuthPage = pathname === '/marketing/register' || pathname === '/marketing/login';

     useEffect(() => {
        if (!loading && !isAuthPage) {
            if (!user || userData?.role !== 'marketer') {
                router.push('/marketing/login');
            }
        }
    }, [user, userData, loading, router, isAuthPage, pathname]);

    if (isAuthPage) {
        return <>{children}</>;
    }

    if (loading || !user || !userData || userData.role !== 'marketer') {
        return (
             <div className="flex flex-col p-8">
              <div className="mb-12">
                <Skeleton className="h-12 w-3/4 mb-2" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            </div>
        )
    }
    
    return (
        <MainLayout>
            {children}
        </MainLayout>
    )
  }
