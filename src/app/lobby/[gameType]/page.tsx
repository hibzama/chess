
'use client'

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, PlusCircle, Search, LogIn, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GameLobbyPage() {
    const params = useParams();
    const router = useRouter();
    const { gameType } = params;
    const gameName = typeof gameType === 'string' ? gameType.charAt(0).toUpperCase() + gameType.slice(1) : 'Game';

    const lobbyOptions = [
        {
            title: 'Create Room',
            description: 'Set up a new game and wait for an opponent.',
            icon: PlusCircle,
            action: () => router.push(`/lobby/${gameType}/create`)
        },
        {
            title: 'Find Room',
            description: 'Browse existing rooms and challenge a player.',
            icon: Search,
            action: () => { /* Placeholder for future implementation */ }
        },
        {
            title: 'Join Room',
            description: 'Enter a room code to join a specific game.',
            icon: LogIn,
            action: () => { /* Placeholder for future implementation */ }
        },
        {
            title: 'My Rooms',
            description: 'Check the status of your active and past games.',
            icon: Swords,
            action: () => { /* Placeholder for future implementation */ }
        }
    ];

    return (
        <div className="flex flex-col items-center w-full p-4">
             <div className="w-full max-w-5xl mb-8">
                <Link href="/lobby" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Game Selection</span>
                </Link>
            </div>

            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary">{gameName} Lobby</h1>
                <p className="mt-2 text-lg text-muted-foreground max-w-md mx-auto">Ready your strategy. The next battle awaits.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl">
                {lobbyOptions.map(option => (
                    <Card key={option.title} className="bg-card/50 hover:border-primary/50 transition-all flex flex-col text-center">
                        <CardHeader className="items-center">
                             <div className="p-3 bg-primary/10 rounded-full mb-4">
                                <option.icon className="w-8 h-8 text-primary" />
                            </div>
                            <CardTitle>{option.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                             <CardDescription>{option.description}</CardDescription>
                        </CardContent>
                        <div className="p-6 pt-0">
                            <Button className="w-full" onClick={option.action}>Select</Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
