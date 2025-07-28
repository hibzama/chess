
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
             
             {/* Abstract Pieces */}
             <g>
                {/* Top cyan circle */}
                <circle cx="15" cy="-25" r="8" fill="#00e1ff" opacity="0.9" />
                {/* Middle "eye" piece */}
                <g transform="translate(25, 5)">
                  <ellipse cx="0" cy="0" rx="12" ry="7" fill="white" />
                  <circle cx="0" cy="0" r="5" fill="black" />
                </g>
                 {/* Bottom right cyan circle with border */}
                <g transform="translate(38, 25)">
                    <circle cx="0" cy="0" r="10" fill="#00e1ff" opacity="0.9" />
                    <circle cx="0" cy="0" r="8" fill="none" stroke="white" strokeWidth="1.5" />
                </g>
                 {/* Bottom left small eye piece */}
                 <g transform="translate(-20, 35)">
                  <ellipse cx="0" cy="0" rx="8" ry="5" fill="white" />
                  <circle cx="0" cy="0" r="3" fill="black" />
                </g>
                {/* Middle left yellow circle */}
                <circle cx="-30" cy="10" r="6" fill="#fdee00" opacity="0.9" />
             </g>
        </g>
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
