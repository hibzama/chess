
'use client'
import MainLayout from "@/components/layout/main-layout";
import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";


export default function DashboardLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { user, userData, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
        if (!loading && user && userData?.role === 'admin') {
            router.push('/admin');
        }
         if (!loading && user && userData?.role === 'marketer') {
            router.push('/marketing/dashboard');
        }
    }, [user, userData, loading, router, pathname]);
    
    if (loading || !user || userData?.role === 'admin' || userData?.role === 'marketer') {
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
