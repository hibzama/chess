'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Bot, BrainCircuit, Layers, Spade } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function PracticeArenaPage() {
    const router = useRouter();
    const { gameAvailability, user } = useAuth();

    const handleStartGame = (game: 'chess' | 'checkers' | 'omi') => {
        if(game === 'chess' || game === 'checkers') {
            router.push(`/practice/${game}/setup`);
        } else {
            router.push(`/practice/${game}`);
        }
    };

    const practiceOptions = [
        {
            name: 'Practice Chess',
            description: 'The classic game of strategy.',
            icon: <BrainCircuit className="w-12 h-12 text-primary" />,
            action: () => handleStartGame('chess'),
            enabled: gameAvailability.practiceChess,
        },
        {
            name: 'Practice Checkers',
            description: 'A fun, strategic game of jumps.',
            icon: <Layers className="w-12 h-12 text-primary" />,
            action: () => handleStartGame('checkers'),
            enabled: gameAvailability.practiceCheckers,
        },
        {
            name: 'Practice Omi',
            description: 'The classic Sri Lankan card game.',
            icon: <Spade className="w-12 h-12 text-primary" />,
            action: () => handleStartGame('omi'),
            enabled: gameAvailability.practiceOmi,
        }
    ].filter(option => option.enabled);

    return (
        <div className="flex flex-col items-center w-full p-4 min-h-screen">
            <div className="w-full max-w-5xl mb-8">
                 <Link href={user ? "/dashboard" : "/"} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to {user ? 'Dashboard' : 'Home'}</span>
                </Link>
            </div>

            <div className="text-center mb-12">
                <div className="flex justify-center mb-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                        <Bot className="w-10 h-10 text-primary" />
                    </div>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-primary to-primary/80">Practice Arena</h1>
                <p className="mt-2 text-lg text-muted-foreground max-w-md mx-auto">Hone your skills against our AI opponent for free. No stakes, just pure practice.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
                {practiceOptions.length > 0 ? practiceOptions.map((option) => (
                     <Card key={option.name} className="bg-card/50 hover:border-primary/50 transition-all flex flex-col">
                        <CardHeader className="items-center text-center">
                            <div className="p-3 bg-primary/10 rounded-full mb-4">
                                {option.icon}
                            </div>
                            <CardTitle>{option.name}</CardTitle>
                            <CardDescription>{option.description}</CardDescription>
                        </CardHeader>
                        <CardFooter className="mt-auto">
                            <Button className="w-full" onClick={option.action}>Start Practice</Button>
                        </CardFooter>
                    </Card>
                )) : (
                     <Card className="md:col-span-3 text-center p-8 bg-card/50">
                        <CardTitle>Practice Mode is Currently Disabled</CardTitle>
                        <CardDescription>The admin has temporarily disabled practice games. Please check back later.</CardDescription>
                    </Card>
                )}
            </div>
        </div>
    );
}
