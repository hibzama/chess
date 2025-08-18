
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, writeBatch, collection, getDocs, query, where, Timestamp, addDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift, Users, CalendarClock, Check, Loader2, PartyPopper } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { DailyBonusCampaign } from '@/app/admin/bonus/daily-bonus/page';
import { formatDistanceToNowStrict } from 'date-fns';

interface ReferralBonusSettings {
    enabled: boolean;
    tiers: { referrals: number; amount: number }[];
}

const Countdown = ({ targetDate }: { targetDate: Date }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const distance = targetDate.getTime() - now.getTime();

            if (distance < 0) {
                setTimeLeft("00:00:00");
                clearInterval(interval);
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            let timeString = '';
            if (days > 0) timeString += `${days}d `;
            timeString += `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            setTimeLeft(timeString);
        }, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    return <span className="font-mono font-bold text-lg">{timeLeft}</span>;
}

const DailyBonusCard = ({ campaign }: { campaign: DailyBonusCampaign }) => {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const [claimed, setClaimed] = useState(true); // Assume claimed initially
    const [isClaiming, setIsClaiming] = useState(false);
    const [status, setStatus] = useState<'pending' | 'active' | 'expired'>('pending');
    
    useEffect(() => {
        const checkClaimStatus = async () => {
            if (!user) return;
            const claimRef = doc(db, `users/${user.uid}/daily_bonus_claims/${campaign.id}`);
            const claimSnap = await getDoc(claimRef);
            setClaimed(claimSnap.exists());
        };
        checkClaimStatus();

        const now = new Date();
        const startDate = campaign.startDate.toDate();
        const endDate = campaign.endDate.toDate();

        if (now < startDate) setStatus('pending');
        else if (now >= startDate && now <= endDate) setStatus('active');
        else setStatus('expired');

    }, [user, campaign]);

    const handleClaimDailyBonus = async (campaign: DailyBonusCampaign) => {
        setIsClaiming(true);
        try {
            const claimDailyBonusFunction = httpsCallable(functions, 'claimDailyBonus');
            const result: any = await claimDailyBonusFunction({ campaignId: campaign.id });
            
            if (result.data.success) {
                toast({ title: "Success!", description: `LKR ${result.data.bonusAmount.toFixed(2)} has been added to your wallet.`});
                setClaimed(true);
            } else {
                 throw new Error(result.data.message || "Claim failed on the server.");
            }
        } catch (error: any) {
            console.error("Error claiming daily bonus: ", error);
            const errorMessage = error.code ? error.message : "An unknown error occurred.";
            toast({ variant: 'destructive', title: "Error", description: errorMessage });
        } finally {
            setIsClaiming(false);
        }
    };
    
    if (status === 'expired') return null; // Don't show expired bonuses
    
    const claimsLeft = campaign.userLimit - (campaign.claimsCount || 0);

    return (
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 space-y-2">
                    <p className="font-bold text-lg text-primary">{campaign.title}</p>
                    <p className="text-sm text-muted-foreground">Reward: {campaign.bonusType === 'fixed' ? `LKR ${campaign.bonusValue}` : `${campaign.bonusValue}% of balance`}</p>
                     <div className="space-y-1 pt-2">
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>Claims Left</span>
                            <span>{claimsLeft > 0 ? claimsLeft : 0} / {campaign.userLimit}</span>
                        </div>
                        <Progress value={(campaign.claimsCount || 0) / campaign.userLimit * 100} />
                    </div>
                </div>
                <div className="w-full md:w-auto text-center space-y-2">
                    {status === 'pending' && (
                        <>
                            <div className="text-sm text-yellow-400">Starts in</div>
                            <Countdown targetDate={campaign.startDate.toDate()} />
                        </>
                    )}
                     {status === 'active' && (
                        <>
                             <div className="text-sm text-red-400">Ends in</div>
                             <Countdown targetDate={campaign.endDate.toDate()} />
                        </>
                    )}
                    <Button disabled={claimed || isClaiming || status !== 'active'} onClick={() => handleClaimDailyBonus(campaign)} className="w-full">
                        {isClaiming ? <Loader2 className="animate-spin" /> : claimed ? <><Check className="mr-2"/> Claimed</> : 'Claim Now'}
                    </Button>
                </div>
            </div>
        </Card>
    )
}


export default function BonusCenterPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();

    // Daily Bonus State
    const [dailyCampaigns, setDailyCampaigns] = useState<DailyBonusCampaign[]>([]);

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
            
            // Daily Bonus Campaigns
            const dailyQuery = query(
                collection(db, 'daily_bonus_campaigns'),
                where('isActive', '==', true)
            );
            const dailySnapshot = await getDocs(dailyQuery);
            const allActiveCampaigns = dailySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as DailyBonusCampaign));
            
            // Filter out expired campaigns on the client side
            const now = new Date();
            const futureCampaigns = allActiveCampaigns.filter(c => c.endDate.toDate() > now);

            const eligibleCampaigns = futureCampaigns.filter(c => {
                if (c.eligibility === 'all') return true;
                if (c.eligibility === 'below') return (userData.balance || 0) <= c.balanceThreshold;
                if (c.eligibility === 'above') return (userData.balance || 0) > c.balanceThreshold;
                return false;
            });
            setDailyCampaigns(eligibleCampaigns);


            // Referral Bonus Settings & Status
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
            userId: user.uid, type: 'bonus', amount: tier.amount,
            status: 'completed', description: `Referral Bonus (${tier.referrals} users)`,
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
        return <div className="space-y-6"> <Skeleton className="h-48 w-full" /> <Skeleton className="h-64 w-full" /> </div>
    }

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight">Bonus Center</h1>
                <p className="text-muted-foreground mt-2">Claim your rewards and track your progress.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PartyPopper/> Daily Bonuses</CardTitle>
                    <CardDescription>Limited-time bonuses available for you to claim!</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {dailyCampaigns.length > 0 ? dailyCampaigns.map(campaign => (
                        <DailyBonusCard key={campaign.id} campaign={campaign} />
                    )) : (
                        <p className="text-center text-muted-foreground py-4">No daily bonuses available for you right now.</p>
                    )}
                </CardContent>
            </Card>

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
