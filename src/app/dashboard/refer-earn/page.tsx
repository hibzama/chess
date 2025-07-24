
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy, doc, runTransaction, increment, serverTimestamp, writeBatch, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Megaphone, Copy, Share, Users, BarChart, BadgeInfo, Info, User, Layers, ArrowRight, DollarSign, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

type Referral = {
    uid: string;
    firstName: string;
    lastName: string;
    createdAt: any;
    wins: number;
    losses: number;
    commissionEarned: number;
};

type Commission = {
    id: string;
    amount: number;
    createdAt: any;
    fromUserId: string;
    level: 1;
    fromUserName?: string;
};

const referralRanks = [
    { rank: 1, name: "Rank 1", min: 0, max: 20, l1Rate: 3 },
    { rank: 2, name: "Rank 2", min: 21, max: Infinity, l1Rate: 5 },
];

export default function ReferAndEarnPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();

    const [level1, setLevel1] = useState<Referral[]>([]);
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [loading, setLoading] = useState(true);
    const [transferAmount, setTransferAmount] = useState('');
    const [isTransferring, setIsTransferring] = useState(false);

    const referralLink = useMemo(() => {
        if (typeof window !== 'undefined' && user) {
            return `${window.location.origin}/register?ref=${user.uid}`;
        }
        return '';
    }, [user]);

    const { rank, l1Rate } = useMemo(() => {
        const l1Count = level1.length;
        const currentRank = referralRanks.find(r => l1Count >= r.min && l1Count <= r.max) || referralRanks[0];
        return {
            rank: currentRank.name,
            l1Rate: `${currentRank.l1Rate}%`,
        };
    }, [level1.length]);

    const totalCommission = useMemo(() => {
        return commissions.reduce((acc, curr) => acc + curr.amount, 0);
    }, [commissions]);


    const monthlyCommissionData = useMemo(() => {
        const months: { [key: string]: number } = {};
        commissions.forEach(c => {
            const month = format(c.createdAt.toDate(), 'MMM yyyy');
            if (!months[month]) months[month] = 0;
            months[month] += c.amount;
        });
        return Object.entries(months).map(([name, total]) => ({ name, total })).slice(-6);
    }, [commissions]);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchReferrals = async () => {
            setLoading(true);
            
            const l1Query = query(collection(db, 'users'), where('referredBy', '==', user.uid));
            const l1Docs = await getDocs(l1Query);
            const l1Data = l1Docs.docs.map(doc => ({ ...doc.data(), uid: doc.id } as Omit<Referral, 'wins'|'losses'|'commissionEarned'>));
            
            const commQuery = query(collection(db, 'transactions'), where('type', '==', 'commission'), where('userId', '==', user.uid));
            const commDocs = await getDocs(commQuery);
            const allCommissions = commDocs.docs.map(doc => ({ ...doc.data(), id: doc.id } as Commission));
            
            const addStats = (referrals: Omit<Referral, 'wins'|'losses'|'commissionEarned'>[]): Referral[] => {
                return referrals.map(ref => {
                    const commissionEarned = allCommissions
                        .filter(c => c.fromUserId === ref.uid)
                        .reduce((sum, c) => sum + c.amount, 0);
                    return { ...ref, wins: 0, losses: 0, commissionEarned };
                });
            };

            setLevel1(addStats(l1Data));
            setLoading(false);
        };
        
        fetchReferrals();

         const commQuery = query(collection(db, 'transactions'), where('type', '==', 'commission'), where('userId', '==', user.uid));
         const unsubscribe = onSnapshot(commQuery, async (snapshot) => {
             const commsDataPromises = snapshot.docs.map(async (d) => {
                const commission = {...d.data(), id: d.id} as Commission;
                const fromUserDoc = await getDoc(doc(db, 'users', commission.fromUserId));
                if(fromUserDoc.exists()){
                    const fromUserData = fromUserDoc.data();
                    commission.fromUserName = `${fromUserData.firstName} ${fromUserData.lastName}`;
                }
                return commission;
             });
             const commsData = await Promise.all(commsDataPromises);
             setCommissions(commsData);
         });

         return () => unsubscribe();
    }, [user]);
    
    const copyLink = () => {
        navigator.clipboard.writeText(referralLink);
        toast({ title: "Copied!", description: "Referral link copied to clipboard." });
    };

    const handleTransfer = async () => {
        if (!user || !transferAmount) return;
        
        const amount = parseFloat(transferAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid amount to transfer.' });
            return;
        }

        if (!userData || (userData.commissionBalance || 0) < amount) {
             toast({ variant: 'destructive', title: 'Insufficient Balance', description: 'Your commission balance is too low.' });
            return;
        }

        setIsTransferring(true);
        const userRef = doc(db, 'users', user.uid);
        const transactionRef = doc(collection(db, 'transactions'));

        try {
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw new Error("User not found");
                
                const currentCommissionBalance = userDoc.data().commissionBalance || 0;
                if (currentCommissionBalance < amount) throw new Error("Insufficient commission balance.");

                transaction.update(userRef, {
                    commissionBalance: increment(-amount),
                    balance: increment(amount),
                });
                
                transaction.set(transactionRef, {
                    userId: user.uid,
                    type: 'commission_transfer',
                    amount: amount,
                    status: 'completed',
                    description: 'Commission transferred to main wallet',
                    createdAt: serverTimestamp()
                });
            });
            
            toast({ title: 'Transfer Successful!', description: `LKR ${amount.toFixed(2)} has been added to your main wallet.` });
            setTransferAmount('');

        } catch (error: any) {
            console.error("Transfer failed:", error);
            toast({ variant: 'destructive', title: 'Transfer Failed', description: error.message || 'An unknown error occurred.' });
        } finally {
            setIsTransferring(false);
        }
    };


    return (
        <div className="space-y-8">
             <div>
                <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3"><Megaphone/> Refer & Earn</h1>
                <p className="text-muted-foreground">Grow your network and earn passive income from every game played by your referrals.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Ready to Level Up Your Earnings?</CardTitle>
                    <CardDescription>Join our official marketing team to unlock a 20-level deep referral network and higher commission rates. If you're serious about building a large community, this is the next step.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" asChild>
                        <Link href="/marketing/register">Apply to Join the Marketing Team</Link>
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Info/> How the Referral System Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <p><strong>1. Invite Players:</strong> Share your unique referral link. When a new player signs up using your link, they become your <span className="text-primary font-semibold">Level 1</span> referral.</p>
                        <p><strong>2. Earn from Level 1:</strong> You earn a commission every time your Level 1 referrals play a game. </p>
                        <p><strong>3. Rank Up for Higher Commissions:</strong> The more players you directly refer (Level 1), the higher your Referral Rank becomes, unlocking better commission rates.</p>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Referral Rank</TableHead>
                                <TableHead>Required Direct Referrals (L1)</TableHead>
                                <TableHead>Level 1 Commission</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {referralRanks.map(r => (
                                <TableRow key={r.rank}>
                                    <TableCell><Badge variant={rank === r.name ? "default" : "secondary"}>{r.name}</Badge></TableCell>
                                    <TableCell>{r.rank === 2 ? `${r.min}+` : `${r.min} - ${r.max}`}</TableCell>
                                    <TableCell className="text-green-400 font-bold">{r.l1Rate}%</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Your Rank</CardTitle></CardHeader>
                    <CardContent>{loading ? <Skeleton className="h-8 w-24"/> : <p className="text-2xl font-bold">{rank}</p>}<p className="text-xs text-muted-foreground">{l1Rate} L1 Commission</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Level 1 Referrals</CardTitle></CardHeader>
                    <CardContent>{loading ? <Skeleton className="h-8 w-12"/> : <p className="text-2xl font-bold">{level1.length}</p>}<p className="text-xs text-muted-foreground">Directly referred players</p></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Total Commission</CardTitle></CardHeader>
                    <CardContent>{loading ? <Skeleton className="h-8 w-32"/> : <p className="text-2xl font-bold">LKR {totalCommission.toFixed(2)}</p>}<p className="text-xs text-muted-foreground">Lifetime earnings from referrals</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Available for Transfer</CardTitle></CardHeader>
                    <CardContent>{!userData ? <Skeleton className="h-8 w-32"/> : <p className="text-2xl font-bold">LKR {(userData?.commissionBalance || 0).toFixed(2)}</p>}<p className="text-xs text-muted-foreground">Your withdrawable commission</p></CardContent>
                </Card>
            </div>

             <div className="grid md:grid-cols-1 lg:grid-cols-5 gap-6">
                 <Card className="lg:col-span-2">
                    <CardHeader><CardTitle>Your Referral Link</CardTitle><CardDescription>Share this link to invite new players and earn commissions.</CardDescription></CardHeader>
                    <CardContent>
                        <Input readOnly value={referralLink} className="mb-4"/>
                        <div className="flex gap-4">
                            <Button onClick={copyLink} className="w-full"><Copy/> Copy</Button>
                            <Button variant="outline" className="w-full" onClick={() => navigator.share({ url: referralLink, title: 'Join me on Nexbattle!'})}><Share/> Share</Button>
                        </div>
                    </CardContent>
                </Card>
                 <Card className="lg:col-span-3">
                    <CardHeader><CardTitle>Monthly Commission</CardTitle><CardDescription>Your commission earnings over the last 6 months.</CardDescription></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                             <RechartsBarChart data={monthlyCommissionData}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `LKR ${value}`} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--background))',
                                        borderColor: 'hsl(var(--border))'
                                    }}
                                />
                                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
             </div>

            <Card>
                <CardHeader><CardTitle>Referral &amp; Commission Management</CardTitle><CardDescription>View your network, transfer funds, and see your history.</CardDescription></CardHeader>
                <CardContent>
                     <Tabs defaultValue="transfer">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="transfer"><Wallet className="mr-2"/> Transfer to Wallet</TabsTrigger>
                            <TabsTrigger value="level1"><Layers className="mr-2"/> Referrals ({level1.length})</TabsTrigger>
                            <TabsTrigger value="history"><DollarSign className="mr-2"/> Commission History ({commissions.length})</TabsTrigger>
                        </TabsList>
                         <TabsContent value="transfer">
                           <Card>
                                <CardHeader>
                                    <CardTitle>Transfer Commission to Main Wallet</CardTitle>
                                    <CardDescription>Move your earned commission to your main wallet to use for games.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="p-4 rounded-lg bg-secondary">
                                        <p className="text-sm text-muted-foreground">Available Commission Balance</p>
                                        <p className="text-2xl font-bold">LKR {(userData?.commissionBalance || 0).toFixed(2)}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="transfer-amount">Amount to Transfer (LKR)</label>
                                        <Input 
                                            id="transfer-amount"
                                            type="number"
                                            value={transferAmount}
                                            onChange={(e) => setTransferAmount(e.target.value)}
                                            placeholder="e.g. 500"
                                            />
                                    </div>
                                </CardContent>
                                <CardFooter>
                                     <Button onClick={handleTransfer} disabled={isTransferring}>
                                        {isTransferring ? 'Transferring...' : 'Transfer Now'}
                                     </Button>
                                </CardFooter>
                           </Card>
                        </TabsContent>
                        <TabsContent value="level1">
                            <ReferralTable referrals={level1} loading={loading} />
                        </TabsContent>
                        <TabsContent value="history">
                            <CommissionTable commissions={commissions} loading={loading} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

        </div>
    );
}


const ReferralTable = ({ referrals, loading }: { referrals: Referral[], loading: boolean }) => {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead>Wins</TableHead>
                    <TableHead>Losses</TableHead>
                    <TableHead>Commission Earned</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading referrals...</TableCell></TableRow>
                ) : referrals.length > 0 ? referrals.map(ref => (
                    <TableRow key={ref.uid}>
                        <TableCell>{ref.firstName} {ref.lastName}</TableCell>
                        <TableCell>{ref.createdAt ? format(ref.createdAt.toDate(), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                        <TableCell>{ref.wins}</TableCell>
                        <TableCell>{ref.losses}</TableCell>
                        <TableCell>LKR {ref.commissionEarned.toFixed(2)}</TableCell>
                    </TableRow>
                )) : (
                     <TableRow><TableCell colSpan={5} className="h-24 text-center">No referrals in this level yet.</TableCell></TableRow>
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
                    <TableHead>From User</TableHead>
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
                        <TableCell>{comm.fromUserName || 'Unknown User'}</TableCell>
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

    
