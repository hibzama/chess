
'use client'
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, BrainCircuit, Layers, Users, CircleUserRound, Clock, PlusCircle, Gamepad2, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

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
    createdAt: any;
};

export default function LobbyPage() {
    const router = useRouter();
    const { user, userData } = useAuth();
    const { toast } = useToast();

    const [gameType, setGameType] = useState<'chess' | 'checkers'>('chess');
    const [wager, setWager] = useState('100');
    const [timeControl, setTimeControl] = useState('600'); // 10 minutes
    const [isCreating, setIsCreating] = useState(false);

    const [rooms, setRooms] = useState<GameRoom[]>([]);
    const [isLoadingRooms, setIsLoadingRooms] = useState(true);

     useEffect(() => {
        const q = query(collection(db, 'game_rooms'), where('status', '==', 'waiting'));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const openRooms: GameRoom[] = [];
            for(const doc of snapshot.docs) {
                const roomData = doc.data() as Omit<GameRoom, 'id'>;
                const userSnap = await getDoc(doc(db, 'users', roomData.createdBy.uid));
                const creatorName = userSnap.exists() ? `${userSnap.data().firstName} ${userSnap.data().lastName}` : 'Unknown Player';

                openRooms.push({
                    id: doc.id,
                    ...roomData,
                    createdBy: { ...roomData.createdBy, name: creatorName }
                });
            }
            setRooms(openRooms);
            setIsLoadingRooms(false);
        });

        return () => unsubscribe();
    }, []);


    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userData) {
            toast({ variant: 'destructive', title: 'Not logged in', description: 'You must be logged in to create a room.' });
            return;
        }
        const wagerAmount = parseInt(wager, 10);
        if (userData.balance < wagerAmount) {
             toast({ variant: 'destructive', title: 'Insufficient funds', description: 'You do not have enough balance to place this wager.' });
             return;
        }

        setIsCreating(true);
        try {
            await addDoc(collection(db, 'game_rooms'), {
                gameType,
                wager: wagerAmount,
                timeControl: parseInt(timeControl, 10),
                status: 'waiting',
                createdBy: {
                    uid: user.uid,
                    name: `${userData.firstName} ${userData.lastName}`
                },
                players: [user.uid],
                createdAt: serverTimestamp()
            });
            toast({ title: 'Room created!', description: 'Your game room is now open for others to join.' });
        } catch (error) {
            console.error('Error creating room:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not create the game room.' });
        } finally {
            setIsCreating(false);
        }
    };
    
    const handleJoinRoom = async (roomId: string, wagerAmount: number) => {
         if (!user || !userData) {
            toast({ variant: 'destructive', title: 'Not logged in', description: 'You must be logged in to join a room.' });
            return;
        }
        if (userData.balance < wagerAmount) {
             toast({ variant: 'destructive', title: 'Insufficient funds', description: 'You do not have enough balance to join this game.' });
             return;
        }
        try {
            const roomRef = doc(db, 'game_rooms', roomId);
            const roomSnap = await getDoc(roomRef);

            if (roomSnap.exists() && roomSnap.data().status === 'waiting') {
                await updateDoc(roomRef, {
                    status: 'in-progress',
                    players: [...roomSnap.data().players, user.uid],
                    player2: {
                        uid: user.uid,
                        name: `${userData.firstName} ${userData.lastName}`
                    }
                });
                router.push(`/game/multiplayer/${roomId}`);
            } else {
                 toast({ variant: 'destructive', title: 'Room unavailable', description: 'This room is no longer available to join.' });
            }
        } catch(error) {
             console.error('Error joining room:', error);
             toast({ variant: 'destructive', title: 'Error', description: 'Could not join the game room.' });
        }
    }

    return (
        <div className="flex flex-col w-full p-4 min-h-screen">
             <div className="w-full max-w-6xl mx-auto">
                <div className="mb-8">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Dashboard</span>
                    </Link>
                </div>
                 <div className="text-center mb-12">
                     <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <DollarSign className="w-10 h-10 text-primary" />
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-primary to-primary/80">Game Lobby</h1>
                    <p className="mt-2 text-lg text-muted-foreground max-w-lg mx-auto">Challenge other players and win rewards. Create your own room or join an existing one.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><PlusCircle/> Create a Room</CardTitle>
                                <CardDescription>Set up your own game for others to join.</CardDescription>
                            </CardHeader>
                            <form onSubmit={handleCreateRoom}>
                                <CardContent className="space-y-4">
                                     <div>
                                        <Label>Game</Label>
                                         <Select value={gameType} onValueChange={(val) => setGameType(val as any)}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="chess">Chess</SelectItem>
                                                <SelectItem value="checkers">Checkers</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                     <div>
                                        <Label>Wager (LKR)</Label>
                                         <Select value={wager} onValueChange={setWager}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="100">100</SelectItem>
                                                <SelectItem value="250">250</SelectItem>
                                                <SelectItem value="500">500</SelectItem>
                                                <SelectItem value="1000">1000</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                     <div>
                                        <Label>Time Control</Label>
                                         <Select value={timeControl} onValueChange={setTimeControl}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="300">5 Minutes</SelectItem>
                                                <SelectItem value="600">10 Minutes</SelectItem>
                                                <SelectItem value="900">15 Minutes</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button type="submit" className="w-full" disabled={isCreating}>{isCreating ? 'Creating...' : 'Create Room'}</Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </div>
                     <div className="lg:col-span-2">
                         <Card className="h-full">
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Gamepad2/> Find a Match</CardTitle>
                                <CardDescription>Join an open room and start playing immediately.</CardDescription>
                            </CardHeader>
                             <CardContent className="space-y-4">
                                {isLoadingRooms ? (
                                    <div className="space-y-4">
                                        <Skeleton className="h-20 w-full" />
                                        <Skeleton className="h-20 w-full" />
                                        <Skeleton className="h-20 w-full" />
                                    </div>
                                ) : rooms.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <p>No open rooms right now.</p>
                                        <p>Why not create one?</p>
                                    </div>
                                ) : (
                                    rooms.map(room => (
                                        <Card key={room.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    {room.gameType === 'chess' ? <BrainCircuit className="w-5 h-5 text-primary"/> : <Layers className="w-5 h-5 text-primary"/>}
                                                    <p className="font-bold text-lg capitalize">{room.gameType}</p>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4"/> {room.wager} LKR</span>
                                                     <span className="flex items-center gap-1.5"><Clock className="w-4 h-4"/> {room.timeControl / 60} min</span>
                                                </div>
                                                 <div className="text-xs text-muted-foreground pt-2">
                                                    Created by {room.createdBy.name} on {room.createdAt ? format(room.createdAt.toDate(), 'PPp') : '...'}
                                                 </div>
                                            </div>
                                            <Button onClick={() => handleJoinRoom(room.id, room.wager)} disabled={user?.uid === room.createdBy.uid}>Join Game</Button>
                                        </Card>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
