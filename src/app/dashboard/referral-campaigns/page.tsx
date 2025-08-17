
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
import { Megaphone, Copy, Share, Users, Check, Loader2, Award, Phone, Info, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Campaign, CampaignTask } from '@/app/admin/referral-campaigns/page';
import { runTransaction, increment } from 'firebase/firestore';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';

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
    description: string;
    createdAt: any;
    status: string;
    type: 'referrer' | 'referee';
    campaignId?: string;
    campaignTitle?: string;
}

export default function UserCampaignsPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
    const [completedCampaigns, setCompletedCampaigns] = useState<ClaimHistory[]>([]);
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
    
     const availableCampaigns = useMemo(() => {
        if (!activeUserCampaign && completedCampaigns.length >= 0) {
            const completedOrPendingCampaignIds = new Set(completedCampaigns.map(c => c.campaignId));
            return allCampaigns.filter(c => !completedOrPendingCampaignIds.has(c.id));
        }
        return [];
    }, [allCampaigns, completedCampaigns, activeUserCampaign]);

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

         // Fetch claim history for completed campaigns
        const claimQuery = query(
            collection(db, 'bonus_claims'), 
            where('userId', '==', user.uid),
            where('type', '==', 'referrer'),
        );
        const unsubHistory = onSnapshot(claimQuery, (snapshot) => {
            const completed = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()}) as ClaimHistory);
            setCompletedCampaigns(completed.sort((a,b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)));
        });

        return () => {
            unsubUserCampaign();
            unsubHistory();
        };
    }, [user]);

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
            await addDoc(collection(db, 'bonus_claims'), {
                userId: user.uid,
                type: 'referrer',
                amount: campaignDetails.referrerBonus,
                status: 'pending',
                campaignId: campaignDetails.id,
                campaignTitle: `Campaign Completion: ${campaignDetails.title}`,
                createdAt: serverTimestamp(),
            });
            
            // Mark the local campaign as completed so user cannot claim again until this is processed
            await updateDoc(doc(db, 'users', user.uid, 'active_campaigns', 'current'), {
                completed: true
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
    
    const validReferrals = referrals.filter(r => campaignDetails && r.campaignInfo.completedTasks.length === campaignDetails.tasks.length);
    const progress = campaignDetails ? (validReferrals.length / campaignDetails.referralGoal) * 100 : 0;
    const isCampaignGoalMet = campaignDetails && validReferrals.length >= campaignDetails.referralGoal;
    const hasPendingOrClaimed = activeUserCampaign?.completed || activeUserCampaign?.claimed;

    if (loading) {
        return <div className="space-y-4"> <Skeleton className="h-32 w-full" /> <Skeleton className="h-64 w-full" /> </div>
    }

    if (!activeUserCampaign || !campaignDetails) {
        return (
            <Tabs defaultValue="campaigns">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="campaigns">Available Campaigns</TabsTrigger>
                    <TabsTrigger value="history">Completed Campaigns</TabsTrigger>
                </TabsList>
                 <TabsContent value="campaigns">
                    <Card>
                        <CardHeader><CardTitle>Start a Referral Campaign</CardTitle><CardDescription>Choose a campaign to start earning rewards.</CardDescription></CardHeader>
                        <CardContent className="space-y-4">
                            {availableCampaigns.length > 0 ? availableCampaigns.map(c => (
                                <Card key={c.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <p className="font-bold">{c.title}</p>
                                        <p className="text-sm text-muted-foreground">Goal: {c.referralGoal} referrals | Reward: LKR {c.referrerBonus}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Dialog>
                                            <DialogTrigger asChild><Button variant="secondary">Details</Button></DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Tasks for "{c.title}"</DialogTitle>
                                                    <DialogDescription>A new user must complete all these tasks for you to get referral credit.</DialogDescription>
                                                </DialogHeader>
                                                <ul className="list-disc space-y-2 pl-5 mt-4 text-sm">
                                                    {c.tasks.map(task => <li key={task.id}>{task.description} (Reward: LKR {task.refereeBonus})</li>)}
                                                </ul>
                                            </DialogContent>
                                        </Dialog>
                                        <Button onClick={() => handleStartCampaign(c.id)}>Start</Button>
                                    </div>
                                </Card>
                            )) : <p className="text-muted-foreground text-center">No new campaigns available right now.</p>}
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
                                    {completedCampaigns.length > 0 ? completedCampaigns.map(claim => (
                                        <TableRow key={claim.id}>
                                            <TableCell>{claim.campaignTitle}</TableCell>
                                            <TableCell className="font-semibold">LKR {claim.amount.toFixed(2)}</TableCell>
                                            <TableCell>{claim.createdAt ? format(claim.createdAt.toDate(), 'PPp') : 'N/A'}</TableCell>
                                            <TableCell><Badge variant={claim.status === 'approved' ? 'default' : claim.status === 'rejected' ? 'destructive' : 'secondary'} className="capitalize">{claim.status}</Badge></TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={4} className="text-center h-24">No history found.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                     </Card>
                 </TabsContent>
            </Tabs>
        );
    }
    
    return (
        <div className="space-y-8">
            <Card className="border-primary bg-primary/5">
                <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                        <span className="flex-1">Your Active Campaign: {campaignDetails.title}</span>
                         {isCampaignGoalMet && !hasPendingOrClaimed && (
                            <Button onClick={handleClaimReward} className="bg-yellow-400 hover:bg-yellow-500 text-black shadow-lg animate-pulse">
                                <Award className="mr-2"/> Claim Reward: LKR {campaignDetails.referrerBonus}
                            </Button>
                        )}
                        {hasPendingOrClaimed && (
                            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 text-base py-1 px-3"><Check className="mr-2"/> Claim Pending/Submitted</Badge>
                        )}
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
        </div>
    )
}

const ReferralList = ({ referrals, campaign }: { referrals: CampaignReferral[], campaign: Campaign | null }) => (
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
