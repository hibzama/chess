'use client'
import MainLayout from "@/components/layout/main-layout";
import { useAuth } from "@/context/auth-context";

export default function PracticeLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { user } = useAuth();
    
    // If user is logged in, wrap with the main dashboard layout.
    // Otherwise, render the children directly (for guest access).
    if (user) {
        return (
            <MainLayout>
                {children}
            </MainLayout>
        )
    }

    return (
         <div className="bg-background text-foreground min-h-screen">
            {children}
        </div>
    );
  }
