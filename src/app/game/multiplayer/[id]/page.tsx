
'use client'
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, deleteDoc, updateDoc, increment, getDoc, writeBatch, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Share, Clock, Users, Swords, Wallet, LogIn } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


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
        color: 'w' | 'b';
    };
    player2?: {
        uid: string;
        name: string;
        color: 'w' | 'b';
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
    const [isJoining, setIsJoining] = useState(false);

    const isCreator = room?.createdBy.uid === user?.uid;
    const roomStatusRef = useRef(room?.status);
    const USDT_RATE = 310;

     useEffect(() => {
        roomStatusRef.current = room?.status;
    }, [room?.status]);

    useEffect(() => {
        if (!roomId || !user) {
             setLoading(false);
            return;
        }
        
        const roomRef = doc(db, 'game_rooms', roomId as string);
        const unsubscribe = onSnapshot(roomRef, async (docSnap) => {
            if (docSnap.exists()) {
                const roomData = { id: docSnap.id, ...docSnap.data() } as GameRoom;
                
                // If room is waiting, and we are not the creator, we might be a potential joiner
                if (roomData.status === 'waiting' && roomData.createdBy.uid !== user.uid) {
                    setRoom(roomData);
                } 
                // If room is active, only players should be here
                else if (roomData.players.includes(user.uid)) {
                    setRoom(roomData);
                } 
                // User is not authorized for this room unless it's a private room they are trying to join
                else if (roomData.isPrivate || roomData.status !== 'waiting') {
                    toast({ variant: 'destructive', title: 'Not Authorized', description: 'You are not a player in this room.' });
                    router.push('/lobby');
                    return;
                } else {
                    setRoom(roomData);
                }
            } else {
                toast({ title: 'Room Closed', description: "This game room no longer exists." });
                router.push('/lobby');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [roomId, user, router, toast]);

    const handleCancelRoom = useCallback(async (isAutoCancel = false) => {
        if (!roomId || !user || !room ) return;
    
        const batch = writeBatch(db);
        const roomRef = doc(db, 'game_rooms', roomId as string);
        
        try {
            // Re-fetch room data to ensure it's still waiting before cancelling
            const roomDoc = await getDoc(roomRef);
            if (!roomDoc.exists() || roomDoc.data()?.status !== 'waiting') {
                // The room has been joined or doesn't exist anymore, so do nothing.
                if (!isAutoCancel) router.push('/lobby');
                return; 
            }
    
            batch.delete(roomRef);

            // Only refund if there is a wager
            if (room.wager > 0) {
                const userRef = doc(db, 'users', user.uid);
                batch.update(userRef, { balance: increment(room.wager) });
                
                // Create a refund transaction
                const transactionRef = doc(collection(db, 'transactions'));
                batch.set(transactionRef, {
                    userId: user.uid,
                    type: 'payout',
                    amount: room.wager,
                    status: 'completed',
                    description: `Refund for cancelled ${room.gameType} game`,
                    gameRoomId: roomId,
                    createdAt: serverTimestamp()
                });
            }

            await batch.commit();
    
            if (isAutoCancel) {
                toast({ title: 'Room Expired', description: 'Your wager has been refunded.' });
            } else {
                toast({ title: 'Room Cancelled', description: 'Your wager has been refunded.' });
            }
            router.push(`/lobby/${room.gameType}`);
        } catch (error) {
            console.error('Failed to cancel room:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not cancel the room.' });
        }
    }, [roomId, user, room, router, toast]);
    

    // Timer for room expiration
    useEffect(() => {
        if (room?.status !== 'waiting' || !room.expiresAt || !isCreator) {
            return;
        }

        const interval = setInterval(() => {
            const now = new Date();
            const expiry = room.expiresAt.toDate();
            const diff = expiry.getTime() - now.getTime();
            if (diff <= 0) {
                setTimeLeft('00:00');
                clearInterval(interval);
                if (roomStatusRef.current === 'waiting') {
                    handleCancelRoom(true); 
                }
            } else {
                setTimeLeft(formatTime(Math.floor(diff / 1000)));
            }
        }, 1000);

        return () => clearInterval(interval);

    }, [room, isCreator, handleCancelRoom]);


    
    const handleJoinGame = async () => {
        if (!user || !userData || !room || isCreator) return;

        if(userData.balance < room.wager) {
            toast({ variant: 'destructive', title: "Insufficient Funds", description: "You don't have enough balance to join this game."});
            return;
        }

        setIsJoining(true);
        const roomRef = doc(db, 'game_rooms', room.id);
        const userRef = doc(db, 'users', user.uid);
        const batch = writeBatch(db);

        try {
             // Re-fetch room data to ensure it's still available before joining
            const currentRoomDoc = await getDoc(roomRef);
            if (!currentRoomDoc.exists() || currentRoomDoc.data()?.status !== 'waiting') {
                toast({ variant: "destructive", title: "Room Not Available", description: "This room is no longer available to join." });
                setIsJoining(false);
                router.push(`/lobby/${room.gameType}`);
                return;
            }

            // Deduct wager from joiner's balance
            batch.update(userRef, { balance: increment(-room.wager) });

            const creatorColor = room.createdBy.color;
            const joinerColor = creatorColor === 'w' ? 'b' : 'w';

            // Update room to start the game
            batch.update(roomRef, {
                status: 'in-progress',
                player2: {
                    uid: user.uid,
                    name: `${userData.firstName} ${userData.lastName}`,
                    color: joinerColor,
                },
                players: [...room.players, user.uid],
                capturedByP1: [],
                capturedByP2: [],
                moveHistory: [],
                currentPlayer: 'w', // White always starts
            });

            // Log wager transaction for joiner
            const transactionRef = doc(collection(db, 'transactions'));
            batch.set(transactionRef, {
                userId: user.uid,
                type: 'wager',
                amount: room.wager,
                status: 'completed',
                description: `Wager for ${room.gameType} game vs ${room.createdBy.name}`,
                gameRoomId: room.id,
                createdAt: serverTimestamp()
            });
            
            await batch.commit();
            
            toast({ title: "Game Joined!", description: "The match is starting now."});
            // The onSnapshot listener will automatically update the UI to the game board

        } catch (error) {
            console.error("Failed to join game:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not join the game. Your wager has been refunded."});
            // Refund the user if updating the room fails
            await updateDoc(userRef, { balance: increment(room.wager) });
            setIsJoining(false);
        }
    }


    // Effect to handle creator navigating away
    useEffect(() => {
        const creatorNavigatingAway = () => {
             if (isCreator && roomStatusRef.current === 'waiting') {
                 handleCancelRoom(true);
            }
        };
    
        window.addEventListener('beforeunload', creatorNavigatingAway);
    
        return () => {
            window.removeEventListener('beforeunload', creatorNavigatingAway);
            creatorNavigatingAway();
        };
    }, [isCreator, handleCancelRoom]);


    const equipment = room?.gameType === 'chess' ? userData?.equipment?.chess : userData?.equipment?.checkers;

    const copyGameId = () => {
        if(!roomId) return;
        navigator.clipboard.writeText(roomId as string);
        toast({ title: 'Copied!', description: 'Room ID copied to clipboard. Share it with your friend!' });
    }

    if (loading || !room || !user || !userData) {
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
        if(isCreator) {
            return (
                 <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
                    <Card className="w-full max-w-lg text-center p-8 bg-card/70 backdrop-blur-sm">
                        <CardContent className="space-y-6">
                             <div className="space-y-2">
                                 <h2 className="text-3xl font-bold">Waiting for Opponent</h2>
                                 <p className="text-muted-foreground">Your game room is ready. Share the Room ID with a friend to start.</p>
                             </div>
                            
                            <div className="p-4 rounded-lg bg-background space-y-2">
                                <p className="text-sm text-muted-foreground">Share this Room ID to invite someone</p>
                                <div className="flex items-center justify-center gap-4">
                                    <p className="font-mono text-lg text-primary truncate">{roomId}</p>
                                    <Button size="icon" variant="ghost" onClick={copyGameId}><Copy className="w-5 h-5"/></Button>
                                </div>
                            </div>

                             <div className="grid grid-cols-2 gap-4">
                                <Button size="lg" variant="outline" onClick={copyGameId}><Share className="mr-2"/>Share Room ID</Button>
                                <Button size="lg" variant="destructive" onClick={() => handleCancelRoom(false)}>Cancel Game & Refund</Button>
                            </div>
                            
                            <div className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                                <Clock className="w-3.5 h-3.5"/>
                                <span>This room will be closed in {timeLeft || '...'} if no one joins. Your wager will be refunded.</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )
        } else {
            // This is the joiner's view
            const hasEnoughBalance = userData.balance >= room.wager;

            return (
                 <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
                    <Card className="w-full max-w-lg p-8 bg-card/70 backdrop-blur-sm">
                        <CardHeader className="text-center">
                            <div className="flex justify-center mb-4">
                                 <Avatar className="h-20 w-20 border-2 border-primary">
                                    <AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="player avatar" />
                                    <AvatarFallback>{room.createdBy.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </div>
                            <CardTitle className="text-3xl">{room.createdBy.name} invites you to play!</CardTitle>
                            <CardDescription>Review the match details below and join the game.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <p className="text-sm text-muted-foreground">Game</p>
                                    <p className="text-lg font-bold capitalize flex items-center justify-center gap-2"><Swords /> {room.gameType}</p>
                                </div>
                                 <div>
                                    <p className="text-sm text-muted-foreground">Wager</p>
                                    <p className="text-lg font-bold">LKR {room.wager.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">~{(room.wager / USDT_RATE).toFixed(2)} USDT</p>
                                </div>
                            </div>
                            
                            {!hasEnoughBalance && (
                                 <Card className="bg-destructive/20 border-destructive text-center p-4">
                                    <CardTitle className="text-destructive">Insufficient Balance</CardTitle>
                                    <CardDescription className="text-destructive/80 mb-4">
                                        You need at least LKR {room.wager.toFixed(2)} to join. Your current balance is LKR {userData.balance.toFixed(2)}.
                                    </CardDescription>
                                     <Button asChild variant="destructive">
                                        <Link href="/dashboard/wallet"><Wallet className="mr-2"/> Top Up Wallet</Link>
                                    </Button>
                                </Card>
                            )}
                            
                            <Button 
                                size="lg" 
                                className="w-full"
                                disabled={!hasEnoughBalance || isJoining}
                                onClick={handleJoinGame}
                            >
                                {isJoining ? <><Loader2 className="animate-spin mr-2"/> Joining...</> : <><LogIn className="mr-2"/> Join Game & Start Match</>}
                            </Button>
                             <Button size="lg" variant="outline" className="w-full" onClick={() => router.push('/lobby')}>Back to Lobby</Button>
                        </CardContent>
                    </Card>
                </div>
            )
        }
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

    