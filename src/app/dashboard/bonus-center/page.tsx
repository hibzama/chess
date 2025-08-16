
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, writeBatch, collection, getDocs } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift, Users, CalendarClock, Check, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow } from 'date-fns';

interface DailyBonusSettings {
    dailyBonusEnabled: boolean;
    dailyBonusAmount: number;
}
interface ReferralBonusSettings {
    enabled: boolean;
    tiers: { referrals: number; amount: number }[];
}
interface BonusClaim {
    claimedAt: any;
}

export default function BonusCenterPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();

    // Daily Bonus State
    const [dailyBonusSettings, setDailyBonusSettings] = useState<DailyBonusSettings | null>(null);
    const [lastDailyClaim, setLastDailyClaim] = useState<Date | null>(null);
    const [isDailyClaimable, setIsDailyClaimable] = useState(false);
    const [dailyCooldown, setDailyCooldown] = useState('');
    const [claimingDaily, setClaimingDaily] = useState(false);

    // Referral Bonus State
    const [referralBonusSettings, setReferralBonusSettings] = useState<ReferralBonusSettings | null>(null);
    const [claimedReferralTiers, setClaimedReferralTiers] = useState<number[]>([]);
    const [claimingReferral, setClaimingReferral] = useState<number | null>(null);
    const [bonusReferralCount, setBonusReferralCount] = useState(0);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !userData) {
            setLoading(false);
            return;
        }

        setBonusReferralCount(userData.bonusReferralCount || 0);

        const fetchAllSettings = async () => {
            setLoading(true);
            
            // Fetch Daily Bonus Settings & Status
            const dailySettingsRef = doc(db, 'settings', 'dailyBonusConfig');
            const dailySettingsSnap = await getDoc(dailySettingsRef);
            if (dailySettingsSnap.exists()) {
                setDailyBonusSettings(dailySettingsSnap.data() as DailyBonusSettings);
            }
            const dailyClaimRef = doc(db, 'users', user.uid, 'bonus_claims', 'daily_login');
            const dailyClaimSnap = await getDoc(dailyClaimRef);
            if (dailyClaimSnap.exists()) {
                setLastDailyClaim(dailyClaimSnap.data().claimedAt.toDate());
            }

            // Fetch Referral Bonus Settings & Status
            const referralSettingsRef = doc(db, 'settings', 'referralBonusConfig');
            const referralSettingsSnap = await getDoc(referralSettingsRef);
            if (referralSettingsSnap.exists()) {
                setReferralBonusSettings(referralSettingsSnap.data() as ReferralBonusSettings);
            }
            const referralClaimsRef = collection(db, 'users', user.uid, 'bonus_claims');
            const referralClaimsSnap = await getDocs(referralClaimsRef);
            const claimedTiers = referralClaimsSnap.docs
                .filter(doc => doc.id.startsWith('referral_'))
                .map(doc => parseInt(doc.id.split('_')[1]));
            setClaimedReferralTiers(claimedTiers);

            setLoading(false);
        };
        
        fetchAllSettings();
    }, [user, userData]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (lastDailyClaim) {
                const twentyFourHours = 24 * 60 * 60 * 1000;
                const timeSinceClaim = new Date().getTime() - lastDailyClaim.getTime();
                if (timeSinceClaim >= twentyFourHours) {
                    setIsDailyClaimable(true);
                    setDailyCooldown('');
                } else {
                    setIsDailyClaimable(false);
                    const timeLeft = twentyFourHours - timeSinceClaim;
                    setDailyCooldown(formatDistanceToNow(new Date().getTime() + timeLeft));
                }
            } else {
                setIsDailyClaimable(true);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [lastDailyClaim]);
    
    const handleClaimDailyBonus = async () => {
        if (!user || !dailyBonusSettings || !isDailyClaimable) return;
        setClaimingDaily(true);
        const userRef = doc(db, 'users', user.uid);
        const claimRef = doc(db, 'users', user.uid, 'bonus_claims', 'daily_login');
        const transactionRef = doc(collection(db, 'transactions'));
        
        const batch = writeBatch(db);
        batch.update(userRef, { balance: increment(dailyBonusSettings.dailyBonusAmount) });
        batch.set(claimRef, { claimedAt: serverTimestamp() });
        batch.set(transactionRef, {
            userId: user.uid,
            type: 'bonus',
            amount: dailyBonusSettings.dailyBonusAmount,
            status: 'completed',
            description: 'Daily Login Bonus',
            createdAt: serverTimestamp(),
        });
        
        try {
            await batch.commit();
            toast({ title: "Success!", description: `LKR ${dailyBonusSettings.dailyBonusAmount.toFixed(2)} has been added to your main balance.`});
            setLastDailyClaim(new Date());
        } catch (error) {
            console.error("Error claiming daily bonus: ", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not claim daily bonus." });
        } finally {
            setClaimingDaily(false);
        }
    };
    
    const handleClaimReferralBonus = async (tier: {referrals: number, amount: number}) => {
        if (!user || !userData || (bonusReferralCount || 0) < tier.referrals || claimedReferralTiers.includes(tier.referrals)) return;
        setClaimingReferral(tier.referrals);
        
        const userRef = doc(db, 'users', user.uid);
        const claimRef = doc(db, 'users', user.uid, 'bonus_claims', `referral_${tier.referrals}`);
        const transactionRef = doc(collection(db, 'transactions'));
        
        const batch = writeBatch(db);
        batch.update(userRef, { balance: increment(tier.amount) });
        batch.set(claimRef, { claimedAt: serverTimestamp(), referrals: tier.referrals, amount: tier.amount });
        batch.set(transactionRef, {
            userId: user.uid,
            type: 'bonus',
            amount: tier.amount,
            status: 'completed',
            description: `Referral Bonus (${tier.referrals} users)`,
            createdAt: serverTimestamp(),
        });
        
         try {
            await batch.commit();
            toast({ title: "Success!", description: `LKR ${tier.amount.toFixed(2)} has been added to your main balance.`});
            setClaimedReferralTiers(prev => [...prev, tier.referrals]);
        } catch (error) {
            console.error("Error claiming referral bonus: ", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not claim referral bonus." });
        } finally {
            setClaimingReferral(null);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight">Bonus Center</h1>
                <p className="text-muted-foreground mt-2">Claim your rewards and track your progress.</p>
            </div>
            
            {dailyBonusSettings?.dailyBonusEnabled && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><CalendarClock/> Daily Login Bonus</CardTitle>
                        <CardDescription>Claim a free bonus every 24 hours just for logging in.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="p-4 bg-secondary rounded-lg flex flex-col items-center justify-center text-center">
                            <p className="text-4xl font-bold text-primary">LKR {dailyBonusSettings.dailyBonusAmount.toFixed(2)}</p>
                            <p className="text-muted-foreground">Available to claim once per day</p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button 
                            className="w-full" 
                            disabled={!isDailyClaimable || claimingDaily}
                            onClick={handleClaimDailyBonus}
                        >
                            {claimingDaily && <Loader2 className="animate-spin mr-2"/>}
                            {isDailyClaimable ? 'Claim Now' : `Claim in ${dailyCooldown}`}
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {referralBonusSettings?.enabled && referralBonusSettings.tiers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users/> Referral Bonus</CardTitle>
                        <CardDescription>Earn one-time rewards for inviting new players via your bonus referral link.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {referralBonusSettings.tiers.map((tier) => {
                            const isClaimed = claimedReferralTiers.includes(tier.referrals);
                            const canClaim = bonusReferralCount >= tier.referrals && !isClaimed;
                            const progress = Math.min((bonusReferralCount / tier.referrals) * 100, 100);

                            return (
                                <Card key={tier.referrals} className="p-4 bg-card/50">
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        <div className="flex-1 space-y-2">
                                            <div className="font-bold">Reward: LKR {tier.amount.toFixed(2)}</div>
                                            <p className="text-sm text-muted-foreground">Requirement: {tier.referrals} Bonus Referrals</p>
                                            <Progress value={progress} />
                                            <p className="text-xs text-muted-foreground text-right">{bonusReferralCount} / {tier.referrals}</p>
                                        </div>
                                        <Button
                                            disabled={!canClaim || claimingReferral === tier.referrals}
                                            onClick={() => handleClaimReferralBonus(tier)}
                                            className="w-full md:w-auto"
                                        >
                                            {claimingReferral === tier.referrals ? <Loader2 className="animate-spin" /> : isClaimed ? <><Check className="mr-2"/> Claimed</> : 'Claim'}
                                        </Button>
                                    </div>
                                </Card>
                            )
                        })}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
