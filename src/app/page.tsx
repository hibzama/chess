'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { BonusCard } from './bonus-card';
import Image from 'next/image';

const HeroIcon = () => (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor: 'hsl(var(--primary))', stopOpacity:1}} />
                <stop offset="100%" style={{stopColor: 'hsl(var(--accent))', stopOpacity:1}} />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="10" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        
        {/* Base circle with glow */}
        <circle cx="100" cy="100" r="80" fill="url(#grad1)" filter="url(#glow)" opacity="0.8"/>
        
        {/* Stylized Chess King */}
        <g transform="translate(60 50) scale(1.2)">
            <path d="M22.5 13.5L22.5 8.5M20 11H25" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M14.5 29.5V13.5H30.5V29.5H14.5Z" fill="none" stroke="white" strokeWidth="1.5" />
        </g>

        {/* Stylized Checkers Piece */}
        <g transform="translate(110 120) scale(1.1)">
             <circle cx="20" cy="20" r="15" fill="#00e1ff" opacity="0.9" />
             <circle cx="20" cy="20" r="12" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7"/>
        </g>
        
         {/* Small decorative elements */}
        <circle cx="40" cy="150" r="6" fill="hsl(var(--accent))" opacity="0.9" />
        <circle cx="160" cy="50" r="8" fill="#00e1ff" opacity="0.8" />

    </svg>
)

export default function LandingPage() {
 
  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)]">
      <main className="flex-1 flex items-center justify-center p-4">
        <section className="container mx-auto grid grid-cols-1 md:grid-cols-2 items-center gap-12">
            <div className="hero-text text-center md:text-left">
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                    <span className="text-accent">ENRICHING</span><br/>YOUR PLAY
                </h1>
                <p className="my-6 text-lg text-muted-foreground">
                   Welcome to the ultimate strategy gaming experience. Your skill is your greatest asset. Compete, conquer, and earn on a secure platform built for champions.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                    <Button asChild size="lg" variant="outline" className="bg-[#00e1ff] text-black hover:bg-[#00e1ff]/80">
                        <Link href="/about">READ MORE</Link>
                    </Button>
                     <Button asChild size="lg">
                        <Link href="/register">Get Started</Link>
                    </Button>
                </div>
                 <div className="mt-8">
                    <BonusCard />
                </div>
            </div>
            <div className="hero-image">
                <HeroIcon />
            </div>
        </section>
      </main>
    </div>
  );
}
