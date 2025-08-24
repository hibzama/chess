
'use client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Layers, Puzzle, ArrowRight, Target, Crown, Shield, Zap } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { Skeleton } from '@/components/ui/skeleton';

const PuzzleCard = ({ title, description, icon, href }: { title: string, description: string, icon: React.ReactNode, href: string }) => (
    <Card className="flex flex-col">
        <CardHeader className="flex-grow">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                    {icon}
                </div>
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardFooter>
            <Button asChild variant="outline" className="w-full">
                <Link href={href}>Start Training <ArrowRight className="ml-2"/></Link>
            </Button>
        </CardFooter>
    </Card>
);

const GamePuzzles = ({ gameName, gameIcon, puzzles }: { gameName: string, gameIcon: React.ReactNode, puzzles: any[] }) => (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">{gameIcon}</div>
            <h2 className="text-3xl font-bold">{gameName} Puzzles</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {puzzles.map(puzzle => (
                <PuzzleCard key={puzzle.title} {...puzzle} />
            ))}
        </div>
    </div>
);

export default function PuzzlesPage() {
    const { gameAvailability, loading } = useAuth();
    
    const chessPuzzles = [
        { title: 'Mate in 1', description: 'Find the winning checkmate in a single move.', icon: <Target className="w-6 h-6 text-primary"/>, href: '/puzzles/chess/mate-in-1' },
        { title: 'Winning Material', description: 'Find the best move to gain a material advantage.', icon: <Crown className="w-6 h-6 text-primary"/>, href: '/puzzles/chess/winning-material' },
        { title: 'Survival', description: 'Find the only move to escape a checkmate threat.', icon: <Shield className="w-6 h-6 text-primary"/>, href: '/puzzles/chess/survival' },
        { title: 'Puzzle Rush', description: 'Solve as many puzzles as you can against the clock.', icon: <Zap className="w-6 h-6 text-primary"/>, href: '/puzzles/chess/puzzle-rush' },
    ];

    const checkersPuzzles = [
        { title: 'Forced Capture', description: 'Find the sequence of jumps to capture the most pieces.', icon: <Target className="w-6 h-6 text-primary"/>, href: '/puzzles/checkers/forced-capture' },
        { title: 'King Me', description: 'Find the path to promote one of your pieces to a king.', icon: <Crown className="w-6 h-6 text-primary"/>, href: '/puzzles/checkers/king-me' },
        { title: 'Defensive Stand', description: 'Find the correct move to block your opponent from winning.', icon: <Shield className="w-6 h-6 text-primary"/>, href: '/puzzles/checkers/defensive-stand' },
        { title: 'Position Advantage', description: 'Solve puzzles to gain a positional advantage.', icon: <Zap className="w-6 h-6 text-primary"/>, href: '/puzzles/checkers/position-advantage' },
    ];

    if (loading) {
        return <Skeleton className="w-full h-96" />;
    }

    return (
        <div className="space-y-12">
            <div className="text-center">
                <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10">
                        <Puzzle className="w-10 h-10 text-primary" />
                    </div>
                </div>
                <h1 className="text-4xl font-bold tracking-tight">Puzzle Training</h1>
                <p className="text-muted-foreground mt-2">Sharpen your mind and improve your tactical vision with our collection of puzzles.</p>
            </div>
            
            <div className="space-y-12">
                {gameAvailability.practiceChess && <GamePuzzles gameName="Chess" gameIcon={<BrainCircuit className="w-8 h-8 text-primary" />} puzzles={chessPuzzles} />}
                {gameAvailability.practiceCheckers && <GamePuzzles gameName="Checkers" gameIcon={<Layers className="w-8 h-8 text-primary" />} puzzles={checkersPuzzles} />}
            </div>
        </div>
    );
}
