
'use client'
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Share, Clock, Users } from 'lucide-react';

// Game Components
import ChessBoard from '@/components/game/chess-board';
import CheckersBoard from '@/components/game/checkers-board';
import GameLayout from '@/components/game/game-layout';
import { GameProvider } from '@/context/game-context';
import { formatTime } from '@/lib/time';

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
    expiresAt: any;
    isPrivate: boolean;
};

export default function MultiplayerGamePage() {
    const { id: roomId } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user, userData } = useAuth();
    const [room, setRoom] = useState<GameRoom | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState('');

    const isCreator = room?.createdBy.uid === user?.uid;
    const hasNavigatedAway = useRef(false);

    useEffect(() => {
        if (!roomId || !user) {
             setLoading(false);
            return;
        }
        
        const roomRef = doc(db, 'game_rooms', roomId as string);
        const unsubscribe = onSnapshot(roomRef, (docSnap) => {
            if (docSnap.exists()) {
                const roomData = { id: docSnap.id, ...docSnap.data() } as GameRoom;
                if (!roomData.players.includes(user.uid)) {
                    toast({ variant: 'destructive', title: 'Error', description: 'You are not a player in this room.' });
                    router.push('/lobby');
                    return;
                }
                setRoom(roomData);
            } else {
                 if (!hasNavigatedAway.current) {
                    toast({ title: 'Room Closed', description: "This game room no longer exists." });
                    router.push('/lobby');
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [roomId, user, router, toast]);

    // Timer for room expiration
    useEffect(() => {
        if (room?.status !== 'waiting' || !room.expiresAt) {
            return;
        }

        const interval = setInterval(() => {
            const now = new Date();
            const expiry = room.expiresAt.toDate();
            const diff = expiry.getTime() - now.getTime();
            if (diff <= 0) {
                setTimeLeft('00:00');
                clearInterval(interval);
                 if (isCreator) {
                     handleCancelRoom(true); // Auto-cancel if expired
                 }
            } else {
                setTimeLeft(formatTime(Math.floor(diff / 1000)));
            }
        }, 1000);

        return () => clearInterval(interval);

    }, [room, isCreator]);


    const handleCancelRoom = async (isAutoCancel = false) => {
        if (!roomId || !user || !room || room.createdBy.uid !== user.uid) return;

        hasNavigatedAway.current = true;
        const roomRef = doc(db, 'game_rooms', roomId as string);
        const userRef = doc(db, 'users', user.uid);
        
        try {
            await deleteDoc(roomRef);
            await updateDoc(userRef, { balance: increment(room.wager) });
            if (!isAutoCancel) {
                toast({ title: 'Room Cancelled', description: 'Your wager has been refunded.' });
                router.push('/lobby');
            }
        } catch (error) {
            console.error('Failed to cancel room:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not cancel the room.' });
        }
    };

    // Effect to handle creator navigating away
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isCreator && room?.status === 'waiting') {
                handleCancelRoom(true);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
             window.removeEventListener('beforeunload', handleBeforeUnload);
             if (isCreator && room?.status === 'waiting' && !hasNavigatedAway.current) {
                 handleCancelRoom(true);
             }
        };
    }, [isCreator, room]);


    const equipment = room?.gameType === 'chess' ? userData?.equipment?.chess : userData?.equipment?.checkers;

    const copyGameId = () => {
        if(!roomId) return;
        navigator.clipboard.writeText(roomId as string);
        toast({ title: 'Copied!', description: 'Game ID copied to clipboard. Share it with your friend!' });
    }

    if (loading || !room) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading Your Game...</p>
                </div>
            </div>
        )
    }

    if (room.status === 'waiting') {
        return (
             <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
                <Card className="w-full max-w-lg text-center p-8 bg-card/70 backdrop-blur-sm">
                    <CardContent className="space-y-6">
                         <div className="space-y-2">
                             <h2 className="text-3xl font-bold">Waiting for Opponent</h2>
                             <p className="text-muted-foreground">Your game room is ready. Wait for an opponent to join.</p>
                         </div>
                        
                        <div className="p-4 rounded-lg bg-background space-y-2">
                            <p className="text-sm text-muted-foreground">Game ID</p>
                            <div className="flex items-center justify-center gap-4">
                                <p className="font-mono text-xl text-primary truncate">{roomId}</p>
                                <Button size="icon" variant="ghost" onClick={copyGameId}><Copy className="w-5 h-5"/></Button>
                            </div>
                        </div>

                         <div className="grid grid-cols-2 gap-4">
                            <Button size="lg" variant="outline" onClick={copyGameId}><Share className="mr-2"/>Share Invite Link</Button>
                            <Button size="lg" variant="destructive" onClick={() => handleCancelRoom(false)}>Cancel Game & Refund</Button>
                        </div>
                        
                        <div className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                            <Clock className="w-3.5 h-3.5"/>
                            <span>This room will be closed in {timeLeft || '...'} if no one joins.</span>
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
