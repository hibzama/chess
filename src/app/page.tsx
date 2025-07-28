'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Download, Gamepad2 } from 'lucide-react';

const Feature = ({ text }: { text: string }) => (
    <div className="flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-accent" />
        <span className="text-muted-foreground">{text}</span>
    </div>
);


export default function LandingPage() {
 
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex flex-col items-center justify-center p-4 text-center" style={{ 
          backgroundImage: "url('/background-pattern.svg')", 
          backgroundSize: 'cover', 
          backgroundPosition: 'center'
      }}>
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
                        <Download className="mr-2"/> Download APK
                    </Button>
                </div>
            </div>
             <div className="relative">
                <img src="/hero-image.png" alt="Gaming representation" className="w-full max-w-md mx-auto" data-ai-hint="gaming collage"/>
             </div>
        </div>
      </main>
    </div>
  );
}
