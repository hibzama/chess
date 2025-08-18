
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift, Loader2, PartyPopper } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { DailyBonusCampaign } from '@/app/admin/bonus/daily-bonus/page';
import { formatDistanceToNowStrict } from 'date-fns';

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
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60));
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

const DailyBonusCard = ({ campaign, onClaimSuccess }: { campaign: DailyBonusCampaign, onClaimSuccess: (campaignId: string) => void }) => {
    const { toast } = useToast();
    const [isClaiming, setIsClaiming] = useState(false);
    const [status, setStatus] = useState<'pending' | 'active' | 'expired'>('pending');
    
    useEffect(() => {
        const now = new Date();
        const startDate = campaign.startDate.toDate();
        const endDate = campaign.endDate.toDate();

        if (now < startDate) setStatus('pending');
        else if (now >= startDate && now <= endDate) setStatus('active');
        else setStatus('expired');

    }, [campaign]);

    const handleClaimDailyBonus = async () => {
        setIsClaiming(true);
        try {
            const claimDailyBonusFunction = httpsCallable(functions, 'claimDailyBonus');
            const result: any = await claimDailyBonusFunction({ campaignId: campaign.id });
            
            if (result.data.success) {
                toast({ title: "Success!", description: `Your bonus claim of LKR ${result.data.bonusAmount.toFixed(2)} has been submitted for admin approval.`});
                onClaimSuccess(campaign.id);
            } else {
                 throw new Error(result.data.message || "Claim failed on the server.");
            }
        } catch (error: any) {
            const errorMessage = error.message || "An unknown error occurred while claiming the bonus.";
            toast({ variant: 'destructive', title: "Error", description: errorMessage });
        } finally {
            setIsClaiming(false);
        }
    };
    
    if (status === 'expired') return null;
    
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
                    <Button disabled={isClaiming || status !== 'active'} onClick={handleClaimDailyBonus} className="w-full">
                        {isClaiming ? <Loader2 className="animate-spin" /> : 'Claim Now'}
                    </Button>
                </div>
            </div>
        </Card>
    )
}


export default function DailyBonusPage() {
    const { user, userData } = useAuth();
    const [dailyCampaigns, setDailyCampaigns] = useState<DailyBonusCampaign[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBonuses = useCallback(async () => {
        if (!user || !userData) {
            setLoading(false);
            return;
        }
        setLoading(true);
        
        try {
            const dailyQuery = query(collection(db, 'daily_bonus_campaigns'), where('isActive', '==', true));
            const dailySnapshot = await getDocs(dailyQuery);
            const allActiveCampaigns = dailySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyBonusCampaign));
            
            const now = new Date();
            const futureCampaigns = allActiveCampaigns.filter(c => c.endDate.toDate() > now);

            const claimChecks = await Promise.all(futureCampaigns.map(c => getDoc(doc(db, `users/${user.uid}/daily_bonus_claims`, c.id))));
            const claimedIds = new Set(claimChecks.filter(snap => snap.exists()).map(snap => snap.id));
            
            const eligibleCampaigns = futureCampaigns.filter(c => {
                if (claimedIds.has(c.id)) return false;
                if ((c.claimsCount || 0) >= c.userLimit) return false;
                
                if (c.eligibility === 'all') return true;
                if (c.eligibility === 'below') return (userData.balance || 0) <= c.balanceThreshold;
                if (c.eligibility === 'above') return (userData.balance || 0) > c.balanceThreshold;
                
                return false;
            });
            setDailyCampaigns(eligibleCampaigns);
        } catch (error) {
            console.error("Error fetching daily bonuses:", error);
        } finally {
            setLoading(false);
        }
    }, [user, userData]);

    useEffect(() => {
        fetchBonuses();
    }, [fetchBonuses]);
    
    const handleClaimSuccess = (claimedCampaignId: string) => {
        setDailyCampaigns(prev => prev.filter(c => c.id !== claimedCampaignId));
    }

    if (loading) {
        return <div className="space-y-6"> <Skeleton className="h-48 w-full" /> <Skeleton className="h-48 w-full" /> </div>
    }

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight">Daily Bonus</h1>
                <p className="text-muted-foreground mt-2">Claim your rewards and track your progress.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PartyPopper/> Available Bonuses</CardTitle>
                    <CardDescription>Limited-time bonuses available for you to claim!</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {dailyCampaigns.length > 0 ? dailyCampaigns.map(campaign => (
                        <DailyBonusCard key={campaign.id} campaign={campaign} onClaimSuccess={handleClaimSuccess} />
                    )) : (
                        <p className="text-center text-muted-foreground py-8">No daily bonuses available for you right now.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
