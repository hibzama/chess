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
import { Megaphone, Copy, Share, Users, Check, Loader2, Award, Phone, Info, History, DollarSign, Layers, ShieldCheck, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Campaign, CampaignTask } from '@/app/admin/referral-campaigns/page';
import { runTransaction, increment } from 'firebase/firestore';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';
import Link from 'next/link';

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
    
    const validReferrals = referrals.filter(r => campaignDetails && r.campaignInfo.completedTasks.length === campaignDetails.tasks.length);
    const progress = campaignDetails ? (validReferrals.length / campaignDetails.referralGoal) * 100 : 0;
    const isCampaignGoalMet = campaignDetails && validReferrals.length >= campaignDetails.referralGoal;
    
    const hasPendingClaimForActiveCampaign = activeUserCampaign && claimHistory.some(c => c.campaignId === activeUserCampaign.campaignId && c.status === 'pending');
    const isClaimButtonDisabled = !isCampaignGoalMet || activeUserCampaign?.completed || hasPendingClaimForActiveCampaign;
    
    const getClaimButtonText = () => {
        if (activeUserCampaign?.completed || hasPendingClaimForActiveCampaign) {
            return "Claim Submitted / Pending";
        }
        if (isCampaignGoalMet) {
            return `Claim Reward: LKR ${campaignDetails?.referrerBonus}`;
        }
        return "Goal Not Met";
    }

    if (loading) {
        return <div className="space-y-4"> <Skeleton className="h-32 w-full" /> <Skeleton className="h-64 w-full" /> </div>
    }

    if (!activeUserCampaign || !campaignDetails) {
        return (
            <div className="space-y-8">
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
                                    {claimHistory.length > 0 ? claimHistory.map(claim => (
                                        <TableRow key={claim.id}>
                                            <TableCell>{claim.campaignTitle}</TableCell>
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
    
    return (
        <div className="space-y-8">
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

```></content>
  </change>
  <change>
    <file>/src/components/layout/main-layout.tsx</file>
    <content><![CDATA['use client'
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarInset, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Home, LayoutGrid, BarChart3, Users, Swords, Trophy, Megaphone, MessageSquare, Info, Settings, LifeBuoy, Wallet, Bell, User, LogOut, Gamepad2, Circle, Phone, Mail, List, Gift, Award, ClipboardCheck } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useEffect, useState } from "react";
import MobileBottomNav from "./mobile-bottom-nav";
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDistanceToNowStrict } from 'date-fns';
import { cn } from "@/lib/utils";
import Image from 'next/image';


const Logo = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-8 h-8 text-primary"
    >
        <circle cx="12" cy="12" r="10" />
        <path d="m14.5 9.5-5 5" />
        <path d="m9.5 9.5 5 5" />
    </svg>
  );

type Notification = {
    id: string;
    title: string;
    description: string;
    createdAt: any;
    read: boolean;
    href?: string;
}

const TelegramIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
)

const NotificationBell = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if (!user) return;
        const q = query(
            collection(db, 'notifications'), 
            where('userId', '==', user.uid),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Notification));
            // Sort client-side
            notifsData.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
            setNotifications(notifsData);
            setUnreadCount(notifsData.filter(n => !n.read).length);
        });

        return () => unsubscribe();
    }, [user]);

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read) {
            await updateDoc(doc(db, 'notifications', notification.id), { read: true });
        }
        if (notification.href) {
            router.push(notification.href);
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell />
                    {isMounted && unreadCount > 0 && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                            {unreadCount}
                        </div>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length > 0 ? (
                    notifications.map(n => (
                        <DropdownMenuItem key={n.id} onClick={() => handleNotificationClick(n)} className={cn("flex items-start gap-3 cursor-pointer", !n.read && "bg-primary/10")}>
                           {!n.read && <Circle className="w-2 h-2 mt-1.5 text-primary fill-current" />}
                            <div className={cn("flex-1 space-y-1", n.read && "pl-5")}>
                                <p className="font-semibold">{n.title}</p>
                                <p className="text-xs text-muted-foreground">{n.description}</p>
                                <p className="text-xs text-muted-foreground">{n.createdAt ? formatDistanceToNowStrict(n.createdAt.toDate(), { addSuffix: true }) : ''}</p>
                            </div>
                        </DropdownMenuItem>
                    ))
                ) : (
                    <DropdownMenuItem disabled>No new notifications</DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};


export default function MainLayout({
    children,
  }: {
    children: React.ReactNode,
  }) {
    const { logout, userData, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMounted, setIsMounted] = React.useState(false);
    
    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    }

    const getInitials = () => {
        if (userData) {
            return `${userData.firstName.charAt(0)}${userData.lastName.charAt(0)}`.toUpperCase();
        }
        return '..';
    }

    const USDT_RATE = 310;
    const isMarketer = userData?.role === 'marketer';
    const hasPendingTasks = userData?.campaignInfo && userData.campaignInfo.completedTasks.length < (userData.campaignInfo as any).totalTasks;

    const sidebarItems = isMarketer ? [
        { href: '/marketing/dashboard', icon: LayoutGrid, label: 'Dashboard' },
        { href: '/marketing/dashboard/wallet', icon: Wallet, label: 'Commission Wallet' },
    ] : [
        { href: '/dashboard', icon: LayoutGrid, label: 'Dashboard' },
        { href: '/dashboard/profile', icon: User, label: 'My Profile' },
        { href: '/dashboard/my-rooms', icon: List, label: 'My Rooms' },
        { href: '/dashboard/wallet', icon: Wallet, label: 'Wallet' },
        { href: '/dashboard/bonus-center', icon: Gift, label: 'Bonus Center' },
        { href: '/dashboard/your-task', icon: ClipboardCheck, label: 'Your Tasks', condition: !!userData?.campaignInfo },
        { href: '/dashboard/friends', icon: Users, label: 'Friends & Community' },
        { href: '/dashboard/rankings', icon: Trophy, label: 'Rankings' },
        { href: '/dashboard/equipment', icon: Gamepad2, label: 'My Equipment' },
        { href: '/dashboard/referral-campaigns', icon: Award, label: 'Referral Campaigns' },
        { href: '/dashboard/chat', icon: MessageSquare, label: 'Direct Messages' },
        { href: '/about', icon: Info, label: 'About Us' },
    ];


    return (
        <Dialog>
        <SidebarProvider>
            <Sidebar>
                <SidebarHeader>
                    <div className="flex items-center gap-2">
                        <Logo />
                        <h1 className="text-xl font-bold text-primary group-data-[collapsible=icon]:hidden">Nexbattle</h1>
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarMenu>
                        {sidebarItems.filter(item => item.condition !== false).map(item => (
                             <SidebarMenuItem key={item.href}>
                                <Link href={item.href}>
                                    <SidebarMenuButton tooltip={item.label} isActive={isMounted && pathname.startsWith(item.href)}>
                                        <item.icon />
                                        <span>{item.label}</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarContent>
                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <Link href="/dashboard/settings"><SidebarMenuButton tooltip="Settings" isActive={isMounted && pathname === '/dashboard/settings'}><Settings /><span>Settings</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <DialogTrigger asChild>
                                <SidebarMenuButton tooltip="Support"><LifeBuoy /><span>Support</span></SidebarMenuButton>
                           </DialogTrigger>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Logout" onClick={handleLogout}><LogOut /><span>Logout</span></SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>
            <SidebarInset>
                <div className="absolute inset-0 z-0">
                    <Image
                        src="https://allnews.ltd/wp-content/uploads/2025/07/futuristic-video-game-controller-background-with-text-space_1017-54730.avif"
                        alt="background"
                        fill
                        className="object-cover"
                        data-ai-hint="futuristic gamepad"
                    />
                    <div className="absolute inset-0 bg-background/90" />
                </div>
                <div className="relative z-10 flex flex-col min-h-svh">
                    <header className="px-4 lg:px-6 h-16 flex items-center border-b">
                        <SidebarTrigger className="md:hidden"/>
                        <div className="ml-auto flex items-center gap-4">
                           {isMounted && (
                               <div className="flex items-center gap-2">
                                   <Link href={isMarketer ? "/marketing/dashboard/wallet" : "/dashboard/wallet"}>
                                      <Card className="bg-card/50 border-primary/20 hover:bg-primary/5 transition-colors">
                                          <CardContent className="p-2 flex items-center gap-2">
                                              <Wallet className="w-5 h-5 text-primary"/>
                                              <div>
                                              {loading || !userData ? (
                                                  <div className="space-y-1">
                                                    <Skeleton className="h-4 w-16"/>
                                                    <Skeleton className="h-3 w-12"/>
                                                  </div>
                                                  ) : (
                                                  <>
                                                      <p className="text-sm font-bold text-primary">LKR {(isMarketer ? userData.marketingBalance ?? 0 : userData.balance ?? 0).toFixed(2)}</p>
                                                      <p className="text-xs text-muted-foreground">~{((isMarketer ? userData.marketingBalance ?? 0 : userData.balance ?? 0) / USDT_RATE).toFixed(2)} USDT</p>
                                                  </>
                                              )}
                                              </div>
                                          </CardContent>
                                      </Card>
                                  </Link>
                               </div>
                           )}
                            <NotificationBell />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button>
                                         <Avatar>
                                            <AvatarImage src={userData?.photoURL} />
                                            <AvatarFallback>{loading || !isMounted ? '..' : getInitials()}</AvatarFallback>
                                        </Avatar>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>
                                        <p>{userData?.firstName} {userData?.lastName}</p>
                                        <p className="text-xs text-muted-foreground font-normal">{userData?.email}</p>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild><Link href="/dashboard/profile"><User className="mr-2"/> Profile</Link></DropdownMenuItem>
                                    <DropdownMenuItem asChild><Link href="/dashboard/settings"><Settings className="mr-2"/> Settings</Link></DropdownMenuItem>
                                    <DropdownMenuItem asChild><Link href="/dashboard/wallet"><Wallet className="mr-2"/> Wallet</Link></DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout}><LogOut className="mr-2"/> Log out</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </header>
                    <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
                        {children}
                    </main>
                    <MobileBottomNav />
                </div>
            </SidebarInset>
        </SidebarProvider>
         <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><LifeBuoy/> Contact Support</DialogTitle>
                <DialogDescription>
                    Have an issue? Reach out to us through any of the channels below.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <Button asChild className="w-full justify-start gap-3" variant="outline">
                    <a href="tel:+94704894587"><Phone /> +94 70 489 4587</a>
                </Button>
                <Button asChild className="w-full justify-start gap-3" variant="outline">
                    <a href="https://wa.me/94704894587" target="_blank" rel="noopener noreferrer"><MessageSquare/> WhatsApp</a>
                </Button>
                <Button asChild className="w-full justify-start gap-3" variant="outline">
                    <a href="https://t.me/nexbattle_help" target="_blank" rel="noopener noreferrer"><TelegramIcon/> Telegram</a>
                </Button>
                <Button asChild className="w-full justify-start gap-3" variant="outline">
                    <a href="mailto:nexbattlehelp@gmail.com"><Mail/> nexbattlehelp@gmail.com</a>
                </Button>
            </div>
        </DialogContent>
        </Dialog>
    )
  }
