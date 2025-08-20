
'use client'

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, PlusCircle, Search, LogIn, Swords, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import PublicGames from '@/components/lobby/public-games';
import { useAuth } from '@/context/auth-context';

export default function GameLobbyPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { gameType } = params;
    const { currencyConfig } = useAuth();
    const gameName = typeof gameType === 'string' ? gameType.charAt(0).toUpperCase() + gameType.slice(1) : 'Game';

    const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
    const [roomIdToJoin, setRoomIdToJoin] = useState('');
    const [isFindingRoom, setIsFindingRoom] = useState(false);


    const handleFindAndJoinRoom = async () => {
        if (!roomIdToJoin.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter a Room ID.' });
            return;
        }
        setIsFindingRoom(true);
        try {
            const roomRef = doc(db, 'game_rooms', roomIdToJoin.trim());
            const roomSnap = await getDoc(roomRef);

            if (roomSnap.exists() && roomSnap.data().status === 'waiting') {
                router.push(`/game/multiplayer/${roomSnap.id}`);
            } else {
                toast({ variant: 'destructive', title: 'Room Not Found', description: 'Could not find an open game with that ID. Please check the ID and try again.' });
            }

        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'An error occurred while trying to find the room.' });
        } finally {
            setIsFindingRoom(false);
            setIsJoinDialogOpen(false);
        }
    }


    const lobbyOptions = [
        {
            title: 'Create Room',
            description: 'Set up a new game and wait for an opponent.',
            icon: PlusCircle,
            action: () => router.push(`/lobby/${gameType}/create`)
        },
        {
            title: 'Join Room',
            description: 'Enter a room code to join a specific game.',
            icon: LogIn,
            action: () => setIsJoinDialogOpen(true)
        },
        {
            title: 'My Rooms',
            description: 'Check the status of your active and past games.',
            icon: Swords,
            action: () => router.push('/dashboard/my-rooms')
        }
    ];

    return (
        <>
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
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

            <div className="w-full max-w-5xl mt-12">
                <PublicGames gameType={gameType as string} currencySymbol={currencyConfig.symbol} usdtRate={currencyConfig.usdtRate} />
            </div>
        </div>

        <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Join a Private Room</DialogTitle>
                    <DialogDescription>
                        Enter the Room ID you received from your friend to join their game.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="room-id">Room ID</Label>
                        <Input 
                            id="room-id" 
                            value={roomIdToJoin} 
                            onChange={(e) => setRoomIdToJoin(e.target.value)} 
                            placeholder="Paste Room ID here" 
                        />
                    </div>
                </div>
                <Button onClick={handleFindAndJoinRoom} disabled={isFindingRoom}>
                    {isFindingRoom ? <><Loader2 className="animate-spin mr-2"/> Finding...</> : 'Find & Join Game'}
                </Button>
            </DialogContent>
        </Dialog>
        </>
    );
}
