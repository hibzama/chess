
'use client'
import MainLayout from "@/components/layout/main-layout";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";

export default function MarketingLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { user, userData, loading } = useAuth();
    const pathname = usePathname();

    const isRegisterPage = pathname === '/marketing/register';

    if (isRegisterPage) {
        return <>{children}</>;
    }
    
    // For dashboard pages, use the main layout
    return (
        <MainLayout>
            {children}
        </MainLayout>
    )
  }

    