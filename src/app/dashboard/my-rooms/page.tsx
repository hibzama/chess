
'use client'
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, writeBatch, increment } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrainCircuit, Layers, Loader2, RefreshCw, ServerCrash, Swords, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import { Separator } from '@/components/ui/separator';

type GameRoom = {
    id: string;
    gameType: 'chess' | 'checkers';
    status: 'waiting' | 'in-progress';
    wager: number;
    timeControl: number;
    createdBy: {
        uid: string;
        name: string;
    };
    player2?: {
        uid: string;
        name: string;
    };
    createdAt: any;
};

const GameRoomCard = ({ room, onCancel, onRejoin }: { room: GameRoom, onCancel: (id: string, wager: number) => void, onRejoin: (id: string) => void }) => {
    const { user } = useAuth();
    if (!user) return null;
    
    return (
        <Card className="bg-card/50">
            <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                    <p className="font-bold text-sm">LKR {room.wager.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{room.timeControl / 60} min | Created by: {room.createdBy.uid === user.uid ? "You" : room.createdBy.name}</p>
                    <p className="text-xs text-muted-foreground">
                        {room.status === 'in-progress' ? `vs ${room.player2?.name}` : `Created ${formatDistanceToNowStrict(room.createdAt.toDate(), { addSuffix: true })}`}
                    </p>
                </div>
                <div className="flex gap-2">
                    {room.status === 'waiting' && room.createdBy.uid === user.uid && (
                        <Button variant="destructive" size="sm" onClick={() => onCancel(room.id, room.wager)}>Cancel</Button>
                    )}
                     {room.status === 'in-progress' && (
                        <Button size="sm" onClick={() => onRejoin(room.id)}>Rejoin</Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};


export default function MyRoomsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [rooms, setRooms] = useState<GameRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('chess');

    const fetchRooms = () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const q = query(
            collection(db, 'game_rooms'),
            where('players', 'array-contains', user.uid),
            where('status', 'in', ['waiting', 'in-progress'])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedRooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameRoom));
            setRooms(fetchedRooms.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching rooms: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your rooms.' });
            setLoading(false);
        });

        return unsubscribe;
    };

    useEffect(() => {
        const unsubscribe = fetchRooms();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user]);

    const handleCancelRoom = async (roomId: string, wager: number) => {
        if (!user) return;
        const roomRef = doc(db, 'game_rooms', roomId);
        
        try {
            await deleteDoc(roomRef);
            toast({ title: "Room Cancelled", description: "The room has been removed." });
        } catch (error) {
            console.error("Failed to cancel room:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to cancel the room.' });
        }
    };
    
    const handleRejoin = (roomId: string) => {
        router.push(`/game/multiplayer/${roomId}`);
    };
    
    const filteredRooms = rooms.filter(room => room.gameType === activeTab);
    const waitingRooms = filteredRooms.filter(room => room.status === 'waiting');
    const inProgressRooms = filteredRooms.filter(room => room.status === 'in-progress');

    const renderRoomList = (roomList: GameRoom[]) => {
        if (roomList.length === 0) {
            return <p className="text-sm text-muted-foreground text-center py-4">No games found.</p>;
        }
        return (
            <div className="space-y-4">
                {roomList.map(room => (
                    <GameRoomCard key={room.id} room={room} onCancel={handleCancelRoom} onRejoin={handleRejoin}/>
                ))}
            </div>
        )
    }

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">My Rooms</h1>
                <Button variant="outline" size="sm" onClick={fetchRooms} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                    <span className="ml-2">Refresh</span>
                </Button>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                 <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="chess"><BrainCircuit/> Chess</TabsTrigger>
                    <TabsTrigger value="checkers"><Layers/> Checkers</TabsTrigger>
                </TabsList>
                <TabsContent value="chess">
                    <Card>
                        <CardHeader>
                            <CardTitle>My Chess Rooms</CardTitle>
                            <CardDescription>Manage your active and waiting chess games.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="font-semibold mb-2">Waiting for Opponent</h3>
                                <Separator className="mb-4"/>
                                {loading ? <p>Loading...</p> : renderRoomList(waitingRooms)}
                            </div>
                             <div>
                                <h3 className="font-semibold mb-2">In-Progress Games</h3>
                                <Separator className="mb-4"/>
                                {loading ? <p>Loading...</p> : renderRoomList(inProgressRooms)}
                            </div>
                        </CardContent>
                        <CardFooter>
                             <Button variant="outline" className="w-full" asChild>
                                <Link href="/lobby/chess"><Swords/> Go to Chess Multiplayer</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
                 <TabsContent value="checkers">
                      <Card>
                        <CardHeader>
                            <CardTitle>My Checkers Rooms</CardTitle>
                            <CardDescription>Manage your active and waiting checkers games.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="font-semibold mb-2">Waiting for Opponent</h3>
                                 <Separator className="mb-4"/>
                                {loading ? <p>Loading...</p> : renderRoomList(waitingRooms)}
                            </div>
                             <div>
                                <h3 className="font-semibold mb-2">In-Progress Games</h3>
                                 <Separator className="mb-4"/>
                                {loading ? <p>Loading...</p> : renderRoomList(inProgressRooms)}
                            </div>
                        </CardContent>
                         <CardFooter>
                             <Button variant="outline" className="w-full" asChild>
                                <Link href="/lobby/checkers"><Swords/> Go to Checkers Multiplayer</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
