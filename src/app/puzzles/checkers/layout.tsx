
'use client'
import PuzzlesLayout from "@/app/puzzles/layout";

export default function CheckersPuzzlesLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
        <PuzzlesLayout>
            {children}
        </PuzzlesLayout>
    )
  }
