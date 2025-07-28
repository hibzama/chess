
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Inter as FontSans } from 'next/font/google';
import { cn } from '@/lib/utils';
import ConditionalLayout from './conditional-layout';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

// Metadata can't be used in a client component, so we export it from here.
// Note: This is a static metadata object. For dynamic metadata in a client component,
// you would need a different approach.
export const metadata: Metadata = {
  title: 'Nexbattle',
  description: 'Play chess and checkers online with friends.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="hsl(257 93% 65%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="m14.5 9.5-5 5" /><path d="m9.5 9.5 5 5" /><path d="M12 3v1" /><path d="M12 20v1" /><path d="m5 7 1-1" /><path d="m18 18 1-1" /><path d="m5 17 1 1" /><path d="m18 6-1 1" /></svg>' type="image/svg+xml" />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          fontSans.variable
        )}
      >
        <Providers>
            {children}
        </Providers>
      </body>
    </html>
  );
}
