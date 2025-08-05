
'use client'
import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, Timestamp, updateDoc, arrayUnion, increment, runTransaction, getDoc, setDoc, collection, getDocs, where, query, writeBatch, documentId, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Clock, Users, DollarSign, Ban, CheckCircle, Percent, History, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


export interface Bonus {
    id: string;
    title: string;
    bonusType: 'percentage' | 'fixed';
    amount: number;
    percentage: number;
    maxUsers: number;
    targetAudience: 'all' | 'zero_balance';
    isActive: boolean;
    startTime: Timestamp;
    durationHours: number;
}

export default function DailyBonusClaimPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const [bonuses, setBonuses] = useState<Bonus[]>([]);
    const [claimedBonuses, setClaimedBonuses] = useState<string[]>([]);
    const [claimedHistory, setClaimedHistory] = useState<any[]>([]);
    const [bonusClaimsCount, setBonusClaimsCount] = useState<{[key: string]: number}>({});
    const [loading, setLoading] = useState(true);
    const [isClaiming, setIsClaiming] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        // Fetch active bonuses
        const bonusesQuery = query(collection(db, 'bonuses'), where('isActive', '==', true), orderBy('startTime', 'desc'));
        const unsubBonuses = onSnapshot(bonusesQuery, (snapshot) => {
            const bonusesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Bonus));
            setBonuses(bonusesData);
            setLoading(false);
        });

        // Fetch user's claimed bonuses
        const claimedQuery = collection(db, 'users', user.uid, 'daily_bonus_claims');
        const unsubClaimed = onSnapshot(claimedQuery, (snapshot) => {
            const claimedIds = snapshot.docs.map(doc => doc.id);
            const history = snapshot.docs.map(doc => ({...doc.data(), id: doc.id}));
            setClaimedBonuses(claimedIds);
            setClaimedHistory(history.sort((a,b) => b.claimedAt.seconds - a.claimedAt.seconds));
        });
        
        return () => {
            unsubBonuses();
            unsubClaimed();
        };
    }, [user]);

    useEffect(() => {
        // Fetch claim counts for all visible bonuses
        if (bonuses.length === 0) return;
        
        const unsubscribes = bonuses.map(bonus => {
            const counterRef = doc(db, 'dailyBonusClaims', bonus.id);
            return onSnapshot(counterRef, (docSnap) => {
                 if (docSnap.exists()) {
                    setBonusClaimsCount(prev => ({...prev, [bonus.id]: docSnap.data().count}));
                } else {
                     setBonusClaimsCount(prev => ({...prev, [bonus.id]: 0}));
                }
            });
        });
        
        return () => unsubscribes.forEach(unsub => unsub());

    }, [bonuses]);


    const handleClaimBonus = async (bonus: Bonus) => {
        if (!user || !userData) {
            toast({ variant: 'destructive', title: 'Cannot Claim', description: 'You must be logged in.' });
            return;
        }
        
        setIsClaiming(bonus.id);
        const userClaimRef = doc(db, 'users', user.uid, 'daily_bonus_claims', bonus.id);
        const userRef = doc(db, 'users', user.uid);
        const counterRef = doc(db, 'dailyBonusClaims', bonus.id);

        try {
            await runTransaction(db, async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                const claimDoc = await transaction.get(userClaimRef);
                
                if (claimDoc.exists()) throw new Error("Already claimed.");
                if (!counterDoc.exists() || counterDoc.data().count >= bonus.maxUsers) throw new Error("Bonus claim limit reached.");
                if (bonus.targetAudience === 'zero_balance' && userData.balance > 0) throw new Error("This bonus is for zero-balance players only.");

                let bonusAmountToGive = 0;
                if(bonus.bonusType === 'fixed') {
                    bonusAmountToGive = bonus.amount;
                } else {
                    bonusAmountToGive = userData.balance * (bonus.percentage / 100);
                }

                transaction.update(userRef, { balance: increment(bonusAmountToGive) });
                transaction.set(userClaimRef, { bonusId: bonus.id, title: bonus.title, amount: bonusAmountToGive, claimedAt: Timestamp.now() });
                transaction.update(counterRef, { count: increment(1), claimedByUids: arrayUnion(user.uid) });
                
                toast({ title: 'Success!', description: `LKR ${bonusAmountToGive.toFixed(2)} has been added to your wallet.` });
            });
        } catch (error: any) {
            console.error("Error claiming bonus: ", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not claim bonus. Please try again.' });
        } finally {
            setIsClaiming(null);
        }
    }
    
    const BonusCard = ({ bonus }: { bonus: Bonus }) => {
        const [countdown, setCountdown] = useState('');
        const [status, setStatus] = useState<'available' | 'claimed' | 'expired' | 'not_eligible' | 'not_started' | 'limit_reached'>('not_eligible');

        useEffect(() => {
            const interval = setInterval(() => {
                 if (!user || !userData) return;
                
                const hasClaimed = claimedBonuses.includes(bonus.id);
                if(hasClaimed) { setStatus('claimed'); setCountdown('Claimed'); return; }

                const claimsCount = bonusClaimsCount[bonus.id] || 0;
                if(claimsCount >= bonus.maxUsers) { setStatus('limit_reached'); setCountdown('Limit Reached'); return; }

                const isEligible = bonus.targetAudience === 'all' || (bonus.targetAudience === 'zero_balance' && userData.balance === 0);
                if(!isEligible) { setStatus('not_eligible'); setCountdown('Not Eligible'); return; }

                const now = new Date();
                const startTime = bonus.startTime.toDate();
                const expiryTime = new Date(startTime.getTime() + (bonus.durationHours * 60 * 60 * 1000));

                if (now < startTime) {
                    setStatus('not_started');
                    const diff = startTime.getTime() - now.getTime();
                    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const s = Math.floor((diff % (1000 * 60)) / 1000);
                    setCountdown(`${d}d ${h}h ${m}m ${s}s`);
                } else if (now > expiryTime) {
                    setStatus('expired');
                    setCountdown('Expired');
                } else {
                    setStatus('available');
                    const diff = expiryTime.getTime() - now.getTime();
                    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const s = Math.floor((diff % (1000 * 60)) / 1000);
                    setCountdown(`${d}d ${h}h ${m}m ${s}s`);
                }
            }, 1000);
            return () => clearInterval(interval);
        }, [bonus, claimedBonuses, bonusClaimsCount, user, userData]);

        const bonusDisplayValue = bonus.bonusType === 'fixed' ? `LKR ${bonus.amount.toFixed(2)}` : `${bonus.percentage}%`;
        const claimsLeft = Math.max(0, bonus.maxUsers - (bonusClaimsCount[bonus.id] || 0));

        return (
            <Card className="max-w-md mx-auto">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-4 bg-primary/10 rounded-full"><Gift className="w-12 h-12 text-primary" /></div></div>
                    <CardTitle className="text-3xl">{bonus.title}</CardTitle>
                    <CardDescription>{bonus.bonusType === 'percentage' ? 'Percentage of your wallet balance' : 'A special gift for our players!'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-6 bg-secondary/50 rounded-lg text-center space-y-2">
                        <p className="text-sm text-muted-foreground">Bonus Amount</p>
                        <p className="text-5xl font-bold text-primary">{bonusDisplayValue}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-3 bg-secondary/50 rounded-lg">
                            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><Clock/> {status === 'not_started' ? 'Starts In' : 'Time Left'}</p>
                            <p className="text-lg font-semibold">{countdown}</p>
                        </div>
                        <div className="p-3 bg-secondary/50 rounded-lg">
                            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><Users/> Claims Left</p>
                            <p className="text-lg font-semibold">{claimsLeft}</p>
                        </div>
                    </div>
                     {status === 'available' && <Button className="w-full" size="lg" onClick={() => handleClaimBonus(bonus)} disabled={isClaiming === bonus.id}>{isClaiming === bonus.id ? <Loader2 className="animate-spin"/> : 'Claim Bonus'}</Button>}
                     {status === 'claimed' && <Alert variant="default" className="bg-green-500/10 border-green-500/20 text-green-400"><CheckCircle className="h-4 w-4 !text-green-400"/><AlertTitle>Claimed!</AlertTitle></Alert>}
                     {status === 'expired' && <Alert variant="destructive"><Ban className="h-4 w-4"/><AlertTitle>Expired</AlertTitle></Alert>}
                     {status === 'limit_reached' && <Alert variant="destructive"><Ban className="h-4 w-4"/><AlertTitle>Limit Reached</AlertTitle></Alert>}
                     {status === 'not_eligible' && <Alert variant="destructive"><Ban className="h-4 w-4"/><AlertTitle>Not Eligible</AlertTitle></Alert>}
                     {status === 'not_started' && <Alert><Clock className="h-4 w-4"/><AlertTitle>Coming Soon!</AlertTitle></Alert>}
                </CardContent>
            </Card>
        );
    }

    return (
        <Tabs defaultValue="available">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="available">Available Bonuses</TabsTrigger>
                <TabsTrigger value="history">Claim History</TabsTrigger>
            </TabsList>
            <TabsContent value="available">
                 <div className="space-y-6 mt-4">
                    {loading ? <Skeleton className="h-96 w-full" /> : 
                     bonuses.length > 0 ? bonuses.map(b => <BonusCard key={b.id} bonus={b} />) : (
                         <div className="flex flex-col items-center justify-center text-center gap-4 py-12">
                            <Gift className="w-16 h-16 text-muted-foreground" />
                            <h2 className="text-2xl font-bold">No Active Daily Bonuses</h2>
                            <p className="text-muted-foreground">Check back later for new promotions!</p>
                        </div>
                     )}
                </div>
            </TabsContent>
            <TabsContent value="history">
                <Card className="mt-4">
                     <CardHeader>
                        <CardTitle>Your Claim History</CardTitle>
                        <CardDescription>A record of all the daily bonuses you have claimed.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Bonus Title</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {claimedHistory.length > 0 ? claimedHistory.map(h => (
                                    <TableRow key={h.id}>
                                        <TableCell>{format(h.claimedAt.toDate(), 'PPp')}</TableCell>
                                        <TableCell>{h.title}</TableCell>
                                        <TableCell className="text-green-400 font-semibold">LKR {h.amount.toFixed(2)}</TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={3} className="text-center h-24">You haven't claimed any bonuses yet.</TableCell></TableRow>}
                            </TableBody>
                         </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}
