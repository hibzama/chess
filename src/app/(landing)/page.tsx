
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle } from 'lucide-react';
import { BonusCard } from '../bonus-card';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import { redirect } from 'next/navigation';
import { useTheme } from '@/context/theme-context';
import { Skeleton } from '@/components/ui/skeleton';
import ChessKingLanding from './chess-king-landing';
import { useTranslation } from '@/hooks/use-translation';

const T = ({ children }: { children: string }) => <>{useTranslation(children)}</>;

const DefaultLanding = ({ theme }) => {
    if (!theme) return null;
    
    const landingFeatures = theme?.landingPage?.features || [
        'High Conversion',
        'Profitable Commission',
        'Real-Time Statistics',
        'Marketing Support'
    ];
    const apkUrl = theme?.landingPage?.apkUrl || '#';
    const heroImageUrl = theme?.landingPage?.heroImageUrl;

    return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)]">
      <main className="flex-1 flex items-center justify-center p-4">
        <section className="container mx-auto grid grid-cols-1 md:grid-cols-2 items-center gap-12">
            <div className="hero-text text-center md:text-left">
                <p className="font-bold text-primary mb-2"><T>BECOME TODAY A NEXBATTLE PARTNER</T></p>
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                    <T>{theme?.landingPage.heroTitle}</T>
                </h1>
                <p className="my-6 text-lg text-muted-foreground">
                   <T>{theme?.landingPage.heroSubtitle}</T>
                </p>
                <ul className="grid grid-cols-2 gap-4 text-left mb-8">
                    {landingFeatures.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500"/> <T>{feature}</T></li>
                    ))}
                </ul>
                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                    <Button asChild size="lg">
                        <Link href="/register"><T>Register & Play</T></Link>
                    </Button>
                     <Button asChild size="lg" variant="outline">
                        <Link href={apkUrl} target="_blank" rel="noopener noreferrer"><Download className="mr-2"/> <T>Download APK</T></Link>
                    </Button>
                </div>
                 <div className="mt-8">
                    <BonusCard />
                </div>
            </div>
            <div className="hero-image">
                <div className="relative w-full h-full min-h-[300px] md:min-h-[400px] rounded-2xl overflow-hidden shadow-2xl shadow-primary/20">
                    {heroImageUrl ? (
                        <Image
                            src={heroImageUrl}
                            alt="Hero Image"
                            fill
                            className="object-cover animate-zoom-in-out"
                            data-ai-hint="neon gamepad"
                        />
                    ) : (
                        <Skeleton className="h-full w-full" />
                    )}
                </div>
            </div>
        </section>
      </main>
    </div>
    )
}


export default function LandingPage() {
    const { user, loading: authLoading } = useAuth();
    const { theme, loading: themeLoading } = useTheme();
 
    if (authLoading || themeLoading) {
        return <Skeleton className="h-screen w-full" />;
    }

    if (user) {
        redirect('/dashboard');
    }
    
    if (theme?.id === 'chess_king') {
        return <ChessKingLanding />;
    }
 
    return <DefaultLanding theme={theme} />;
}

    