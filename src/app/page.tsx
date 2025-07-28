
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { BonusCard } from './bonus-card';
import Image from 'next/image';

const HeroIcon = () => (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
            <radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" style={{stopColor: 'hsl(326, 100%, 50%)', stopOpacity: 0.8}} />
                <stop offset="70%" style={{stopColor: 'hsl(54, 100%, 50%)', stopOpacity: 0.7}} />
                <stop offset="100%" style={{stopColor: 'hsl(54, 100%, 50%)', stopOpacity: 0}} />
            </radialGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="10" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
            <pattern id="chessboard" patternUnits="userSpaceOnUse" width="20" height="20">
              <rect x="0" y="0" width="10" height="10" fill="hsl(var(--primary))" fillOpacity="0.1"/>
              <rect x="10" y="0" width="10" height="10" fill="hsl(var(--background))" fillOpacity="0.1"/>
              <rect x="0" y="10" width="10" height="10" fill="hsl(var(--background))" fillOpacity="0.1"/>
              <rect x="10" y="10" width="10" height="10" fill="hsl(var(--primary))" fillOpacity="0.1"/>
            </pattern>
        </defs>
        
        <g transform="translate(100 100) scale(1.4) rotate(15)">
             <g transform="skewX(-20) scale(1.1)">
                <rect x="-50" y="-50" width="100" height="100" fill="url(#grad1)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" rx="5" filter="url(#glow)" />
                <rect x="-50" y="-50" width="100" height="100" fill="url(#chessboard)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" rx="5"/>
             </g>
             
             <g transform="translate(-10, -15) scale(1.8)" fill="rgba(255,255,255,0.9)" stroke="rgba(0,0,0,0.5)" strokeWidth="0.5" strokeLinejoin="round">
                {/* Abstract shape 1 */}
                <path d="M10 18 C 5 18, 5 12, 10 12 L 15 12 C 20 12, 20 18, 15 18 Z" />
                <circle cx="12.5" cy="15" r="1.5" fill="black" />
             </g>
              <g transform="translate(20, 15) scale(1.3)" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" strokeLinejoin="round">
                {/* Abstract shape 2 */}
                <path d="M-5 28 C 0 28, 0 22, -5 22 L -10 22 C -15 22, -15 28, -10 28 Z" />
                <circle cx="-7.5" cy="25" r="1.5" fill="white" />
             </g>
        </g>
        
        <circle cx="160" cy="50" r="8" fill="hsl(187, 100%, 50%)" opacity="0.9" />
        <circle cx="60" cy="150" r="6" fill="hsl(var(--accent))" opacity="0.9" />
        <circle cx="135" cy="145" r="12" fill="hsl(187, 100%, 50%)" opacity="0.9" />
        <circle cx="135" cy="145" r="9" fill="none" stroke="white" strokeWidth="1.5" />
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
                    <Button asChild size="lg" className="bg-[#00e1ff] text-black hover:bg-[#00e1ff]/80">
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
