
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Download, Gamepad2 } from 'lucide-react';
import { BonusCard } from './bonus-card';

const Feature = ({ text }: { text: string }) => (
    <div className="flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-accent" />
        <span className="text-muted-foreground">{text}</span>
    </div>
);

const HeroIcon = () => (
    <svg
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-w-md mx-auto"
    >
        <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: 'rgb(139, 92, 246)', stopOpacity: 1 }} />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="10" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>

        <g filter="url(#glow)" opacity="0.3">
            <circle cx="100" cy="100" r="80" fill="url(#grad1)" />
        </g>

        <g fill="none" stroke="hsl(var(--primary))" strokeWidth="4">
            <circle cx="100" cy="100" r="90" opacity="0.2" />
            <circle cx="100" cy="100" r="75" opacity="0.4" />
        </g>
        
        <g fill="white" stroke="black" strokeWidth="1">
            <path
                d="M100 55 C 95 65, 95 75, 100 85 L 115 85 C 120 75, 120 65, 115 55 Z"
                fill="hsl(var(--primary-foreground))"
            />
            <path
                d="M 90 85 L 125 85 L 125 95 L 90 95 Z"
                fill="hsl(var(--primary-foreground))"
            />
            <path
                d="M 95 95 L 120 95 L 120 130 C 110 140, 105 140, 95 130 Z"
                fill="hsl(var(--primary-foreground))"
            />
             <path
                d="M 85 135 L 130 135 L 130 145 L 85 145 Z"
                fill="hsl(var(--primary-foreground))"
            />
        </g>
    </svg>
);


export default function LandingPage() {
 
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 items-center gap-12">
            <div className="text-left space-y-6">
                <p className="font-semibold text-primary">BECOME TODAY A NEXBATTLE PARTNER</p>
                <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-foreground">
                    Your Skill is Your Investment
                </h1>
                <p className="max-w-xl text-muted-foreground md:text-lg">
                    Your earnings are unlimited and have no restrictions. Promote Nexbattle and start increasing your earnings today!
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Feature text="High Conversion" />
                    <Feature text="Profitable Commission" />
                    <Feature text="Real-Time Statistics" />
                    <Feature text="Marketing Support" />
                </div>
                 <div className="flex flex-col sm:flex-row gap-4">
                     <Button asChild size="lg" className="px-12 bg-gradient-to-r from-primary to-purple-600">
                        <Link href="/register">Become a Partner</Link>
                    </Button>
                     <Button asChild variant="outline" size="lg" className="px-12"
                        onClick={() => window.open('https://jani20001212.itch.io/nebattle', '_blank')}
                     >
                        <a href="https://jani20001212.itch.io/nebattle" target="_blank" rel="noopener noreferrer">
                            <span><Download className="mr-2"/> Download APK</span>
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
