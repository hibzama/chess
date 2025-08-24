
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

const DefaultLanding = () => {
    return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)]">
      <main className="flex-1 flex items-center justify-center p-4">
        <section className="container mx-auto grid grid-cols-1 md:grid-cols-2 items-center gap-12">
            <div className="hero-text text-center md:text-left">
                <p className="font-bold text-primary mb-2">BECOME TODAY A NEXBATTLE PARTNER</p>
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                    Your Skill is Your Investment
                </h1>
                <p className="my-6 text-lg text-muted-foreground">
                   Your earnings are unlimited and have no restrictions. Promote Nexbattle and start increasing your earnings today!
                </p>
                <ul className="grid grid-cols-2 gap-4 text-left mb-8">
                    <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500"/> High Conversion</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500"/> Profitable Commission</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500"/> Real-Time Statistics</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500"/> Marketing Support</li>
                </ul>
                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                    <Button asChild size="lg">
                        <Link href="/register">Register & Play</Link>
                    </Button>
                     <Button asChild size="lg" variant="outline">
                        <Link href="https://jani20001212.itch.io/nebattle" target="_blank" rel="noopener noreferrer"><Download className="mr-2"/> Download APK</Link>
                    </Button>
                </div>
                 <div className="mt-8">
                    <BonusCard />
                </div>
            </div>
            <div className="hero-image">
                <div className="relative w-full h-full min-h-[300px] md:min-h-[400px] rounded-2xl overflow-hidden shadow-2xl shadow-primary/20">
                    <Image
                        src="https://allnews.ltd/wp-content/uploads/2025/07/video-game-controller-with-bright-neon-light-streaks-computer-gamer-background-3d-octane-render-game-concept-ideas-ai-generative-free-photo.jpg"
                        alt="Hero Image"
                        fill
                        className="object-cover animate-zoom-in-out"
                        data-ai-hint="neon gamepad"
                    />
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
 
    return <DefaultLanding />;
}
