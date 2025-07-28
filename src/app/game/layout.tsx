'use client'
import MainLayout from "@/components/layout/main-layout";

export default function GameLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
        <div className="relative w-full h-full">
            {children}
        </div>
    )
  }
