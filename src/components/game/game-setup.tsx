
'use client'
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useGame } from '@/context/game-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Bot, Crown, Square, Timer, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChessPiecePreview } from './chess-piece-preview';
import { CheckersPiecePreview } from './checkers-piece-preview';


type GameSetupProps = {
    gameType: 'chess' | 'checkers';
}

export function GameSetup({ gameType }: GameSetupProps) {
    const router = useRouter();
    const { userData } = useAuth();
    const { setupGame } = useGame();
    
    const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
    const [timeLimit, setTimeLimit] = useState(900); // 15 minutes in seconds
    const [difficulty, setDifficulty] = useState('intermediate');

    const equipment = gameType === 'chess' ? userData?.equipment?.chess : userData?.equipment?.checkers;

    const handleStartGame = () => {
        setupGame(playerColor, timeLimit, difficulty);
        router.push(`/game/${gameType}`);
    }

    const title = gameType === 'chess' ? 'Play Chess vs Bot' : 'Play Checkers vs Bot';
    const description = `Practice your ${gameType} skills for free.`;

    return (
        <div className="flex flex-col w-full p-4 min-h-screen items-center">
            <div className="w-full max-w-4xl mb-8 self-start">
                 <Link href="/practice" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Practice Arena</span>
                </Link>
            </div>
             <div className="text-center mb-8">
                <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
                <p className="text-muted-foreground">{description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5"/> Game Settings</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="mb-2 font-semibold text-sm">Your Color</h3>
                                <div className="grid grid-cols-2 gap-4">
                                     <button onClick={() => setPlayerColor('w')} className={cn("p-4 rounded-lg border-2 flex flex-col items-center justify-center gap-2", playerColor === 'w' ? 'border-primary' : '')}>
                                        <Square className="w-8 h-8"/>
                                        <span>White</span>
                                        <span className="text-xs text-muted-foreground">First move</span>
                                    </button>
                                     <button onClick={() => setPlayerColor('b')} className={cn("p-4 rounded-lg border-2 flex flex-col items-center justify-center gap-2", playerColor === 'b' ? 'border-primary' : '')}>
                                        <Square className="w-8 h-8 fill-current"/>
                                        <span>Black</span>
                                        <span className="text-xs text-muted-foreground">Second move</span>
                                    </button>
                                </div>
                            </div>
                             <div>
                                <h3 className="mb-2 font-semibold text-sm">Bot Difficulty</h3>
                                <Select value={difficulty} onValueChange={setDifficulty}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select difficulty" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="easy">Easy</SelectItem>
                                        <SelectItem value="intermediate">Intermediate</SelectItem>
                                        <SelectItem value="hard">Hard</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div>
                                <h3 className="mb-2 font-semibold text-sm">Time Limit</h3>
                                 <Select value={String(timeLimit)} onValueChange={(val) => setTimeLimit(Number(val))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select time limit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="300">5 Minutes</SelectItem>
                                        <SelectItem value="600">10 Minutes</SelectItem>
                                        <SelectItem value="900">15 Minutes</SelectItem>
                                        <SelectItem value="1800">30 Minutes</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Equipment</CardTitle>
                            <CardDescription>Your currently selected board and piece style.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {gameType === 'chess' ? (
                                <ChessPiecePreview boardTheme={equipment?.boardTheme} pieceStyle={equipment?.pieceStyle} />
                            ) : (
                                <CheckersPiecePreview boardTheme={equipment?.boardTheme} pieceStyle={equipment?.pieceStyle} />
                            )}
                             <Button variant="outline" className="w-full mt-4" asChild>
                                <Link href="/dashboard/equipment">Change Equipment</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Button size="lg" className="mt-8 w-full max-w-4xl" onClick={handleStartGame}>
                Start Game vs {gameType === 'chess' ? 'Chess' : 'Checkers'} Bot
            </Button>
        </div>
    );
}
