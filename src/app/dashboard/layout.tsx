
'use client'
import MainLayout from "@/components/layout/main-layout";
import { useAuth } from "@/context/auth-context";

export default function DashboardLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { userData } = useAuth();
    
    // This is a simplified check. A robust implementation might need more context.
    const isTaskReferredUser = !!userData?.taskReferredBy;

    return (
        <MainLayout showTaskNavItem={isTaskReferredUser}>
            {children}
        </MainLayout>
    )
  }

