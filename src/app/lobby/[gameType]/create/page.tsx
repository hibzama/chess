
'use client'

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, writeBatch, increment, Timestamp, getDoc, getDocs, query, where } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, PlusCircle, AlertTriangle, Crown, Shuffle, Globe, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

// Commission Ranks
const referralRanks = [
    { rank: 1, min: 0, max: 20, l1Rate: 0.03, l2Rate: 0.02 },
    { rank: 2, min: 21, max: Infinity, l1Rate: 0.04, l2Rate: 0.03 },
];

const getReferralRank = async (userId: string) => {
    const l1Query = query(collection(db, 'users'), where('referredBy', '==', userId));
    const l1Snapshot = await getDocs(l1Query);
    const l1Count = l1Snapshot.size;
    return referralRanks.find(r => l1Count >= r.min && l1Count <= r.max) || referralRanks[0];
};

export default function CreateGamePage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user, userData } = useAuth();
    const { gameType } = params;
    const gameName = typeof gameType === 'string' ? gameType.charAt(0).toUpperCase() + gameType.slice(1) : 'Game';

    const [investmentAmount, setInvestmentAmount] = useState('10');
    const [gameTimer, setGameTimer] = useState('900');
    const [pieceColor, setPieceColor] = useState<'w' | 'b' | 'random'>('random');
    const [roomPrivacy, setRoomPrivacy] = useState<'public' | 'private'>('public');
    const [isCreating, setIsCreating] = useState(false);

    const USDT_RATE = 310;
    const usdtAmount = (parseFloat(investmentAmount) / USDT_RATE || 0).toFixed(2);
    
    const handleCreateRoom = async () => {
        if (!user || !userData) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create a room.' });
            return;
        }

        const wagerAmount = parseInt(investmentAmount);
        if (isNaN(wagerAmount) || wagerAmount < 10) {
            toast({ variant: 'destructive', title: 'Error', description: 'Minimum investment amount is LKR 10.' });
            return;
        }

        if (userData.balance < wagerAmount) {
            toast({ variant: 'destructive', title: 'Error', description: 'Insufficient funds to create this room.' });
            return;
        }

        setIsCreating(true);
        const batch = writeBatch(db);

        try {
            // 1. Deduct wager from user's balance
            const userRef = doc(db, 'users', user.uid);
            batch.update(userRef, {
                balance: increment(-wagerAmount)
            });

            // Handle random piece color selection
            let finalPieceColor = pieceColor;
            if (pieceColor === 'random') {
                finalPieceColor = Math.random() > 0.5 ? 'w' : 'b';
            }
            
            // 2. Create the game room document
            const roomData = {
                gameType,
                wager: wagerAmount,
                timeControl: parseInt(gameTimer),
                isPrivate: roomPrivacy === 'private',
                status: 'waiting',
                createdBy: {
                    uid: user.uid,
                    name: `${userData.firstName} ${userData.lastName}`,
                    color: finalPieceColor,
                },
                players: [user.uid],
                createdAt: serverTimestamp(),
                expiresAt: Timestamp.fromMillis(Date.now() + 3 * 60 * 1000) // 3 minutes from now
            };

            const roomRef = await addDoc(collection(db, 'game_rooms'), roomData);
            
            // 3. Create a transaction log for the wager
            const transactionRef = doc(collection(db, 'transactions'));
            batch.set(transactionRef, {
                userId: user.uid,
                type: 'wager',
                amount: wagerAmount,
                status: 'completed',
                description: `Wager for ${gameName} game`,
                gameRoomId: roomRef.id,
                createdAt: serverTimestamp()
            });

            // 4. Handle Referral Commissions
            if (userData.referredBy) {
                // Level 1 Referrer
                const l1ReferrerRef = doc(db, 'users', userData.referredBy);
                const l1ReferrerSnap = await getDoc(l1ReferrerRef);

                if (l1ReferrerSnap.exists()) {
                    const l1ReferrerData = l1ReferrerSnap.data();
                    const l1Rank = await getReferralRank(l1ReferrerData.uid);
                    const l1Commission = wagerAmount * l1Rank.l1Rate;

                    if (l1Commission > 0) {
                        batch.update(l1ReferrerRef, { balance: increment(l1Commission) });
                        batch.set(doc(collection(db, 'transactions')), {
                            userId: l1ReferrerData.uid,
                            type: 'commission',
                            amount: l1Commission,
                            status: 'completed',
                            description: `L1 commission from ${userData.firstName}`,
                            fromUserId: user.uid,
                            level: 1,
                            gameRoomId: roomRef.id,
                            createdAt: serverTimestamp()
                        });
                    }

                    // Level 2 Referrer
                    if (l1ReferrerData.referredBy) {
                        const l2ReferrerRef = doc(db, 'users', l1ReferrerData.referredBy);
                        const l2ReferrerSnap = await getDoc(l2ReferrerRef);

                        if(l2ReferrerSnap.exists()) {
                            const l2ReferrerData = l2ReferrerSnap.data();
                             const l2Rank = await getReferralRank(l2ReferrerData.uid);
                            const l2Commission = wagerAmount * l2Rank.l2Rate;

                             if (l2Commission > 0) {
                                batch.update(l2ReferrerRef, { balance: increment(l2Commission) });
                                batch.set(doc(collection(db, 'transactions')), {
                                    userId: l2ReferrerData.uid,
                                    type: 'commission',
                                    amount: l2Commission,
                                    status: 'completed',
                                    description: `L2 commission from ${userData.firstName}`,
                                    fromUserId: user.uid,
                                    level: 2,
                                    gameRoomId: roomRef.id,
                                    createdAt: serverTimestamp()
                                });
                            }
                        }
                    }
                }
            }
            
            await batch.commit();
            
            toast({ title: 'Room Created!', description: 'Waiting for an opponent to join.' });

            // 4. Navigate to the game room page
            router.push(`/game/multiplayer/${roomRef.id}`);

        } catch (error) {
            console.error('Error creating room:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to create the room. Your wager has been refunded.' });
            
            // Revert balance deduction if room creation fails
             const userRef = doc(db, 'users', user.uid);
             await updateDoc(userRef, { balance: increment(wagerAmount) });

        } finally {
            setIsCreating(false);
        }
    };


    return (
        <div className="flex flex-col items-center w-full p-4">
             <div className="w-full max-w-2xl">
                <Link href={`/lobby/${gameType}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to {gameName} Lobby</span>
                </Link>
                
                <div className="flex items-center gap-3 mb-2">
                    <PlusCircle className="w-8 h-8"/>
                    <h1 className="text-3xl font-bold">Create New Game</h1>
                </div>
                <p className="text-muted-foreground mb-6">Set the stakes and timer for your match.</p>

                <Card className="w-full">
                    <CardContent className="p-6 space-y-6">
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Fair Play Policy</AlertTitle>
                            <AlertDescription>
                                Playing against another player on the same device is strictly prohibited.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label htmlFor="investment">Investment Amount (LKR)</Label>
                            <Input id="investment" type="number" value={investmentAmount} onChange={e => setInvestmentAmount(e.target.value)} min="10"/>
                            <p className="text-xs text-muted-foreground">Approximately ${usdtAmount} USDT</p>
                        </div>

                         <div className="space-y-3">
                            <Label>Game Timer (per side)</Label>
                            <RadioGroup value={gameTimer} onValueChange={setGameTimer} className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="300" id="t5" />
                                    <Label htmlFor="t5">5 Min</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="900" id="t15" />
                                    <Label htmlFor="t15">15 Min</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="1800" id="t30" />
                                    <Label htmlFor="t30">30 Min</Label>
                                </div>
                            </RadioGroup>
                        </div>

                         <div className="space-y-3">
                            <Label>Your Piece Color</Label>
                             <div className="grid grid-cols-3 gap-4">
                                 <button onClick={() => setPieceColor('w')} className={cn("p-4 rounded-lg border-2 flex flex-col items-center justify-center gap-2 transition-colors", pieceColor === 'w' ? 'border-primary bg-primary/10' : 'hover:border-primary/50')}>
                                    <Crown/> White
                                </button>
                                <button onClick={() => setPieceColor('b')} className={cn("p-4 rounded-lg border-2 flex flex-col items-center justify-center gap-2 transition-colors", pieceColor === 'b' ? 'border-primary bg-primary/10' : 'hover:border-primary/50')}>
                                    <Crown className="rotate-180"/> Black
                                </button>
                                <button onClick={() => setPieceColor('random')} className={cn("p-4 rounded-lg border-2 flex flex-col items-center justify-center gap-2 transition-colors", pieceColor === 'random' ? 'border-primary bg-primary/10' : 'hover:border-primary/50')}>
                                    <Shuffle/> Random
                                </button>
                            </div>
                        </div>

                         <div className="space-y-3">
                            <Label>Room Privacy</Label>
                             <div className="grid grid-cols-2 gap-4">
                                 <button onClick={() => setRoomPrivacy('public')} className={cn("p-4 rounded-lg border-2 flex flex-col items-center justify-center gap-2 transition-colors", roomPrivacy === 'public' ? 'border-primary bg-primary/10' : 'hover:border-primary/50')}>
                                    <Globe className="mb-1"/> 
                                    <span className="font-semibold">Public</span>
                                    <p className="text-xs text-muted-foreground">Visible to everyone</p>
                                </button>
                                <button onClick={() => setRoomPrivacy('private')} className={cn("p-4 rounded-lg border-2 flex flex-col items-center justify-center gap-2 transition-colors", roomPrivacy === 'private' ? 'border-primary bg-primary/10' : 'hover:border-primary/50')}>
                                    <Lock className="mb-1"/>
                                    <span className="font-semibold">Private</span>
                                    <p className="text-xs text-muted-foreground">Requires an ID to join</p>
                                </button>
                            </div>
                        </div>

                        <Button size="lg" className="w-full" onClick={handleCreateRoom} disabled={isCreating}>
                            {isCreating ? 'Creating Game...' : 'Create Game & Wait for Opponent'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

    