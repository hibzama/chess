
'use client'
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

// Game Components
import ChessBoard from '@/components/game/chess-board';
import CheckersBoard from '@/components/game/checkers-board';
import GameLayout from '@/components/game/game-layout';
import { GameProvider } from '@/context/game-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type GameRoom = {
    id: string;
    gameType: 'chess' | 'checkers';
    wager: number;
    timeControl: number;
    status: 'waiting' | 'in-progress' | 'completed';
    createdBy: {
        uid: string;
        name: string;
    };
    player2?: {
        uid: string;
        name: string;
    };
    players: string[];
    createdAt: any;
    isPrivate: boolean;
};

export default function MultiplayerGamePage() {
    const { id: roomId } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user, userData } = useAuth();
    const [room, setRoom] = useState<GameRoom | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!roomId || !user) return;
        
        const roomRef = doc(db, 'game_rooms', roomId as string);
        const unsubscribe = onSnapshot(roomRef, (docSnap) => {
            if (docSnap.exists()) {
                const roomData = { id: docSnap.id, ...docSnap.data() } as GameRoom;
                // Security check: ensure the current user is part of this room
                if (!roomData.players.includes(user.uid)) {
                    toast({ variant: 'destructive', title: 'Error', description: 'You are not a player in this room.' });
                    router.push('/lobby');
                    return;
                }
                setRoom(roomData);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: "This game room doesn't exist anymore." });
                router.push('/lobby');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [roomId, router, user, toast]);

    const equipment = room?.gameType === 'chess' ? userData?.equipment?.chess : userData?.equipment?.checkers;

    const copyGameId = () => {
        if(!roomId) return;
        navigator.clipboard.writeText(roomId as string);
        toast({ title: 'Copied!', description: 'Game ID copied to clipboard. Share it with your friend!' });
    }

    if (loading || !room) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading Your Game...</p>
                </div>
            </div>
        )
    }

    if (room.status === 'waiting') {
        return (
             <div className="flex items-center justify-center h-screen">
                <Card className="w-full max-w-md text-center p-8">
                    <CardContent className="space-y-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                        <h2 className="text-2xl font-bold">Waiting for Opponent...</h2>
                        <p className="text-muted-foreground">The game will begin automatically once another player joins.</p>
                        
                        {room.isPrivate && (
                            <div className="pt-4 space-y-2">
                                <p className="font-semibold">This is a private room.</p>
                                <p className="text-sm">Share this Game ID with your friend:</p>
                                <div className="p-3 rounded-md bg-muted font-mono text-lg">{roomId}</div>
                                <Button onClick={copyGameId} className="w-full">Copy Game ID</Button>
                            </div>
                        )}

                        <div className="pt-4">
                             <Button variant="destructive" onClick={() => router.push('/lobby')}>Cancel & Leave Room</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <GameProvider gameType={room.gameType}>
            <GameLayout gameType={room.gameType === 'chess' ? 'Chess' : 'Checkers'}>
                {room.gameType === 'chess' ? (
                     <ChessBoard boardTheme={equipment?.boardTheme} pieceStyle={equipment?.pieceStyle} />
                ) : (
                    <CheckersBoard boardTheme={equipment?.boardTheme} pieceStyle={equipment?.pieceStyle} />
                )}
            </GameLayout>
        </GameProvider>
    );
}

