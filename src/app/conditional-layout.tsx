
'use client'

import { useAuth } from '@/context/auth-context';
import MainLayout from '@/components/layout/main-layout';
import LandingLayout from './(landing)/layout';
import { Skeleton } from '@/components/ui/skeleton';

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    if(loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <Skeleton className="h-6 w-48" />
                </div>
            </div>
        )
    }

    if (user) {
        return <MainLayout>{children}</MainLayout>
    }
    
    return <>{children}</>
}

