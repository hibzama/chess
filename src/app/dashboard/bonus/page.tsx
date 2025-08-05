
'use client'
import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, Timestamp, updateDoc, arrayUnion, increment, runTransaction, getDoc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Clock, Users, DollarSign, Ban, CheckCircle, Percent } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export interface DailyBonus {
    id: string;
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
    const [bonus, setBonus] = useState<DailyBonus | null>(null);
    const [loading, setLoading] = useState(true);
    const [countdown, setCountdown] = useState('');
    const [isClaiming, setIsClaiming] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [bonusStatus, setBonusStatus] = useState<'available' | 'claimed' | 'expired' | 'not_eligible' | 'not_started' | 'limit_reached'>('not_eligible');
    const [totalClaims, setTotalClaims] = useState(0);

    // Listener for the global bonus settings
    useEffect(() => {
        const bonusRef = doc(db, 'settings', 'dailyBonus');
        const unsubscribe = onSnapshot(bonusRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().isActive) {
                const bonusData = docSnap.data() as DailyBonus;
                setBonus(bonusData);
            } else {
                setBonus(null);
                setBonusStatus('not_eligible'); // No active bonus
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Listener for the total claims count
    useEffect(() => {
        if (!bonus) return;
        const counterRef = doc(db, 'dailyBonusClaims', bonus.id);
        const unsubscribeCounter = onSnapshot(counterRef, (docSnap) => {
            if (docSnap.exists()) {
                setTotalClaims(docSnap.data().count);
            } else {
                setTotalClaims(0);
            }
        });
        return () => unsubscribeCounter();
    }, [bonus]);

    // Main effect to calculate countdown and eligibility
    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (!bonus || !user || !userData) {
            setBonusStatus('not_eligible');
            return;
        }

        const checkClaimStatus = async () => {
            const claimRef = doc(db, 'users', user.uid, 'daily_bonus_claims', bonus.id);
            const claimSnap = await getDoc(claimRef);
            return claimSnap.exists();
        };

        const calculateStatus = async () => {
            const hasClaimed = await checkClaimStatus();
            if(hasClaimed) {
                setBonusStatus('claimed');
                setCountdown('Already claimed today');
                if (intervalRef.current) clearInterval(intervalRef.current);
                return;
            }

            if (totalClaims >= bonus.maxUsers) {
                 setBonusStatus('limit_reached');
                 setCountdown('Bonus limit reached');
                 if (intervalRef.current) clearInterval(intervalRef.current);
                 return;
            }

            const now = new Date();
            const startTime = bonus.startTime.toDate();
            const expiryTime = new Date(startTime.getTime() + (bonus.durationHours * 60 * 60 * 1000));
            
            if(now < startTime) {
                setBonusStatus('not_started');
                const distance = startTime.getTime() - now.getTime();
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
                return;
            }

            if (now > expiryTime) {
                setBonusStatus('expired');
                setCountdown("EXPIRED");
                if (intervalRef.current) clearInterval(intervalRef.current);
                return;
            }
            
            const isZeroBalanceEligible = bonus.targetAudience === 'zero_balance' && userData.balance === 0;
            const isAllPlayersEligible = bonus.targetAudience === 'all';

            if (!isAllPlayersEligible && !isZeroBalanceEligible) {
                setBonusStatus('not_eligible');
                setCountdown('Not eligible');
                if (intervalRef.current) clearInterval(intervalRef.current);
                return;
            }

            setBonusStatus('available');
            const distance = expiryTime.getTime() - now.getTime();
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }

        calculateStatus();
        intervalRef.current = setInterval(calculateStatus, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [bonus, user, userData, totalClaims]);

    const handleClaimBonus = async () => {
        if (!user || !userData || bonusStatus !== 'available' || !bonus) {
            toast({ variant: 'destructive', title: 'Cannot Claim', description: 'This bonus is not available for you to claim.' });
            return;
        }

        setIsClaiming(true);
        const userClaimRef = doc(db, 'users', user.uid, 'daily_bonus_claims', bonus.id);
        const userRef = doc(db, 'users', user.uid);
        const counterRef = doc(db, 'dailyBonusClaims', bonus.id);

        try {
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                const counterDoc = await transaction.get(counterRef);
                
                if (!userDoc.exists()) throw new Error("User not found.");
                
                const claimDoc = await transaction.get(userClaimRef);
                if (claimDoc.exists()) throw new Error("Already claimed.");

                if (!counterDoc.exists() || counterDoc.data().count >= bonus.maxUsers) {
                    throw new Error("Bonus claim limit reached.");
                }

                let bonusAmountToGive = 0;
                if(bonus.bonusType === 'fixed') {
                    bonusAmountToGive = bonus.amount;
                } else { // percentage
                    bonusAmountToGive = userDoc.data().balance * (bonus.percentage / 100);
                }

                transaction.update(userRef, { balance: increment(bonusAmountToGive) });
                transaction.set(userClaimRef, { claimedAt: serverTimestamp() });
                transaction.update(counterRef, { count: increment(1) });
                
                toast({ title: 'Success!', description: `LKR ${bonusAmountToGive.toFixed(2)} has been added to your wallet.` });
            });
        } catch (error: any) {
            console.error("Error claiming bonus: ", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not claim bonus. Please try again.' });
        } finally {
            setIsClaiming(false);
        }
    }


    if (loading) {
        return <Skeleton className="h-96 w-full" />
    }

    if (!bonus) {
        return (
             <div className="flex flex-col items-center justify-center text-center gap-4 py-12">
                <Gift className="w-16 h-16 text-muted-foreground" />
                <h2 className="text-2xl font-bold">No Active Daily Bonus</h2>
                <p className="text-muted-foreground">Check back later for new promotions!</p>
            </div>
        )
    }

    const bonusDisplayValue = bonus.bonusType === 'fixed' 
        ? `LKR ${bonus.amount.toFixed(2)}`
        : `${bonus.percentage}%`;

    return (
        <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                    <div className="p-4 bg-primary/10 rounded-full">
                        <Gift className="w-12 h-12 text-primary" />
                    </div>
                </div>
                <CardTitle className="text-3xl">Daily Bonus</CardTitle>
                <CardDescription>A special gift for our players!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="p-6 bg-secondary/50 rounded-lg text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Bonus Amount</p>
                    <p className="text-5xl font-bold text-primary">{bonusDisplayValue}</p>
                    {bonus.bonusType === 'percentage' && <p className="text-xs text-muted-foreground">of your current wallet balance</p>}
                </div>
                
                 <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-secondary/50 rounded-lg">
                        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><Clock/> {bonusStatus === 'not_started' ? 'Starts In' : 'Time Left'}</p>
                        <p className="text-lg font-semibold">{countdown}</p>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg">
                        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><Users/> Claims Left</p>
                        <p className="text-lg font-semibold">{Math.max(0, bonus.maxUsers - totalClaims)}</p>
                    </div>
                </div>

                {bonusStatus === 'available' && (
                    <Button className="w-full" size="lg" onClick={handleClaimBonus} disabled={isClaiming}>
                        {isClaiming ? 'Claiming...' : 'Claim Your Bonus Now!'}
                    </Button>
                )}
                
                {bonusStatus === 'claimed' && (
                    <Alert variant="default" className="bg-green-500/10 border-green-500/20 text-green-400">
                        <CheckCircle className="h-4 w-4 !text-green-400"/>
                        <AlertTitle>Bonus Claimed!</AlertTitle>
                        <AlertDescription>
                           You have already claimed this bonus.
                        </AlertDescription>
                    </Alert>
                )}
                {(bonusStatus === 'expired' || bonusStatus === 'limit_reached') && (
                     <Alert variant="destructive">
                        <Ban className="h-4 w-4"/>
                        <AlertTitle>Bonus Unavailable</AlertTitle>
                        <AlertDescription>
                           {bonusStatus === 'expired' ? 'This daily bonus has expired.' : 'The claim limit for this bonus has been reached.'}
                        </AlertDescription>
                    </Alert>
                )}
                 {bonusStatus === 'not_eligible' && (
                     <Alert variant="destructive">
                        <Ban className="h-4 w-4"/>
                        <AlertTitle>Not Eligible</AlertTitle>
                        <AlertDescription>
                           This bonus is only available for players with a zero balance.
                        </AlertDescription>
                    </Alert>
                )}
                {bonusStatus === 'not_started' && (
                     <Alert>
                        <Clock className="h-4 w-4"/>
                        <AlertTitle>Coming Soon!</AlertTitle>
                        <AlertDescription>
                           This bonus is not active yet. Check back when the timer ends.
                        </AlertDescription>
                    </Alert>
                )}
                
            </CardContent>
        </Card>
    );
}
