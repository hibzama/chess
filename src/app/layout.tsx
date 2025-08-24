
'use client';
import './globals.css';
import { Providers } from './providers';
import { Inter as FontSans } from 'next/font/google';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/theme-context';
import { useEffect } from 'react';
import { useTranslationSystem } from '@/context/translation-context';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});


function ThemedLayout({ children }: { children: React.ReactNode }) {
    const { theme, loading: themeLoading } = useTheme();
    const { layoutDirection, loading: langLoading } = useTranslationSystem();

    useEffect(() => {
        if (!themeLoading && theme?.colors) {
            const root = document.documentElement;
            Object.entries(theme.colors).forEach(([key, value]) => {
                 const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
                 root.style.setProperty(cssVar, value);
            });
        }
    }, [theme, themeLoading]);

    useEffect(() => {
        if (!langLoading) {
            document.documentElement.dir = layoutDirection;
        }
    }, [layoutDirection, langLoading]);
    
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
          <head>
            <title>Nexbattle</title>
            <meta name="description" content="Play chess and checkers online with friends." />
            <link rel="icon" href='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="hsl(257 93% 65%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="m14.5 9.5-5 5" /><path d="m9.5 9.5 5 5" /><path d="M12 3v1" /><path d="M12 20v1" /><path d="m5 7 1-1" /><path d="m18 18 1-1" /><path d="m5 17 1 1" /><path d="m18 6-1 1" /></svg>' type="image/svg+xml" />
          </head>
          <body
            className={cn(
              'min-h-screen bg-background font-sans antialiased',
              fontSans.variable
            )}
          >
            {children}
          </body>
        </html>
    )
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
        <ThemedLayout>{children}</ThemedLayout>
    </Providers>
  );
}
