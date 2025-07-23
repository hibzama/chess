
'use client'

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BrainCircuit, Layers } from 'lucide-react';

export default function EarningHomePage() {
    const router = useRouter();

    const handleStartEarning = (game: 'chess' | 'checkers') => {
        router.push(`/lobby/${game}`);
    };

    const earningOptions = [
        {
            name: 'Chess',
            description: 'The classic game of kings. Outwit your opponent to claim victory and rewards.',
            icon: <BrainCircuit className="w-12 h-12 text-primary" />,
            action: () => handleStartEarning('chess'),
        },
        {
            name: 'Checkers',
            description: 'A fast-paced game of jumps and strategy. Capture all pieces to win.',
            icon: <Layers className="w-12 h-12 text-primary" />,
            action: () => handleStartEarning('checkers'),
        }
    ]

    return (
        <div className="flex flex-col items-center w-full p-4 min-h-screen">
            <div className="w-full max-w-4xl mb-8">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Dashboard</span>
                </Link>
            </div>

            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary">Earning on Nexbattle</h1>
                <p className="mt-2 text-lg text-muted-foreground max-w-md mx-auto">Turn your strategic skills into real rewards. Choose your game to get started.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                {earningOptions.map((option) => (
                     <Card key={option.name} className="bg-card/50 hover:border-primary/50 transition-all flex flex-col">
                        <CardHeader className="items-center text-center">
                            <div className="p-3 bg-primary/10 rounded-full mb-4">
                                {option.icon}
                            </div>
                            <CardTitle>{option.name}</CardTitle>
                            <CardDescription>{option.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="w-full px-6">
                             <Button variant="outline" className="w-full" disabled>How to Earn</Button>
                        </CardContent>
                        <CardFooter className="px-6 pb-6">
                            <Button className="w-full" onClick={option.action}>Start Earning</Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
