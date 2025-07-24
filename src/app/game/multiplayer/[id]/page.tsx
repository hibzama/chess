

'use client'
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc, writeBatch, collection, serverTimestamp, Timestamp, updateDoc, increment, query, where, getDocs, runTransaction, deleteDoc, DocumentReference, DocumentData } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Share, Clock, Users, Swords, Wallet, LogIn, AlertTriangle, Bell, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertTitle } from '@/components/ui/alert';
import GameChat from '@/components/game/game-chat';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


// Game Components
import ChessBoard from '@/components/game/chess-board';
import CheckersBoard from '@/components/game/checkers-board';
import GameLayout from '@/components/game/game-layout';
import { GameProvider, useGame } from '@/context/game-context';
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
    expiresAt: Timestamp;
    isPrivate: boolean;
    p1Time: number;
    p2Time: number;
    turnStartTime: Timestamp;
    winner?: {
        uid: string | null;
        resignerId?: string | null;
        method: 'checkmate' | 'timeout' | 'resign' | 'draw' | 'piece-capture';
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

function MultiplayerGamePageContent() {
    const { id: roomId } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user, userData } = useAuth();
    const { gameOver } = useGame();
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
                
                if (roomData.status === 'completed') {
                    setRoom(roomData);
                }
                // If room is waiting, and we are not the creator, we might be a potential joiner
                else if (roomData.status === 'waiting' && roomData.createdBy.uid !== user.uid) {
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
                if (roomStatusRef.current !== 'completed') {
                    toast({ title: 'Room Closed', description: "This game room no longer exists." });
                }
                router.push('/lobby');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [roomId, user, router, toast]);

    const handleCancelRoom = useCallback(async (isAutoCancel = false) => {
        if (!roomId || !user || !room || room.status !== 'waiting') return;
    
        const roomRef = doc(db, 'game_rooms', roomId as string);
    
        try {
            const roomDoc = await getDoc(roomRef);
            if (!roomDoc.exists() || roomDoc.data()?.status !== 'waiting') {
                if (!isAutoCancel) router.push('/lobby');
                return;
            }
    
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
            toast({ variant: "destructive", title: "Insufficient Funds", description: "You don't have enough balance to join this game."});
            return;
        }
    
        setIsJoining(true);
        const roomRef = doc(db, 'game_rooms', room.id);

        try {
            await runTransaction(db, async (transaction) => {
                const currentRoomDoc = await transaction.get(roomRef);
                if (!currentRoomDoc.exists() || currentRoomDoc.data()?.status !== 'waiting') {
                    throw new Error("Room not available");
                }
                const roomData = currentRoomDoc.data();
        
                const creatorRef = doc(db, 'users', roomData.createdBy.uid);
                const joinerRef = doc(db, 'users', user.uid);
        
                const [creatorDoc, joinerDoc] = await Promise.all([
                    transaction.get(creatorRef),
                    transaction.get(joinerRef)
                ]);
        
                if (!creatorDoc.exists() || !joinerDoc.exists()) {
                    throw new Error("One of the players does not exist");
                }
        
                const playersWithData = [
                    { id: creatorDoc.id, data: creatorDoc.data(), name: roomData.createdBy.name },
                    { id: joinerDoc.id, data: joinerDoc.data(), name: `${joinerDoc.data().firstName} ${joinerDoc.data().lastName}` }
                ];
        
                const referralIdsToFetch = new Set<string>();
                for (const player of playersWithData) {
                    if (player.data.referralChain) {
                        player.data.referralChain.forEach((refId: string) => referralIdsToFetch.add(refId));
                    } 
                    else if (player.data.referredBy) {
                        referralIdsToFetch.add(player.data.referredBy);
                    }
                }
        
                const referralDocs = await Promise.all(
                    Array.from(referralIdsToFetch).map(id => transaction.get(doc(db, 'users', id)))
                );
        
                const referralDataMap = new Map<string, DocumentData>();
                referralDocs.forEach(docSnap => {
                    if (docSnap.exists()) {
                        referralDataMap.set(docSnap.id, docSnap.data());
                    }
                });

                const creatorColor = roomData.createdBy.color;
                const joinerColor = creatorColor === 'w' ? 'b' : 'w';
                
                transaction.update(roomRef, {
                    status: 'in-progress',
                    player2: { uid: user.uid, name: playersWithData[1].name, color: joinerColor },
                    players: [...roomData.players, user.uid],
                    capturedByP1: [], capturedByP2: [], moveHistory: [],
                    currentPlayer: 'w', p1Time: roomData.timeControl, p2Time: roomData.timeControl, turnStartTime: serverTimestamp(),
                });
        
                if (roomData.wager > 0) {
                    const wagerAmount = roomData.wager;

                    for (const player of playersWithData) {
                        transaction.update(doc(db, 'users', player.id), { balance: increment(-wagerAmount) });
                        transaction.set(doc(collection(db, 'transactions')), {
                            userId: player.id, type: 'wager', amount: wagerAmount, status: 'completed',
                            description: `Wager for ${roomData.gameType} game vs ${player.id === creatorDoc.id ? playersWithData[1].name : playersWithData[0].name}`,
                            gameRoomId: room.id, createdAt: serverTimestamp()
                        });
                        
                        // Marketing Chain Commissions
                        if (player.data.referralChain?.length > 0) {
                            const marketingCommissionRate = 0.03;
                            for (let i = 0; i < player.data.referralChain.length; i++) {
                                const marketerId = player.data.referralChain[i];
                                const commissionAmount = wagerAmount * marketingCommissionRate;

                                transaction.update(doc(db, 'users', marketerId), { marketingBalance: increment(commissionAmount) });
                                transaction.set(doc(collection(db, 'transactions')), {
                                    userId: marketerId, type: 'commission', amount: commissionAmount, status: 'completed',
                                    description: `L${i + 1} Commission from ${player.name}`, fromUserId: player.id,
                                    level: i + 1, gameRoomId: room.id, createdAt: serverTimestamp()
                                });
                            }
                        }
                        // Regular 1-Level Commissions
                        else if (player.data.referredBy) {
                            const l1ReferrerId = player.data.referredBy;
                            const l1ReferrerData = referralDataMap.get(l1ReferrerId);
                            
                             if (l1ReferrerData) {
                                const referralRanks = [
                                    { rank: 1, min: 0, max: 20, l1Rate: 0.03 },
                                    { rank: 2, min: 21, max: Infinity, l1Rate: 0.05 },
                                ];
                                const l1Count = l1ReferrerData.l1Count || 0; 
                                const rank = referralRanks.find(r => l1Count >= r.min && l1Count <= r.max) || referralRanks[0];
                                const l1Commission = wagerAmount * rank.l1Rate;
        
                                if (l1Commission > 0) {
                                    transaction.update(doc(db, 'users', l1ReferrerId), { balance: increment(l1Commission) });
                                    transaction.set(doc(collection(db, 'transactions')), {
                                        userId: l1ReferrerId, type: 'commission', amount: l1Commission, status: 'completed',
                                        description: `L1 Commission from ${player.name}`, fromUserId: player.id,
                                        level: 1, gameRoomId: room.id, createdAt: serverTimestamp()
                                    });
                                }
                            }
                        }
                    }
                }
            });

            toast({ title: "Game Joined!", description: "The match is starting now."});
    
        } catch (error: any) {
            console.error("Failed to join game:", error);
            if (error.message === 'Room not available') {
                 toast({ variant: "destructive", title: "Room Not Available", description: "This room is no longer available to join." });
                 router.push(`/lobby/${room.gameType}`);
            } else {
                 toast({ variant: 'destructive', title: "Error", description: `Could not join the game. ${error.message}`});
            }
        } finally {
            setIsJoining(false);
        }
    }

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
            <MultiplayerGamePageContent />
        </GameProvider>
    )
}
