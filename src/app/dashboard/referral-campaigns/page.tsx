
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
    return (
        <Card className="mb-8">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                        <Info className="w-5 h-5"/>
                        How Referral Campaigns Work
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
                <p>Referral Campaigns are a powerful way to earn significant rewards by helping grow the Nexbattle community. Here's how it works:</p>
                <ol className="list-decimal list-inside space-y-2">
                    <li><strong>Start a Campaign:</strong> Choose an available campaign from the list below to begin.</li>
                    <li><strong>Share Your Link:</strong> You will get a unique referral link for your active campaign. Share this with friends who are not yet on Nexbattle.</li>
                    <li><strong>Friends Complete Tasks:</strong> When a new user signs up using your link, they will be given a set of simple tasks to complete (like joining a social media group). For each task they complete, they earn a small bonus.</li>
                    <li><strong>Become a Valid Referral:</strong> Once your referred friend completes ALL their assigned tasks, they become a "valid referral" for your campaign.</li>
                    <li><strong>Claim Your Reward:</strong> After you collect enough valid referrals to meet your campaign's goal, you can claim your large reward bonus! Your claim will be reviewed and approved by an admin.</li>
                </ol>
            </CardContent>
        </Card>
    );
};

const MarketingIntro = () => {
    return (
        <div className="space-y-8 mt-12">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3"><Megaphone/> Referral Program</h1>
                <p className="text-muted-foreground">Learn how to maximize your earnings by growing the Nexbattle community.</p>
            </div>

            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShieldCheck/> Become a Marketing Partner</CardTitle>
                    <CardDescription>
                        Ready to take your earnings to the next level? Our Marketing Partner program is designed for dedicated community builders. Unlock a deep referral network and earn significant commissions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/marketing/register">Apply to Join the Marketing Team</Link>
                    </Button>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>The Marketing System</CardTitle>
                        <CardDescription>How our powerful 20-level system works.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-4">
                            <Users className="w-8 h-8 text-primary mt-1"/>
                            <div>
                                <h3 className="font-semibold">Level 1: Direct Referrals</h3>
                                <p className="text-sm text-muted-foreground">
                                    When you become a marketer, you get a unique <span className="font-semibold text-primary">`mref`</span> link. Anyone who signs up with this link becomes your direct Level 1 referral.
                                </p>
                            </div>
                        </div>
                         <div className="flex items-start gap-4">
                            <Layers className="w-8 h-8 text-primary mt-1"/>
                            <div>
                                <h3 className="font-semibold">Levels 2-20: Building Your Network</h3>
                                <p className="text-sm text-muted-foreground">
                                    Your network grows when anyone in your chain refers new players using their bonus referral links (<span className="font-semibold text-primary">`aref`</span>). These new players are added to your network, up to 20 levels deep.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Commission Structure</CardTitle>
                        <CardDescription>Simple and profitable commissions.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="flex items-start gap-4">
                            <DollarSign className="w-8 h-8 text-primary mt-1"/>
                            <div>
                                <h3 className="font-semibold">3% Commission</h3>
                                <p className="text-sm text-muted-foreground">
                                    You earn a 3% commission from the wager of <span className="font-bold">every player</span> in your 20-level network, every time they play a game.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <CheckCircle className="w-8 h-8 text-primary mt-1"/>
                            <div>
                                <h3 className="font-semibold">Double Commission</h3>
                                <p className="text-sm text-muted-foreground">
                                    If two players from your own network play against each other, you earn commission from <span className="font-bold">both</span> players, totaling 6% for that single game.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

const ReferralList = ({ referrals, campaign }: { referrals: CampaignReferral[], campaign: Campaign | null }) => {
    return (
        <ScrollArea className="h-72">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Task Progress</TableHead>
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
                                            <span>Pending:</span>
                                            <ul className="list-disc pl-4">
                                                {pendingTasks.map(task => <li key={task.id}>{task.description}</li>)}
                                            </ul>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-green-400 text-xs font-semibold">
                                            <Check className="w-4 h-4" /> All tasks complete
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        )
                    }) : (
                        <TableRow><TableCell colSpan={3} className="h-24 text-center">No referrals in this list.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </ScrollArea>
    );
}

export default function UserCampaignsPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();
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
            toast({ title: "Campaign Started!", description: "You can now share your unique referral link." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not start campaign." });
        } finally {
            setLoading(false);
        }
    };
    
    const handleAbandonCampaign = async () => {
        if (!user) return;
        const userCampaignRef = doc(db, 'users', user.uid, 'active_campaigns', 'current');
        try {
            await deleteDoc(userCampaignRef);
            toast({ title: "Campaign Abandoned", description: "You can now start a new campaign." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "Could not abandon campaign." });
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
            
            toast({ title: "Reward Claim Submitted!", description: `Your claim for LKR ${campaignDetails.referrerBonus} is pending admin approval.` });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Claim Failed", description: error.message });
        }
    }
    
    const copyLink = (link: string) => {
        navigator.clipboard.writeText(link);
        toast({ title: "Copied!", description: "Referral link copied to clipboard." });
    };

    const getClaimButtonText = () => {
        if (activeUserCampaign?.completed || hasPendingClaimForActiveCampaign) {
            return "Claim Submitted / Pending";
        }
        if (isCampaignGoalMet) {
            return `Claim Reward: LKR ${campaignDetails?.referrerBonus}`;
        }
        return "Goal Not Met";
    };
    
    const pageIntro = (
        <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Referral Campaigns</h1>
            <p className="text-muted-foreground">
                Participate in referral campaigns to earn rewards. Start a campaign, share your unique link, and guide new users to complete tasks.
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
                        <TabsTrigger value="campaigns">Available Campaigns</TabsTrigger>
                        <TabsTrigger value="history">Completed Campaigns</TabsTrigger>
                    </TabsList>
                    <TabsContent value="campaigns">
                        <Card>
                            <CardHeader>
                                <CardTitle>Start a Referral Campaign</CardTitle>
                                <CardDescription>Choose a campaign to start earning rewards.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {availableCampaigns.length > 0 ? availableCampaigns.map(c => (
                                    <Card key={c.id} className="bg-card/50 flex flex-col">
                                        <CardHeader>
                                            <CardTitle>{c.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-grow space-y-4">
                                            <div className="flex justify-around text-center">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Goal</p>
                                                    <p className="text-2xl font-bold flex items-center gap-2"><Target/> {c.referralGoal}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Reward</p>
                                                    <p className="text-2xl font-bold text-primary">LKR {c.referrerBonus}</p>
                                                </div>
                                            </div>
                                            <Separator />
                                            <div>
                                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><ClipboardCheck/> Referee Tasks</h4>
                                                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                                    {c.tasks.map((task, i) => (
                                                        <li key={i}>{task.description} (+ LKR {task.refereeBonus})</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </CardContent>
                                        <CardFooter>
                                            <Button className="w-full" onClick={() => handleStartCampaign(c.id)}>Start Campaign</Button>
                                        </CardFooter>
                                    </Card>
                                )) : <p className="text-muted-foreground text-center col-span-full">No new campaigns available right now.</p>}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="history">
                        <Card>
                            <CardHeader><CardTitle>Bonus History</CardTitle><CardDescription>Your bonus claims from completed referral campaigns.</CardDescription></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Campaign</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {claimHistory.length > 0 ? claimHistory.map(claim => (
                                            <TableRow key={claim.id}>
                                                <TableCell>{claim.campaignTitle || 'Referral Campaign'}</TableCell>
                                                <TableCell className="font-semibold">LKR {claim.amount.toFixed(2)}</TableCell>
                                                <TableCell>{claim.createdAt ? format(claim.createdAt.toDate(), 'PPp') : 'N/A'}</TableCell>
                                                <TableCell><Badge variant={claim.status === 'approved' ? 'default' : claim.status === 'rejected' ? 'destructive' : 'secondary'} className="capitalize">{claim.status}</Badge></TableCell>
                                            </TableRow>
                                        )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No history found.</TableCell></TableRow>}
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
    
    const validReferrals = referrals.filter(r => campaignDetails && r.campaignInfo.completedTasks.length === campaignDetails.tasks.length);
    const progress = campaignDetails ? (validReferrals.length / campaignDetails.referralGoal) * 100 : 0;
    const isCampaignGoalMet = campaignDetails && validReferrals.length >= campaignDetails.referralGoal;
    const hasPendingClaimForActiveCampaign = activeUserCampaign && claimHistory.some(c => c.campaignId === activeUserCampaign.campaignId && c.status === 'pending');
    const isClaimButtonDisabled = !isCampaignGoalMet || activeUserCampaign?.completed || hasPendingClaimForActiveCampaign;

    return (
        <div className="space-y-8">
            <CampaignIntroduction />
            <Card className="border-primary bg-primary/5">
                <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                        <span className="flex-1">Your Active Campaign: {campaignDetails.title}</span>
                         <Button onClick={handleClaimReward} disabled={isClaimButtonDisabled} className="bg-yellow-400 hover:bg-yellow-500 text-black shadow-lg animate-pulse disabled:animate-none">
                            <Award className="mr-2"/> {getClaimButtonText()}
                        </Button>
                    </CardTitle>
                    <CardDescription>Share your link and track your progress below.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-6">
                     <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="p-4 bg-background/50 rounded-lg space-y-2">
                             <h4 className="font-semibold text-primary flex items-center gap-2"><Award/> Your Goal</h4>
                             <p>Get <span className="font-bold">{campaignDetails.referralGoal}</span> people to sign up and complete all their tasks.</p>
                        </div>
                         <div className="p-4 bg-background/50 rounded-lg space-y-2">
                            <h4 className="font-semibold text-primary flex items-center gap-2"><Users/> Referrals' Goal</h4>
                            <p className="text-muted-foreground">Each new user must complete all tasks to become a valid referral.</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Your Unique Campaign Link</Label>
                        <div className="flex gap-2">
                            <Input readOnly value={referralLink} />
                            <Button variant="ghost" size="icon" onClick={() => copyLink(referralLink)}><Copy /></Button>
                            <Button variant="ghost" size="icon" onClick={() => navigator.share({ url: referralLink, title: `Join my Nexbattle campaign: ${campaignDetails.title}`})}><Share/></Button>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-semibold mb-2">Progress: {validReferrals.length} / {campaignDetails.referralGoal} Valid Referrals</p>
                        <Progress value={progress} />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button variant="destructive" onClick={handleAbandonCampaign}>Abandon Campaign</Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader><CardTitle>Your Referrals</CardTitle></CardHeader>
                <CardContent>
                    <Tabs defaultValue="pending">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="pending">Pending ({referrals.length - validReferrals.length})</TabsTrigger>
                            <TabsTrigger value="valid">Valid ({validReferrals.length})</TabsTrigger>
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
