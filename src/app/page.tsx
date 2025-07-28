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
                <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        
        {/* Abstract shape 1 */}
        <path fill="url(#grad1)" d="M73.1,-55.1C91.9,-38.9,102.4,-10.8,99.2,12.9C96,36.6,79.1,56,58.3,66.7C37.5,77.4,12.8,79.4,-10.1,75.2C-33,71,-54.1,60.6,-67.2,43.5C-80.3,26.4,-85.5,2.6,-79.8,-17.9C-74.1,-38.4,-57.6,-55.6,-39.2,-66.2C-20.8,-76.8,-0.6,-80.8,19.9,-75.4C40.4,-70,64.2,-65.2,73.1,-55.1Z" transform="translate(100 100)" filter="url(#glow)" />

        {/* Floating elements */}
        <circle cx="30" cy="40" r="8" fill="hsl(var(--primary))" opacity="0.7"/>
        <circle cx="170" cy="160" r="10" fill="hsl(var(--accent))" opacity="0.8"/>
        <path d="M 150,30 L 160,50 L 140,50 z" fill="#00e1ff" opacity="0.7"/>
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
            </div>
            <div className="hero-image">
                <HeroIcon />
            </div>
        </section>
      </main>
    </div>
  );
}
