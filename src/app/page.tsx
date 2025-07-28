
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { BonusCard } from './bonus-card';

const HeroIcon = () => (
    <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto max-w-lg mx-auto">
        <defs>
            <linearGradient id="grad-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 0.5 }} />
                <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.5 }} />
            </linearGradient>
            <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        <g fill="none" stroke="hsl(var(--primary))" strokeWidth="2">
            <path d="M100,50 C50,50 50,150 100,150" opacity="0.3"/>
            <path d="M300,50 C350,50 350,150 300,150" opacity="0.3"/>
            <path d="M 25,100 a 75,75 0 0,1 150,0" strokeWidth="1" opacity="0.2" />
            <path d="M 225,100 a 75,75 0 0,1 150,0" strokeWidth="1" opacity="0.2" />
        </g>
        <g filter="url(#neon-glow)" transform="translate(0, 5)">
            <path d="M 120 70 L 150 70 L 150 100 L 120 100 Z" fill="hsl(var(--primary))" opacity="0.8" />
            <path d="M 160 70 L 190 70 L 190 85 L 160 85 Z" fill="hsl(var(--primary))" opacity="0.8" />
            <path d="M 210 70 L 240 70 L 240 100 L 210 100 Z" fill="hsl(var(--primary))" opacity="0.8" />
            <path d="M 250 70 L 280 70 L 280 85 L 250 85 Z" fill="hsl(var(--primary))" opacity="0.8" />
            <rect x="175" y="110" width="50" height="20" rx="5" fill="hsl(var(--accent))" opacity="0.8"/>
            <circle cx="160" cy="120" r="5" fill="hsl(var(--accent))" opacity="0.8" />
            <circle cx="240" cy="120" r="5" fill="hsl(var(--accent))" opacity="0.8" />
            <path d="M50 100 L 90 70 C 95 65, 105 65, 110 70 L 130 90" stroke="hsl(var(--accent))" strokeWidth="2.5" />
            <path d="M350 100 L 310 70 C 305 65, 295 65, 290 70 L 270 90" stroke="hsl(var(--accent))" strokeWidth="2.5" />
        </g>
    </svg>
);


export default function LandingPage() {
 
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 items-center gap-12">
            <div className="text-left space-y-6">
                <h1 className="text-5xl md:text-6xl font-bold tracking-tighter">
                    <span className="text-accent">Enriching</span>
                    <br/>
                    Your Play
                </h1>
                <p className="max-w-xl text-muted-foreground md:text-lg">
                    Welcome to the ultimate strategy gaming experience. Your skill is your greatest asset. Compete, conquer, and earn on a secure platform built for champions.
                </p>
                 <div className="flex flex-col sm:flex-row gap-4">
                     <Button asChild size="lg" className="px-12">
                        <Link href="/register">Get Started</Link>
                    </Button>
                     <Button asChild variant="outline" size="lg" className="px-12">
                        <a href="https://jani20001212.itch.io/nebattle" target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2"/> Download APK
                        </a>
                    </Button>
                </div>
            </div>
             <div className="relative space-y-6">
                <HeroIcon />
                <BonusCard />
             </div>
        </div>
      </main>
    </div>
  );
}
