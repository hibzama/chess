
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { BonusCard } from './bonus-card';
import Image from 'next/image';

const HeroIcon = () => (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
            <radialGradient id="grad2" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" style={{stopColor: 'hsl(326, 100%, 50%)', stopOpacity: 0.8}} />
                <stop offset="70%" style={{stopColor: 'hsl(36, 100%, 50%)', stopOpacity: 0.7}} />
                <stop offset="100%" style={{stopColor: 'hsl(36, 100%, 50%)', stopOpacity: 0}} />
            </radialGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="10" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
            <pattern id="chessboard" patternUnits="userSpaceOnUse" width="20" height="20">
              <rect x="0" y="0" width="10" height="10" fill="#fff" fillOpacity="0.2"/>
              <rect x="10" y="0" width="10" height="10" fill="#000" fillOpacity="0.2"/>
              <rect x="0" y="10" width="10" height="10" fill="#000" fillOpacity="0.2"/>
              <rect x="10" y="10" width="10" height="10" fill="#fff" fillOpacity="0.2"/>
            </pattern>
        </defs>
        
        <circle cx="100" cy="100" r="80" fill="url(#grad2)" filter="url(#glow)" opacity="0.8"/>
        
        <g transform="translate(100 100) scale(1.4)">
             <g transform="rotate(-15) skewX(-20) scale(1.1)">
                <rect x="-50" y="-50" width="100" height="100" fill="url(#chessboard)" stroke="rgba(255,255,255,0.5)" strokeWidth="1" rx="5"/>
             </g>

             <g transform="translate(-10, -15) scale(1.8)" fill="rgba(255,255,255,0.9)" stroke="rgba(0,0,0,0.5)" strokeWidth="0.5" strokeLinejoin="round">
                {/* Dollar Sign */}
                <path d="M17.5 22.5c-2.49 0-4.5-2.01-4.5-4.5s2.01-4.5 4.5-4.5c1.2 0 2.29.47 3.11 1.24.63-.43 1.38-.74 2.19-.74 1.93 0 3.5 1.57 3.5 3.5 0 1.29-.71 2.42-1.75 3.03.11.2.25.4.25.66 0 .83-.67 1.5-1.5 1.5h-5.8zm-1.5-3.5c0 .83.67 1.5 1.5 1.5h1.5v-3h-1.5c-.83 0-1.5.67-1.5 1.5zm6.5-1c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zM20 12v-1.5h-5V12h5zm0 13v-1.5h-5V25h5z" />
             </g>
              <g transform="translate(20, 15) scale(1.3)" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" strokeLinejoin="round">
                {/* Dollar sign */}
                <path d="M17.5 22.5c-2.49 0-4.5-2.01-4.5-4.5s2.01-4.5 4.5-4.5c1.2 0 2.29.47 3.11 1.24.63-.43 1.38-.74 2.19-.74 1.93 0 3.5 1.57 3.5 3.5 0 1.29-.71 2.42-1.75 3.03.11.2.25.4.25.66 0 .83-.67 1.5-1.5 1.5h-5.8zm-1.5-3.5c0 .83.67 1.5 1.5 1.5h1.5v-3h-1.5c-.83 0-1.5.67-1.5 1.5zm6.5-1c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zM20 12v-1.5h-5V12h5zm0 13v-1.5h-5V25h5z" />
             </g>
        </g>
        
        <circle cx="160" cy="50" r="8" fill="#00e1ff" opacity="0.9" />
        <circle cx="60" cy="150" r="6" fill="hsl(var(--accent))" opacity="0.9" />
        <circle cx="135" cy="145" r="12" fill="#00e1ff" opacity="0.9" />
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
