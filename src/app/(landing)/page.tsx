

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle } from 'lucide-react';
import { BonusCard } from '../bonus-card';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import { redirect } from 'next/navigation';

const HeroIcon = () => (
    <div className="relative w-full h-full min-h-[300px] md:min-h-[400px]">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full animate-zoom-in-out" style={{ overflow: 'visible' }}>
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
                  <rect x="10" y="0" width="10" height="10" fill="transparent" />
                  <rect x="0" y="10" width="10" height="10" fill="transparent" />
                  <rect x="10" y="10" width="10" height="10" fill="hsl(var(--primary))" fillOpacity="0.1"/>
                </pattern>
            </defs>
            
            <g transform="translate(100 100) scale(1.4) rotate(15)">
                 <g transform="skewX(-20) scale(1.1)">
                    <rect x="-50" y="-50" width="100" height="100" fill="url(#grad1)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" rx="5" filter="url(#glow)" />
                    <rect x="-50" y="-50" width="100" height="100" fill="url(#chessboard)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" rx="5"/>
                 </g>
                 
                 <g className="animate-float" style={{ animationDelay: '0s' }}>
                    <text x="-30" y="-15" fontFamily="Poppins, sans-serif" fontSize="24" fontWeight="bold" fill="#fdee00" textAnchor="middle" stroke="#000" strokeWidth="0.5" >$</text>
                 </g>
                 <g className="animate-float" style={{ animationDelay: '1s' }}>
                     <text x="25" y="0" fontFamily="Poppins, sans-serif" fontSize="28" fontWeight="bold" fill="#fdee00" textAnchor="middle" stroke="#000" strokeWidth="0.5">$</text>
                 </g>
                 <g className="animate-float" style={{ animationDelay: '2s' }}>
                     <text x="-5" y="30" fontFamily="Poppins, sans-serif" fontSize="20" fontWeight="bold" fill="#fdee00" textAnchor="middle" stroke="#000" strokeWidth="0.5">$</text>
                </g>
            </g>
        </svg>
    </div>
)


export default function LandingPage() {
    const { user, loading } = useAuth();
 
    if (loading) {
        return null; // Or a loading spinner
    }

    if (user) {
        redirect('/dashboard');
    }
 
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
                        <Link href="/marketing/register">Become a Partner</Link>
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
                <HeroIcon />
            </div>
        </section>
      </main>
    </div>
  );
}
