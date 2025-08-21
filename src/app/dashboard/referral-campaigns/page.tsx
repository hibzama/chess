
'use client'
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, onSnapshot, query, setDoc, where, writeBatch, serverTimestamp, getDoc, deleteDoc, orderBy, addDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Megaphone, Copy, Share, Users, Check, Loader2, Award, Phone, Info, History, DollarSign, Layers, ShieldCheck, CheckCircle, Languages, Target, ClipboardCheck, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Campaign, CampaignTask } from '@/app/admin/referral-campaigns/page';
import { runTransaction, increment } from 'firebase/firestore';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/hooks/use-translation';

interface UserCampaign {
    campaignId: string;
    startedAt: any;
    completed: boolean;
    claimed: boolean;
}

interface CampaignReferral {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    campaignInfo: {
        completedTasks: string[];
        answers: Record<string, string>;
    }
}

interface ClaimHistory {
    id: string;
    amount: number;
    description?: string;
    createdAt: any;
    status: 'pending' | 'approved' | 'rejected';
    type: 'referrer' | 'referee';
    campaignId?: string;
    campaignTitle?: string;
}

const CampaignIntroduction = () => {
    const [language, setLanguage] = useState('en');
    const t = useTranslation;

    return (
        <Card className="mb-8">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                        <Info className="w-5 h-5"/>
                        {t('How Referral Campaigns Work')}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                         <Languages className="w-4 h-4 text-muted-foreground"/>
                        <button onClick={() => setLanguage('en')} className={cn("text-xs font-semibold", language === 'en' ? 'text-primary' : 'text-muted-foreground')}>EN</button>
                        <span className="text-muted-foreground">|</span>
                        <button onClick={() => setLanguage('si')} className={cn("text-xs font-semibold", language === 'si' ? 'text-primary' : 'text-muted-foreground')}>සිං</button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
                {language === 'en' ? (
                    <>
                        <p>{t('Referral Campaigns are a powerful way to earn significant rewards by helping grow the Nexbattle community. Here\'s how it works:')}</p>
                        <ol className="list-decimal list-inside space-y-2">
                            <li><strong>{t('Start a Campaign:')}</strong> {t('Choose an available campaign from the list below to begin.')}</li>
                            <li><strong>{t('Share Your Link:')}</strong> {t('You will get a unique referral link for your active campaign. Share this with friends who are not yet on Nexbattle.')}</li>
                            <li><strong>{t('Friends Complete Tasks:')}</strong> {t('When a new user signs up using your link, they will be given a set of simple tasks to complete (like joining a social media group). For each task they complete, they earn a small bonus.')}</li>
                            <li><strong>{t('Become a Valid Referral:')}</strong> {t('Once your referred friend completes ALL their assigned tasks, they become a "valid referral" for your campaign.')}</li>
                            <li><strong>{t('Claim Your Reward:')}</strong> {t('After you collect enough valid referrals to meet your campaign\'s goal, you can claim your large reward bonus! Your claim will be reviewed and approved by an admin.')}</li>
                        </ol>
                    </>
                ) : (
                    <>
                        <p>{t('Nexbattle ප්‍රජාව වර්ධනය කිරීමට උදවු වීමෙන් සැලකිය යුතු ත්‍යාග උපයා ගැනීමට Referral Campaigns යනු потужний спосіб වේ. එය ක්‍රියාත්මක වන ආකාරය මෙසේය:')}</p>
                        <ol className="list-decimal list-inside space-y-2">
                            <li><strong>{t('ප්‍රවර්ධනයක් ආරම්භ කරන්න:')}</strong> {t('ආරම්භ කිරීමට පහත ලැයිස්තුවෙන් පවතින ප්‍රවර්ධනයක් තෝරන්න.')}</li>
                            <li><strong>{t('ඔබේ සබැඳිය බෙදා ගන්න:')}</strong> {t('ඔබේ සක්‍රිය ප්‍රවර්ධනය සඳහා ඔබට අනන්‍ය වූ හඳුන්වාදීමේ සබැඳියක් ලැබෙනු ඇත. එය Nexbattle හි තවමත් නැති මිතුරන් සමඟ බෙදා ගන්න.')}</li>
                            <li><strong>{t('මිතුරන් කාර්යයන් සම්පූර්ණ කරයි:')}</strong> {t('නව පරිශීලකයෙකු ඔබේ සබැඳිය භාවිතයෙන් ලියාපදිංචි වූ විට, ඔවුන්ට සම්පූර්ණ කිරීමට සරල කාර්යයන් මාලාවක් ලබා දෙනු ඇත (සමාජ මාධ්‍ය කණ්ඩායමකට සම්බන්ධ වීම වැනි). ඔවුන් සම්පූර්ණ කරන සෑම කාර්යයක් සඳහාම, ඔවුන්ට කුඩා ප්‍රසාද දීමනාවක් ලැබේ.')}</li>
                            <li><strong>{t('වලංගු හඳුන්වාදීමක් වන්න:')}</strong> {t('ඔබ හඳුන්වා දුන් මිතුරා ඔවුන්ට පවරා ඇති සියලුම කාර්යයන් සම්පූර්ණ කළ පසු, ඔවුන් ඔබේ ප්‍රවර්ධනය සඳහා "වලංගු හඳුන්වාදීමක්" බවට පත්වේ.')}</li>
                            <li><strong>{t('ඔබේ ත්‍යාගය ලබා ගන්න:')}</strong> {t('ඔබේ ප්‍රවර්ධන ඉලක්කය සපුරාලීමට තරම් වලංගු හඳුන්වාදීම් එකතු කළ පසු, ඔබට ඔබේ විශාල ත්‍යාග ප්‍රසාද දීමනාව ලබා ගත හැකිය! ඔබේ ඉල්ලීම පරිපාලකයෙකු විසින් සමාලෝචනය කර අනුමත කරනු ලැබේ.')}</li>
                        </ol>
                    </>
                )}
            </CardContent>
        </Card>
    );
};


const MarketingIntro = () => {
    const t = useTranslation;
    return (
        <div className="space-y-8 mt-12">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3"><Megaphone/> {t('Referral Program')}</h1>
                <p className="text-muted-foreground">{t('Learn how to maximize your earnings by growing the Nexbattle community.')}</p>
            </div>

            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShieldCheck/> {t('Become a Marketing Partner')}</CardTitle>
                    <CardDescription>
                        {t('Ready to take your earnings to the next level? Our Marketing Partner program is designed for dedicated community builders. Unlock a deep referral network and earn significant commissions.')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/marketing/register">{t('Apply to Join the Marketing Team')}</Link>
                    </Button>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('The Marketing System')}</CardTitle>
                        <CardDescription>{t('How our powerful 20-level system works.')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-4">
                            <Users className="w-8 h-8 text-primary mt-1"/>
                            <div>
                                <h3 className="font-semibold">{t('Level 1: Direct Referrals')}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {t('When you become a marketer, you get a unique')} <span className="font-semibold text-primary">`mref`</span> {t('link. Anyone who signs up with this link becomes your direct Level 1 referral.')}
                                </p>
                            </div>
                        </div>
                         <div className="flex items-start gap-4">
                            <Layers className="w-8 h-8 text-primary mt-1"/>
                            <div>
                                <h3 className="font-semibold">{t('Levels 2-20: Building Your Network')}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {t('Your network grows when anyone in your chain refers new players using their bonus referral links (')} <span className="font-semibold text-primary">`aref`</span>{t('). These new players are added to your network, up to 20 levels deep.')}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>{t('Commission Structure')}</CardTitle>
                        <CardDescription>{t('Simple and profitable commissions.')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="flex items-start gap-4">
                            <DollarSign className="w-8 h-8 text-primary mt-1"/>
                            <div>
                                <h3 className="font-semibold">{t('3% Commission')}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {t('You earn a 3% commission from the wager of')} <span className="font-bold">{t('every player')}</span> {t('in your 20-level network, every time they play a game.')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <CheckCircle className="w-8 h-8 text-primary mt-1"/>
                            <div>
                                <h3 className="font-semibold">{t('Double Commission')}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {t('If two players from your own network play against each other, you earn commission from')} <span className="font-bold">{t('both')}</span> {t('players, totaling 6% for that single game.')}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function UserCampaignsPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const t = useTranslation;
    const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
    const [claimHistory, setClaimHistory] = useState<ClaimHistory[]>([]);
    const [activeUserCampaign, setActiveUserCampaign] = useState<UserCampaign | null>(null);
    const [campaignDetails, setCampaignDetails] = useState<Campaign | null>(null);
    const [referrals, setReferrals] = useState<CampaignReferral[]>([]);
    const [loading, setLoading] = useState(true);

    const referralLink = useMemo(() => {
        if (typeof window !== 'undefined' && user && activeUserCampaign) {
            return `${window.location.origin}/register?rcid=${activeUserCampaign.campaignId}&ref=${user.uid}`;
        }
        return '';
    }, [user, activeUserCampaign]);
    
    useEffect(() => {
        const fetchCampaigns = async () => {
            const q = query(collection(db, 'referral_campaigns'), where('isActive', '==', true));
            const snapshot = await getDocs(q);
            setAllCampaigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign)));
        };
        fetchCampaigns();
    }, []);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const userCampaignRef = doc(db, 'users', user.uid, 'active_campaigns', 'current');
        const unsubUserCampaign = onSnapshot(userCampaignRef, (campaignDoc) => {
            if (campaignDoc.exists()) {
                const userCampaignData = campaignDoc.data() as UserCampaign;
                setActiveUserCampaign(userCampaignData);
                getDoc(doc(db, 'referral_campaigns', userCampaignData.campaignId)).then(campaignSnap => {
                    if (campaignSnap.exists()) {
                        setCampaignDetails({ id: campaignSnap.id, ...campaignSnap.data() } as Campaign);
                    }
                });
            } else {
                setActiveUserCampaign(null);
                setCampaignDetails(null);
                setReferrals([]);
            }
            setLoading(false);
        });

        const claimQuery = query(
            collection(db, 'bonus_claims'), 
            where('userId', '==', user.uid),
            where('type', '==', 'referrer'),
        );
        const unsubHistory = onSnapshot(claimQuery, (snapshot) => {
            const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()}) as ClaimHistory);
            setClaimHistory(history.sort((a,b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)));
        });

        return () => {
            unsubUserCampaign();
            unsubHistory();
        };
    }, [user]);

     const availableCampaigns = useMemo(() => {
        if (loading || activeUserCampaign) return [];
        
        const completedOrPendingCampaignIds = new Set(claimHistory.map(c => c.campaignId));
        return allCampaigns.filter(c => !completedOrPendingCampaignIds.has(c.id));

    }, [allCampaigns, claimHistory, activeUserCampaign, loading]);

    useEffect(() => {
        if (user && activeUserCampaign) {
            const referralsQuery = query(collection(db, 'users'), where('campaignInfo.campaignId', '==', activeUserCampaign.campaignId), where('campaignInfo.referrerId', '==', user.uid));
            const unsubReferrals = onSnapshot(referralsQuery, (snapshot) => {
                const referralsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as CampaignReferral));
                setReferrals(referralsData);
            });
            return () => unsubReferrals();
        }
    }, [user, activeUserCampaign]);

    const handleStartCampaign = async (campaignId: string) => {
        if (!user) return;
        setLoading(true);
        const userCampaignRef = doc(db, 'users', user.uid, 'active_campaigns', 'current');
        try {
            await setDoc(userCampaignRef, {
                campaignId: campaignId,
                startedAt: serverTimestamp(),
                completed: false,
                claimed: false,
            });
            toast({ title: t("Campaign Started!"), description: t("You can now share your unique referral link.") });
        } catch (error) {
            toast({ variant: 'destructive', title: t("Error"), description: t("Could not start campaign.") });
        } finally {
            setLoading(false);
        }
    };
    
    const handleAbandonCampaign = async () => {
        if (!user) return;
        const userCampaignRef = doc(db, 'users', user.uid, 'active_campaigns', 'current');
        try {
            await deleteDoc(userCampaignRef);
            toast({ title: t("Campaign Abandoned"), description: t("You can now start a new campaign.") });
        } catch (e) {
            toast({ variant: 'destructive', title: t("Error"), description: t("Could not abandon campaign.") });
        }
    }


    const handleClaimReward = async () => {
        if (!user || !activeUserCampaign || !campaignDetails) return;
        
        try {
            const claimRef = doc(collection(db, 'bonus_claims'));
            
            await runTransaction(db, async (transaction) => {
                const userCampaignRef = doc(db, 'users', user.uid, 'active_campaigns', 'current');
                
                transaction.set(claimRef, {
                    userId: user.uid,
                    type: 'referrer',
                    amount: campaignDetails.referrerBonus,
                    status: 'pending',
                    campaignId: campaignDetails.id,
                    campaignTitle: `Campaign Completion: ${campaignDetails.title}`,
                    createdAt: serverTimestamp(),
                });
                
                transaction.update(userCampaignRef, { completed: true });
            });
            
            toast({ title: t("Reward Claim Submitted!"), description: t(`Your claim for LKR ${campaignDetails.referrerBonus} is pending admin approval.`) });
        } catch (error: any) {
            toast({ variant: "destructive", title: t("Claim Failed"), description: error.message });
        }
    }
    
    const copyLink = (link: string) => {
        navigator.clipboard.writeText(link);
        toast({ title: t("Copied!"), description: t("Referral link copied to clipboard.") });
    };
    
    const validReferrals = referrals.filter(r => campaignDetails && r.campaignInfo.completedTasks.length === campaignDetails.tasks.length);
    const progress = campaignDetails ? (validReferrals.length / campaignDetails.referralGoal) * 100 : 0;
    const isCampaignGoalMet = campaignDetails && validReferrals.length >= campaignDetails.referralGoal;
    
    const hasPendingClaimForActiveCampaign = activeUserCampaign && claimHistory.some(c => c.campaignId === activeUserCampaign.campaignId && c.status === 'pending');
    const isClaimButtonDisabled = !isCampaignGoalMet || activeUserCampaign?.completed || hasPendingClaimForActiveCampaign;
    
    // Translated text at top level
    const claimSubmittedText = t("Claim Submitted / Pending");
    const claimRewardText = t("Claim Reward:");
    const goalNotMetText = t("Goal Not Met");
    const yourGoalText = t("Your Goal");
    const referralsGoalText = t("Referrals' Goal");
    const yourUniqueLinkText = t("Your Unique Campaign Link");
    const progressText = t("Progress:");
    const validReferralsText = t("Valid Referrals");
    const abandonCampaignText = t("Abandon Campaign");

    const getClaimButtonText = () => {
        if (activeUserCampaign?.completed || hasPendingClaimForActiveCampaign) {
            return claimSubmittedText;
        }
        if (isCampaignGoalMet) {
            return `${claimRewardText} LKR ${campaignDetails?.referrerBonus}`;
        }
        return goalNotMetText;
    }
    
    const pageIntro = (
        <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{t('Referral Campaigns')}</h1>
            <p className="text-muted-foreground">
                {t('Participate in referral campaigns to earn rewards. Start a campaign, share your unique link, and guide new users to complete tasks.')}
            </p>
        </div>
    );

    if (loading) {
        return (
            <div className="space-y-8">
                {pageIntro}
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (!activeUserCampaign || !campaignDetails) {
        return (
            <div className="space-y-8">
                <CampaignIntroduction/>
                <Tabs defaultValue="campaigns">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="campaigns">{t('Available Campaigns')}</TabsTrigger>
                        <TabsTrigger value="history">{t('Completed Campaigns')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="campaigns">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Start a Referral Campaign')}</CardTitle>
                                <CardDescription>{t('Choose a campaign to start earning rewards.')}</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {availableCampaigns.length > 0 ? availableCampaigns.map(c => (
                                    <Card key={c.id} className="bg-card/50 flex flex-col">
                                        <CardHeader>
                                            <CardTitle>{t(c.title)}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-grow space-y-4">
                                            <div className="flex justify-around text-center">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">{t('Goal')}</p>
                                                    <p className="text-2xl font-bold flex items-center gap-2"><Target/> {c.referralGoal}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">{t('Reward')}</p>
                                                    <p className="text-2xl font-bold text-primary">LKR {c.referrerBonus}</p>
                                                </div>
                                            </div>
                                            <Separator />
                                            <div>
                                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><ClipboardCheck/> {t('Referee Tasks')}</h4>
                                                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                                    {c.tasks.map((task, i) => (
                                                        <li key={i}>{t(task.description)} (+ LKR {task.refereeBonus})</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </CardContent>
                                        <CardFooter>
                                            <Button className="w-full" onClick={() => handleStartCampaign(c.id)}>{t('Start Campaign')}</Button>
                                        </CardFooter>
                                    </Card>
                                )) : <p className="text-muted-foreground text-center col-span-full">{t('No new campaigns available right now.')}</p>}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="history">
                        <Card>
                            <CardHeader><CardTitle>{t('Bonus History')}</CardTitle><CardDescription>{t('Your bonus claims from completed referral campaigns.')}</CardDescription></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>{t('Campaign')}</TableHead><TableHead>{t('Amount')}</TableHead><TableHead>{t('Date')}</TableHead><TableHead>{t('Status')}</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {claimHistory.length > 0 ? claimHistory.map(claim => (
                                            <TableRow key={claim.id}>
                                                <TableCell>{t(claim.campaignTitle || 'Referral Campaign')}</TableCell>
                                                <TableCell className="font-semibold">LKR {claim.amount.toFixed(2)}</TableCell>
                                                <TableCell>{claim.createdAt ? format(claim.createdAt.toDate(), 'PPp') : 'N/A'}</TableCell>
                                                <TableCell><Badge variant={claim.status === 'approved' ? 'default' : claim.status === 'rejected' ? 'destructive' : 'secondary'} className="capitalize">{t(claim.status)}</Badge></TableCell>
                                            </TableRow>
                                        )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">{t('No history found.')}</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
                <MarketingIntro />
            </div>
        );
    }
    
    return (
        <div className="space-y-8">
            <CampaignIntroduction />
            <Card className="border-primary bg-primary/5">
                <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                        <span className="flex-1">{t('Your Active Campaign:')} {t(campaignDetails.title)}</span>
                         <Button onClick={handleClaimReward} disabled={isClaimButtonDisabled} className="bg-yellow-400 hover:bg-yellow-500 text-black shadow-lg animate-pulse disabled:animate-none">
                            <Award className="mr-2"/> {getClaimButtonText()}
                        </Button>
                    </CardTitle>
                    <CardDescription>{t('Share your link and track your progress below.')}</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-6">
                     <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="p-4 bg-background/50 rounded-lg space-y-2">
                             <h4 className="font-semibold text-primary flex items-center gap-2"><Award/> {yourGoalText}</h4>
                             <p>{t('Get')} <span className="font-bold">{campaignDetails.referralGoal}</span> {t('people to sign up and complete all their tasks.')}</p>
                        </div>
                         <div className="p-4 bg-background/50 rounded-lg space-y-2">
                            <h4 className="font-semibold text-primary flex items-center gap-2"><Users/> {referralsGoalText}</h4>
                            <p className="text-muted-foreground">{t('Each new user must complete all tasks to become a valid referral.')}</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>{yourUniqueLinkText}</Label>
                        <div className="flex gap-2">
                            <Input readOnly value={referralLink} />
                            <Button variant="ghost" size="icon" onClick={() => copyLink(referralLink)}><Copy /></Button>
                            <Button variant="ghost" size="icon" onClick={() => navigator.share({ url: referralLink, title: `${t('Join my Nexbattle campaign:')} ${t(campaignDetails.title)}`})}><Share/></Button>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-semibold mb-2">{progressText} {validReferrals.length} / {campaignDetails.referralGoal} {validReferralsText}</p>
                        <Progress value={progress} />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button variant="destructive" onClick={handleAbandonCampaign}>{abandonCampaignText}</Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader><CardTitle>{t('Your Referrals')}</CardTitle></CardHeader>
                <CardContent>
                    <Tabs defaultValue="pending">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="pending">{t('Pending')} ({referrals.length - validReferrals.length})</TabsTrigger>
                            <TabsTrigger value="valid">{t('Valid')} ({validReferrals.length})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="pending">
                            <ReferralList referrals={referrals.filter(r => !campaignDetails || r.campaignInfo.completedTasks.length < campaignDetails.tasks.length)} campaign={campaignDetails} />
                        </TabsContent>
                        <TabsContent value="valid">
                            <ReferralList referrals={validReferrals} campaign={campaignDetails} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
             <MarketingIntro />
        </div>
    )
}

const ReferralList = ({ referrals, campaign }: { referrals: CampaignReferral[], campaign: Campaign | null }) => {
    const t = useTranslation;
    return (
        <ScrollArea className="h-72">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('User')}</TableHead>
                        <TableHead>{t('Contact')}</TableHead>
                        <TableHead>{t('Task Progress')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {referrals.length > 0 ? referrals.map(ref => {
                        const completedTaskIds = new Set(ref.campaignInfo.completedTasks || []);
                        const pendingTasks = campaign?.tasks.filter(task => !completedTaskIds.has(task.id)) || [];

                        return (
                            <TableRow key={ref.id}>
                                <TableCell>{ref.firstName} {ref.lastName}</TableCell>
                                <TableCell><a href={`tel:${ref.phone}`} className="flex items-center gap-1 hover:underline"><Phone className="w-3 h-3"/> {ref.phone}</a></TableCell>
                                <TableCell>
                                    {pendingTasks.length > 0 ? (
                                        <div className="text-xs text-muted-foreground space-y-1">
                                            <span>{t('Pending:')}</span>
                                            <ul className="list-disc pl-4">
                                                {pendingTasks.map(task => <li key={task.id}>{t(task.description)}</li>)}
                                            </ul>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-green-400 text-xs font-semibold">
                                            <Check className="w-4 h-4" /> {t('All tasks complete')}
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        )
                    }) : (
                        <TableRow><TableCell colSpan={3} className="h-24 text-center">{t('No referrals in this list.')}</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </ScrollArea>
    );
}
