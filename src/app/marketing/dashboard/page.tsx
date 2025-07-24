
'use client'
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from "@/context/auth-context";
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Share, Users, Wallet, Percent, Layers, ShieldCheck, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

type Referral = {
    uid: string;
    firstName: string;
    lastName: string;
    createdAt: any;
};

type Commission = {
    id: string;
    amount: number;
    createdAt: any;
    fromUserId: string;
    level: number;
};

const USDT_RATE = 310;

export default function MarketingDashboardPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();

    const [level1, setLevel1] = useState<Referral[]>([]);
    const [totalReferrals, setTotalReferrals] = useState(0);
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [loading, setLoading] = useState(true);

    const marketingLink = useMemo(() => {
        if (typeof window !== 'undefined' && user) {
            return `${window.location.origin}/register?mref=${user.uid}`;
        }
        return '';
    }, [user]);

    const totalCommission = useMemo(() => {
        return commissions.reduce((acc, curr) => acc + curr.amount, 0);
    }, [commissions]);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchReferrals = async () => {
            setLoading(true);

            // Fetch L1
            const l1Query = query(collection(db, 'users'), where('mref', '==', user.uid), where('referralChain', 'array-contains', user.uid));
            const l1Docs = await getDocs(l1Query);
            const l1Data = l1Docs.docs.map(doc => ({ ...doc.data(), uid: doc.id } as Referral));
            setLevel1(l1Data);
            
            // Fetch All Referrals in Chain
            const allReferralsQuery = query(collection(db, 'users'), where('referralChain', 'array-contains', user.uid));
            const allReferralsDocs = await getDocs(allReferralsQuery);
            setTotalReferrals(allReferralsDocs.size);
            
            setLoading(false);
        };
        
        fetchReferrals();

         // Subscribe to commissions for real-time total updates
         const commQuery = query(collection(db, 'transactions'), where('type', '==', 'commission'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
         const unsubscribe = onSnapshot(commQuery, async (snapshot) => {
             const commsData = snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as Commission));
             setCommissions(commsData);
         });

         return () => unsubscribe();

    }, [user]);
    
    const copyLink = () => {
        navigator.clipboard.writeText(marketingLink);
        toast({ title: "Copied!", description: "Referral link copied to clipboard." });
    };

    const statsCards = [
        { title: "Your Commission", value: "3%", description: "on 20 levels of referrals", icon: Percent, loading: false },
        { title: "Level 1 Referrals", value: level1.length, description: "Directly referred players", icon: Users, loading },
        { title: "Total Referrals (All Levels)", value: totalReferrals, description: "Across all 20 levels", icon: Layers, loading },
        { title: "Available Commission", value: `LKR ${userData?.marketingBalance?.toFixed(2) ?? '0.00'}`, description: "Lifetime earnings from your network", icon: DollarSign, loading: loading || !userData},
    ]

    return (
        <div className="space-y-8">
             <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Marketing Dashboard</h1>
                <p className="text-muted-foreground">Welcome, {userData?.firstName}. Here is your performance overview.</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsCards.map(card => (
                    <Card key={card.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                            <card.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {card.loading ? <Skeleton className="h-8 w-3/4"/> : <div className="text-2xl font-bold">{card.value}</div>}
                            <p className="text-xs text-muted-foreground">{card.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
            
             <Card>
                <CardHeader><CardTitle>Your Marketing Link</CardTitle><CardDescription>Share this link to grow your network.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    <Input readOnly value={marketingLink} className="bg-background"/>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button onClick={copyLink}><Copy/> Copy</Button>
                        <Button variant="outline" onClick={() => navigator.share({ url: marketingLink, title: 'Join me on Nexbattle!'})}><Share/> Share</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Referral & Commission Details</CardTitle>
                    <CardDescription>View your direct referrals and manage your earnings.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Tabs defaultValue="level1">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="level1"><Layers className="mr-2"/> Level 1 ({level1.length})</TabsTrigger>
                            <TabsTrigger value="withdrawals"><Wallet className="mr-2"/> Withdrawals</TabsTrigger>
                            <TabsTrigger value="history"><DollarSign className="mr-2"/> Commission History ({commissions.length})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="level1">
                            <ReferralTable referrals={level1} loading={loading} />
                        </TabsContent>
                         <TabsContent value="withdrawals">
                            <div className="p-4 text-center">
                                <p className="mb-4">Manage your earnings from your dedicated wallet.</p>
                                <Button asChild>
                                    <Link href="/marketing/dashboard/wallet">Go to Commission Wallet</Link>
                                </Button>
                            </div>
                        </TabsContent>
                        <TabsContent value="history">
                            <CommissionTable commissions={commissions} loading={loading} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

        </div>
    )
}


const ReferralTable = ({ referrals, loading }: { referrals: Referral[], loading: boolean }) => {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    <TableRow><TableCell colSpan={3} className="h-24 text-center">Loading referrals...</TableCell></TableRow>
                ) : referrals.length > 0 ? referrals.map(ref => (
                    <TableRow key={ref.uid}>
                        <TableCell>{ref.firstName} {ref.lastName}</TableCell>
                        <TableCell>{ref.createdAt ? format(ref.createdAt.toDate(), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                        <TableCell><Badge>Active</Badge></TableCell>
                    </TableRow>
                )) : (
                     <TableRow><TableCell colSpan={3} className="h-24 text-center">No referrals in this level yet.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
    )
}

const CommissionTable = ({ commissions, loading }: { commissions: Commission[], loading: boolean }) => {
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Amount</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                 {loading ? (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center">Loading commissions...</TableCell></TableRow>
                ) : commissions.length > 0 ? commissions.map(comm => (
                    <TableRow key={comm.id}>
                        <TableCell>{comm.createdAt ? format(comm.createdAt.toDate(), 'PPp') : 'N/A'}</TableCell>
                        <TableCell>Commission</TableCell>
                        <TableCell><Badge variant="secondary">Level {comm.level}</Badge></TableCell>
                        <TableCell className="text-green-400">LKR {comm.amount.toFixed(2)}</TableCell>
                    </TableRow>
                )) : (
                     <TableRow><TableCell colSpan={4} className="h-24 text-center">No commission history yet.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
    )
}

    