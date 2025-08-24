
'use client';

import { useTheme } from "@/context/theme-context";
import { Skeleton } from "@/components/ui/skeleton";

export default function LandingLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { theme, loading: themeLoading } = useTheme();

    if (themeLoading || !theme) {
        return <Skeleton className="h-screen w-full" />;
    }
    
    // The "Chess King" theme provides its own full-page layout, so we don't need a wrapper.
    if (theme.id === 'chess_king') {
        return <>{children}</>;
    }

    // For any other theme, we can add a different layout wrapper if needed,
    // but for now, we'll just render the page content directly.
    // The DefaultLanding component in page.tsx provides its own structure.
    return <>{children}</>;
  }
