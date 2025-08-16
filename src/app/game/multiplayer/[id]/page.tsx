
'use client'
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot, getDoc, collection, serverTimestamp, Timestamp, updateDoc, increment, query, where, getDocs, runTransaction, deleteDoc, DocumentData } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Share, Clock, Users, Swords, Wallet, LogIn, AlertTriangle, Bell, MessageSquare, Gift } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertTitle } from '@/components/ui/alert';
import GameChat from '@/components/game/game-chat';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// Game Components
import ChessBoard from '@/components/game/chess-board';
import CheckersBoard from '@/components/game/checkers-board';
import GameLayout from '@/components/game/game-layout';
import { GameProvider, useGame } from '@/context/game-context';
import { formatTime } from '@/lib/time';
import { cn } from '@/lib/utils';

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
        photoURL?: string;
    };
    player2?: {
        uid: string;
        name: string;
        color: 'w' | 'b';
        photoURL?: string;
    };
    players: string[];
    createdAt: any;
    expiresAt: Timestamp;
    isPrivate: boolean;
    p1Time: number;
    p2Time: number;
    turnStartTime: Timestamp;
    winner?: {
        uid: string | null;
        resignerId?: string | null;
        method: 'checkmate' | 'timeout' | 'resign' | 'draw' | 'piece-capture';
        resignerPieceCount?: number;
    };
    draw?: boolean;
    payoutTransactionId?: string;
};

function NavigationGuard() {
    const { resign, gameOver } = useGame();
    const router = useRouter();
    const [showConfirm, setShowConfirm] = useState(false);
    const [nextUrl, setNextUrl] = useState<string | null>(null);

    const handleConfirm = useCallback(() => {
        if(nextUrl) {
            router.push(nextUrl);
        } else {
            router.back();
        }
        resign(); 
    }, [resign, nextUrl, router]);

    const handleCancel = useCallback(() => {
        setNextUrl(null);
        setShowConfirm(false);
    }, []);

    const handleAnchorClick = useCallback((e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      if (anchor && anchor.href && anchor.target !== '_blank') {
        const url = new URL(anchor.href);
        if(url.pathname.startsWith('/game/multiplayer')) return;

        e.preventDefault();
        setNextUrl(anchor.href);
        setShowConfirm(true);
      }
    }, []);

     useEffect(() => {
        if(gameOver) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };

        const handlePopState = (e: PopStateEvent) => {
            e.preventDefault();
            history.pushState(null, '', window.location.href); 
            setShowConfirm(true);
        };
    
        history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', handlePopState);
        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('click', handleAnchorClick, true);
    
        return () => {
          window.removeEventListener('popstate', handlePopState);
          window.removeEventListener('beforeunload', handleBeforeUnload);
          document.removeEventListener('click', handleAnchorClick, true);
        };
      }, [gameOver, handleAnchorClick]);


    return (
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle/> Leave Game?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Leaving this page will forfeit the match. This is treated as a resignation. Are you sure you want to leave?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleCancel}>Stay in Game</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm}>Leave & Resign</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

function MultiplayerGame() {
    const { id: roomId } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user, userData } = useAuth();
    const { isGameLoading, gameOver, room } = useGame();
    const [isJoining, setIsJoining] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    
    const isCreator = room?.createdBy.uid === user?.uid;
    const roomStatusRef = useRef(room?.status);
    const USDT_RATE = 310;
    
    const hasSufficientFunds = room ? (userData?.balance ?? 0) >= room.wager : false;

    useEffect(() => {
        roomStatusRef.current = room?.status;
    }, [room?.status]);
    
    const handleCancelRoom = useCallback(async (isAutoCancel = false) => {
        if (!roomId || !user || !room || room.status !== 'waiting') return;
    
        const roomRef = doc(db, 'game_rooms', roomId as string);
    
        try {
            await deleteDoc(roomRef);
    
            if (isAutoCancel) {
                toast({ title: 'Room Expired', description: 'The game room has been closed.' });
            } else {
                toast({ title: 'Room Cancelled', description: 'Your game room has been cancelled.' });
            }
            router.push(`/lobby/${room.gameType}`);
        } catch (error) {
            console.error('Failed to cancel room:', error);
            if (!isAutoCancel) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not cancel the room.' });
            }
        }
    }, [roomId, user, room, router, toast]);
    

    useEffect(() => {
        if (!room || room?.status !== 'waiting' || !room.expiresAt || room.createdBy.uid !== user?.uid) {
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

    }, [room, user, handleCancelRoom]);


    const handleJoinGame = async () => {
        if (!user || !userData || !room || room.createdBy.uid === user.uid) return;
    
        if(!hasSufficientFunds) {
            toast({ variant: "destructive", title: "Insufficient Funds", description: `You don't have enough balance.`});
            return;
        }
    
        setIsJoining(true);

        try {
            const joinGameFunction = httpsCallable(functions, 'joinGame');
            await joinGameFunction({ roomId: room.id, fundingWallet: 'main' });
            toast({ title: "Game Joined!", description: "The match is starting now."});
    
        } catch (error: any) {
            console.error("Failed to join game:", error);
            toast({ variant: 'destructive', title: "Error Joining Game", description: error.message });
             if (error.code === 'not-found' && error.message === 'Room not available.') {
                 router.push(`/lobby/${room.gameType}`);
             }
        } finally {
            setIsJoining(false);
        }
    }

    if (isGameLoading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading Your Game...</p>
                </div>
            </div>
        )
    }

    if (!room || !user || !userData) return null;

    const equipment = room.gameType === 'chess' ? userData?.equipment?.chess : userData?.equipment?.checkers;

    const copyGameId = () => {
        if(!roomId) return;
        navigator.clipboard.writeText(roomId as string);
        toast({ title: 'Copied!', description: 'Room ID copied to clipboard. Share it with your friend!' });
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
                                <Button size="lg" variant="destructive" onClick={() => handleCancelRoom(false)}>Cancel Game</Button>
                            </div>
                            
                            <div className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                                <Clock className="w-3.5 h-3.5"/>
                                <span>This room will be closed in {timeLeft || '...'} if no one joins.</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )
        } else {
            return (
                 <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
                    <Card className="w-full max-w-lg p-8 bg-card/70 backdrop-blur-sm">
                        <CardHeader className="text-center">
                            <div className="flex justify-center mb-4">
                                 <Avatar className="h-20 w-20 border-2 border-primary">
                                    <AvatarImage src={room.createdBy.photoURL} />
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
                            
                            {!hasSufficientFunds && (
                                 <Card className="bg-destructive/20 border-destructive text-center p-4">
                                    <CardTitle className="text-destructive">Insufficient Balance</CardTitle>
                                    <CardDescription className="text-destructive/80 mb-4">
                                        You need at least LKR {room.wager.toFixed(2)} in your wallet to join.
                                    </CardDescription>
                                     <Button asChild variant="destructive">
                                        <Link href="/dashboard/wallet"><Wallet className="mr-2"/> Top Up Wallet</Link>
                                    </Button>
                                </Card>
                            )}
                            
                            <Button 
                                size="lg" 
                                className="w-full"
                                disabled={!hasSufficientFunds || isJoining}
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
        <>
        {!gameOver && <NavigationGuard />}
         <GameLayout
            gameType={room.gameType === 'chess' ? 'Chess' : 'Checkers'}
            headerContent={
                <div className="text-center w-full max-w-lg mx-auto">
                    <h1 className="text-3xl font-bold">Multiplayer Match</h1>
                    <p className="text-muted-foreground">LKR {room.wager.toFixed(2)} Stakes • {room.timeControl / 60} minutes per player</p>
                    <Alert className="mt-4 text-left border-yellow-300/50 bg-yellow-300/10 text-yellow-300">
                        <Clock className="w-4 h-4 !text-yellow-300"/>
                        <AlertTitle className="text-yellow-300">The first player whose timer runs out loses the game. Play quick, manage your time, and win!</AlertTitle>
                    </Alert>
                </div>
            }
        >
            {room.gameType === 'chess' ? (
                 <ChessBoard boardTheme={equipment?.boardTheme} pieceStyle={equipment?.pieceStyle} />
            ) : (
                <CheckersBoard boardTheme={equipment?.boardTheme} pieceStyle={equipment?.pieceStyle} />
            )}
        </GameLayout>
        </>
    );
}

export default function MultiplayerGamePage() {
    const { id: roomId } = useParams();
    const [gameType, setGameType] = useState<'chess' | 'checkers' | null>(null);

    useEffect(() => {
        const fetchGameType = async () => {
            if (typeof roomId !== 'string') return;
            try {
                const roomRef = doc(db, 'game_rooms', roomId);
                const roomSnap = await getDoc(roomRef);
                if (roomSnap.exists()) {
                    setGameType(roomSnap.data().gameType);
                }
            } catch (e) {
                console.error("Could not fetch game type", e);
            }
        }
        fetchGameType();
    }, [roomId]);

    if (!gameType) {
         return (
            <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading Your Game...</p>
                </div>
            </div>
        )
    }
    
    return (
         <GameProvider gameType={gameType}>
            <MultiplayerGame />
        </GameProvider>
    )
}
