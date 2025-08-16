
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, writeBatch, collection, getDocs, query, where, Timestamp, getCountFromServer } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift, Users, CalendarClock, Check, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { DailyBonusCampaign } from '@/app/admin/bonus/daily-bonus/page';

interface ReferralBonusSettings {
    enabled: boolean;
    tiers: { referrals: number; amount: number }[];
}

export default function BonusCenterPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();

    // Daily Bonus State
    const [dailyCampaigns, setDailyCampaigns] = useState<DailyBonusCampaign[]>([]);
    const [claimedDailyCampaigns, setClaimedDailyCampaigns] = useState<string[]>([]);
    const [claimingDaily, setClaimingDaily] = useState<string | null>(null);

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
            const now = Timestamp.now();
            const dailyQuery = query(
                collection(db, 'daily_bonus_campaigns'),
                where('isActive', '==', true),
                where('startDate', '<=', now)
            );
            const dailySnapshot = await getDocs(dailyQuery);
            const activeCampaigns = dailySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as DailyBonusCampaign))
                .filter(c => c.endDate.toDate() > now.toDate());

            // Check eligibility
            const eligibleCampaigns = activeCampaigns.filter(c => {
                if (c.eligibility === 'all') return true;
                if (c.eligibility === 'below') return (userData.balance || 0) <= c.balanceThreshold;
                if (c.eligibility === 'above') return (userData.balance || 0) > c.balanceThreshold;
                return false;
            });
            setDailyCampaigns(eligibleCampaigns);
            
            // Fetch user's daily claims
            const dailyClaimsSnapshot = await getDocs(collection(db, `users/${user.uid}/daily_bonus_claims`));
            setClaimedDailyCampaigns(dailyClaimsSnapshot.docs.map(doc => doc.id));


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
    
    const handleClaimDailyBonus = async (campaign: DailyBonusCampaign) => {
        if (!user || !userData) return;
        
        setClaimingDaily(campaign.id);

        const claimsCollectionRef = collection(db, `daily_bonus_campaigns/${campaign.id}/claims`);
        const snapshot = await getCountFromServer(claimsCollectionRef);
        if (snapshot.data().count >= campaign.userLimit) {
            toast({ variant: 'destructive', title: "Limit Reached", description: "This bonus has already been claimed by the maximum number of users." });
            setClaimingDaily(null);
            return;
        }

        const userRef = doc(db, 'users', user.uid);
        const claimRef = doc(db, `users/${user.uid}/daily_bonus_claims`, campaign.id);
        const adminClaimRef = doc(claimsCollectionRef, user.uid);
        const transactionRef = doc(collection(db, 'transactions'));
        
        let bonusAmount = 0;
        if(campaign.bonusType === 'fixed') {
            bonusAmount = campaign.bonusValue;
        } else {
            bonusAmount = (userData.balance || 0) * (campaign.bonusValue / 100);
        }

        const batch = writeBatch(db);
        batch.update(userRef, { balance: increment(bonusAmount) });
        batch.set(claimRef, { claimedAt: serverTimestamp(), title: campaign.title, amount: bonusAmount });
        batch.set(adminClaimRef, { userId: user.uid, claimedAt: serverTimestamp() });
        batch.set(transactionRef, {
            userId: user.uid, type: 'bonus', amount: bonusAmount,
            status: 'completed', description: `Daily Bonus: ${campaign.title}`,
            createdAt: serverTimestamp(),
        });
        
        try {
            await batch.commit();
            toast({ title: "Success!", description: `LKR ${bonusAmount.toFixed(2)} has been added to your main balance.`});
            setClaimedDailyCampaigns(prev => [...prev, campaign.id]);
        } catch (error) {
            console.error("Error claiming daily bonus: ", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not claim daily bonus." });
        } finally {
            setClaimingDaily(null);
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
                    <CardTitle className="flex items-center gap-2"><CalendarClock/> Daily Bonuses</CardTitle>
                    <CardDescription>Claim a free bonus every 24 hours just for logging in.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {dailyCampaigns.length > 0 ? dailyCampaigns.map(campaign => {
                        const isClaimed = claimedDailyCampaigns.includes(campaign.id);
                        const isClaiming = claimingDaily === campaign.id;
                        return (
                            <Card key={campaign.id} className="p-4 bg-card/50">
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    <div className="flex-1 space-y-1">
                                        <p className="font-bold">{campaign.title}</p>
                                        <p className="text-sm text-muted-foreground">Reward: {campaign.bonusType === 'fixed' ? `LKR ${campaign.bonusValue}` : `${campaign.bonusValue}% of balance`}</p>
                                    </div>
                                    <Button disabled={isClaimed || !!claimingDaily} onClick={() => handleClaimDailyBonus(campaign)}>
                                        {isClaiming ? <Loader2 className="animate-spin" /> : isClaimed ? <><Check className="mr-2"/> Claimed</> : 'Claim Now'}
                                    </Button>
                                </div>
                            </Card>
                        )
                    }) : (
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

    