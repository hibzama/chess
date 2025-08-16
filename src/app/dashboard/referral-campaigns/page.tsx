
'use client'
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, onSnapshot, query, setDoc, where, writeBatch, serverTimestamp, getDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Megaphone, Copy, Share, Users, Check, Loader2, Award, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Campaign } from '@/app/admin/referral-campaigns/page';
import { runTransaction, increment } from 'firebase/firestore';

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

export default function UserCampaignsPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
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
            setCampaigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign)));
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

        return () => unsubUserCampaign();
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
            await runTransaction(db, async (transaction) => {
                const userCampaignRef = doc(db, 'users', user.uid, 'active_campaigns', 'current');
                const userCampaignDoc = await transaction.get(userCampaignRef);

                if(!userCampaignDoc.exists() || userCampaignDoc.data()?.claimed) {
                    throw new Error("Reward already claimed or campaign not active.");
                }

                const userRef = doc(db, 'users', user.uid);
                const transactionRef = doc(collection(db, 'transactions'));
                
                transaction.update(userRef, { balance: increment(campaignDetails.referrerBonus) });
                transaction.set(transactionRef, {
                    userId: user.uid, type: 'bonus', amount: campaignDetails.referrerBonus,
                    status: 'completed', description: `Referral Campaign Bonus: ${campaignDetails.title}`,
                    createdAt: serverTimestamp()
                });
                transaction.update(userCampaignRef, { claimed: true });
            });

            toast({ title: "Reward Claimed!", description: `LKR ${campaignDetails.referrerBonus} has been added to your balance.` });
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
    const isCampaignComplete = campaignDetails && validReferrals.length >= campaignDetails.referralGoal;

    if (loading) {
        return <div className="space-y-4"> <Skeleton className="h-32 w-full" /> <Skeleton className="h-64 w-full" /> </div>
    }

    if (!activeUserCampaign || !campaignDetails) {
        return (
            <Card>
                <CardHeader><CardTitle>Start a Referral Campaign</CardTitle><CardDescription>Choose a campaign to start earning rewards.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    {campaigns.length > 0 ? campaigns.map(c => (
                        <Card key={c.id} className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-bold">{c.title}</p>
                                <p className="text-sm text-muted-foreground">Goal: {c.referralGoal} referrals | Reward: LKR {c.referrerBonus}</p>
                            </div>
                            <Button onClick={() => handleStartCampaign(c.id)}>Start</Button>
                        </Card>
                    )) : <p className="text-muted-foreground text-center">No active campaigns available right now.</p>}
                </CardContent>
            </Card>
        );
    }
    
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                        <span className="flex-1">Your Active Campaign: {campaignDetails.title}</span>
                         {isCampaignComplete && !activeUserCampaign.claimed && (
                            <Button onClick={handleClaimReward} className="bg-yellow-400 hover:bg-yellow-500 text-black">
                                <Award className="mr-2"/> Claim Reward: LKR {campaignDetails.referrerBonus}
                            </Button>
                        )}
                        {isCampaignComplete && activeUserCampaign.claimed && (
                            <Badge variant="secondary" className="bg-green-500/20 text-green-400"><Check className="mr-2"/> Reward Claimed</Badge>
                        )}
                    </CardTitle>
                    <CardDescription>Share your link and track your progress below. You can abandon this campaign to start a different one.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Your Unique Campaign Link</Label>
                        <div className="flex gap-2">
                            <Input readOnly value={referralLink} />
                            <Button variant="ghost" size="icon" onClick={() => copyLink(referralLink)}><Copy /></Button>
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
                            <ReferralList referrals={referrals.filter(r => !campaignDetails || r.campaignInfo.completedTasks.length < campaignDetails.tasks.length)} />
                        </TabsContent>
                        <TabsContent value="valid">
                            <ReferralList referrals={validReferrals} showAnswer campaign={campaignDetails} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}

const ReferralList = ({ referrals, showAnswer = false, campaign }: { referrals: CampaignReferral[], showAnswer?: boolean, campaign?: Campaign | null }) => (
    <ScrollArea className="h-72">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Contact</TableHead>
                    {showAnswer && <TableHead>Task Answers</TableHead>}
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {referrals.length > 0 ? referrals.map(ref => (
                    <TableRow key={ref.id}>
                        <TableCell>{ref.firstName} {ref.lastName}</TableCell>
                        <TableCell><a href={`tel:${ref.phone}`} className="flex items-center gap-1 hover:underline"><Phone className="w-3 h-3"/> {ref.phone}</a></TableCell>
                        {showAnswer && <TableCell>
                           <ul className="text-xs">
                               {campaign?.tasks.map(task => (
                                   <li key={task.id}><strong>{task.verificationQuestion}:</strong> {ref.campaignInfo.answers[task.id] || 'N/A'}</li>
                               ))}
                           </ul>
                        </TableCell>}
                        <TableCell>
                             <Badge variant={showAnswer ? 'default' : 'secondary'}>
                                {showAnswer ? 'Completed' : 'Pending Tasks'}
                            </Badge>
                        </TableCell>
                    </TableRow>
                )) : (
                    <TableRow><TableCell colSpan={showAnswer ? 4 : 3} className="h-24 text-center">No referrals in this list.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
    </ScrollArea>
);

    