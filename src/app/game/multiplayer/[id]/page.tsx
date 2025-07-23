
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
};

export default function MultiplayerGamePage() {
    const { id: roomId } = useParams();
    const router = useRouter();
    const { user, userData } = useAuth();
    const [room, setRoom] = useState<GameRoom | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!roomId) return;
        
        const roomRef = doc(db, 'game_rooms', roomId as string);
        const unsubscribe = onSnapshot(roomRef, (docSnap) => {
            if (docSnap.exists()) {
                const roomData = { id: docSnap.id, ...docSnap.data() } as GameRoom;
                setRoom(roomData);
            } else {
                // Room doesn't exist or was deleted
                router.push('/lobby');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [roomId, router]);

    const equipment = room?.gameType === 'chess' ? userData?.equipment?.chess : userData?.equipment?.checkers;

    if (loading || !room) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-96 w-96" />
                </div>
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

