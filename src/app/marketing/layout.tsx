
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

    const isRegisterPage = pathname === '/marketing/register';

     useEffect(() => {
        if (!loading && !isRegisterPage) {
            if (!user || userData?.role !== 'marketer') {
                router.push('/marketing/register');
            }
        }
    }, [user, userData, loading, router, isRegisterPage, pathname]);

    if (isRegisterPage) {
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
    
    // For dashboard pages, use the main layout
    return (
        <MainLayout>
            {children}
        </MainLayout>
    )
  }
