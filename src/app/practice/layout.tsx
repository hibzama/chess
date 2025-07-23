'use client'
import MainLayout from "@/components/layout/main-layout";

export default function PracticeLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
        <MainLayout>
            {children}
        </MainLayout>
    )
  }
