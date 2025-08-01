
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BrainCircuit, Layers, DollarSign, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const TelegramIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
)

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
        <Dialog>
            <div className="flex flex-col items-center w-full p-4 min-h-screen">
                <div className="w-full max-w-4xl mb-8">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Dashboard</span>
                    </Link>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary">Earning on Nexbattle</h1>
                    <p className="mt-2 text-lg text-muted-foreground max-w-md mx-auto">Turn your strategic skills into real rewards. Choose your game to get started.</p>
                </div>
                 <div className="w-full max-w-4xl mb-12">
                    <Button asChild size="lg" className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                        <a href="https://t.me/nexbattlerooms" target="_blank" rel="noopener noreferrer">
                            <TelegramIcon className="mr-2 h-5 w-5" />
                            Join Public Rooms Group
                        </a>
                    </Button>
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
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full">How to Earn</Button>
                                </DialogTrigger>
                            </CardContent>
                            <CardFooter className="px-6 pb-6">
                                <Button className="w-full" onClick={option.action}>Start Earning</Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>

            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center gap-2"><DollarSign/> How Earning Works</DialogTitle>
                    <DialogDescription>
                        Understand the multiplayer rules and financial system before you play.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] p-4">
                    <div className="space-y-6 text-sm">
                        <h3 className="font-bold text-lg text-primary">The Multiplayer Mode</h3>
                        <p>
                            The Multiplayer mode is the competitive heart of Nexbattle. It allows you to play against real opponents from around the world for real rewards. Instead of playing for free like in Practice Mode, you invest a small amount from your wallet into each match. This investment becomes the "stakes" of the game. Winning not only proves your skill but also earns you a significant profit.
                        </p>

                        <h3 className="font-bold text-lg text-primary">Ways to Play</h3>
                        <div className="space-y-4 pl-4 border-l-2 border-primary">
                            <div>
                                <h4 className="font-semibold">1. Create a Room</h4>
                                <p className="text-muted-foreground">This option lets you be the host. You define the rules of the match, choosing the investment amount and game timer. You can make it a <span className="font-semibold text-foreground">Public Room</span>, visible to everyone, or a <span className="font-semibold text-foreground">Private Room</span> by sharing a unique Game ID with a friend.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold">2. Find a Room</h4>
                                <p className="text-muted-foreground">This is the public lobby where you can instantly join a game someone else has created. It displays a list of all available public games with their details. Simply find one you like and click "Join" to start immediately.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold">3. Join a Room</h4>
                                <p className="text-muted-foreground">This option is for private matches. If a friend sends you a unique Game ID, you can enter it here to join their specific game directly.</p>
                            </div>
                             <div>
                                <h4 className="font-semibold">4. My Rooms</h4>
                                <p className="text-muted-foreground">Your personal hub for all your ongoing games. You can cancel rooms you've created that are waiting for an opponent, or rejoin an active match if you get disconnected.</p>
                            </div>
                        </div>

                         <h3 className="font-bold text-lg text-primary">The Financial System</h3>
                         <div className="space-y-4 pl-4 border-l-2 border-accent">
                            <div>
                                <h4 className="font-semibold">The Investment (Stake)</h4>
                                <p className="text-muted-foreground">When you create or join a game, the wager amount is deducted from your wallet and held by the system until the match concludes. This ensures both players are committed.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold">Winner's Reward: 180% Payout</h4>
                                <p className="text-muted-foreground">If you win by checkmate or the opponent's timer runs out, you receive 180% of your initial stake back. For example, a LKR 100 stake returns LKR 180.</p>
                            </div>
                             <div>
                                <h4 className="font-semibold">Draws: 90% Refund</h4>
                                <p className="text-muted-foreground">If a game ends in a draw, both players receive 90% of their investment back. In a LKR 100 game, you get LKR 90 refunded.</p>
                            </div>
                             <div>
                                <h4 className="font-semibold">Forfeits & Abandonment (Fair Play Payouts)</h4>
                                <p className="text-muted-foreground">If a player resigns or abandons a match, the player who <span className="text-foreground font-semibold">did not leave</span> receives a <span className="text-green-400 font-semibold">105% payout</span>. The player who <span className="text-foreground font-semibold">did leave</span> still gets a <span className="text-yellow-400 font-semibold">75% refund</span>. This discourages abandonment while protecting players from total losses due to disconnections.</p>
                            </div>
                        </div>

                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
