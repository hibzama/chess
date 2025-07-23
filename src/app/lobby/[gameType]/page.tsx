
'use client'

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, PlusCircle, Search, LogIn, Swords, Timer, Shield, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';

export default function GameLobbyPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user, userData } = useAuth();
    const { gameType } = params;
    const gameName = typeof gameType === 'string' ? gameType.charAt(0).toUpperCase() + gameType.slice(1) : 'Game';

    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [wager, setWager] = useState("100");
    const [timeControl, setTimeControl] = useState("900");
    const [isPrivate, setIsPrivate] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    

    const handleCreateRoom = async () => {
        if (!user || !userData) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create a room.' });
            return;
        }

        const wagerAmount = parseInt(wager);
        if (isNaN(wagerAmount) || wagerAmount <= 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid wager amount.' });
            return;
        }

        if (userData.balance < wagerAmount) {
            toast({ variant: 'destructive', title: 'Error', description: 'Insufficient funds to create this room.' });
            return;
        }

        setIsCreating(true);
        try {
            // 1. Deduct wager from user's balance
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                balance: increment(-wagerAmount)
            });

            // 2. Create the game room document
            const roomData = {
                gameType,
                wager: wagerAmount,
                timeControl: parseInt(timeControl),
                isPrivate,
                status: 'waiting',
                createdBy: {
                    uid: user.uid,
                    name: `${userData.firstName} ${userData.lastName}`
                },
                players: [user.uid],
                createdAt: serverTimestamp()
            };

            const roomRef = await addDoc(collection(db, 'game_rooms'), roomData);
            
            toast({ title: 'Room Created!', description: 'Waiting for an opponent to join.' });

            // 3. Navigate to the game room page
            router.push(`/game/multiplayer/${roomRef.id}`);

        } catch (error) {
            console.error('Error creating room:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to create the room. Please try again.' });
            
            // Revert balance deduction if room creation fails
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                balance: increment(wagerAmount)
            });

        } finally {
            setIsCreating(false);
            setOpenCreateDialog(false);
        }
    };


    const lobbyOptions = [
        {
            title: 'Create Room',
            description: 'Set up a new game and wait for an opponent.',
            icon: PlusCircle,
            action: () => setOpenCreateDialog(true)
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
        <div className="flex flex-col items-center w-full p-4 min-h-screen">
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

            <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>Create a New {gameName} Room</DialogTitle>
                    <DialogDescription>
                        Set the rules for your match. Your wager will be deducted from your wallet upon creation.
                    </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="wager" className="text-right flex items-center gap-2 justify-end"><Coins className="w-4 h-4"/> Wager (LKR)</Label>
                            <Input id="wager" type="number" value={wager} onChange={(e) => setWager(e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="time-control" className="text-right flex items-center gap-2 justify-end"><Timer className="w-4 h-4" /> Time</Label>
                             <Select value={timeControl} onValueChange={setTimeControl}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select time control" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="300">5 Minutes</SelectItem>
                                    <SelectItem value="600">10 Minutes</SelectItem>
                                    <SelectItem value="900">15 Minutes</SelectItem>
                                    <SelectItem value="1800">30 Minutes</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="privacy" className="text-right flex items-center gap-2 justify-end"><Shield className="w-4 h-4" /> Private</Label>
                            <div className="col-span-3 flex items-center">
                               <Switch id="privacy" checked={isPrivate} onCheckedChange={setIsPrivate} />
                               <span className="ml-3 text-sm text-muted-foreground">{isPrivate ? "Yes, private room" : "No, public room"}</span>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                    <Button type="submit" onClick={handleCreateRoom} disabled={isCreating}>
                        {isCreating ? 'Creating Room...' : `Create Room & Invest LKR ${wager || 0}`}
                    </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
