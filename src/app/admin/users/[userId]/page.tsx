
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, where, orderBy, updateDoc, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, History, DollarSign, Users, Wallet, Layers, Trophy, Ban, Handshake, Home, MapPin, Award, CheckSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

type UserProfile = {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: 'user' | 'admin' | 'marketer';
    balance: number;
    marketingBalance?: number;
    photoURL?: string;
    friends?: string[];
    wins?: number;
    createdAt: any;
    address?: string;
    city?: string;
    country?: string;
    gender?: string;
    campaignInfo?: {
        campaignId: string;
        referrerId: string;
        completedTasks: string[];
        answers: Record<string, string>;
    }
};

type Transaction = {
    id: string;
    type: string;
    amount: number;
    status: string;
    createdAt: any;
    level?: number;
    description?: string;
};

type Game = {
    id: string;
    gameType: 'chess' | 'checkers';
    winner?: { uid: string | null, method: string, resignerId?: string | null };
    draw?: boolean;
    createdAt: any;
    createdBy: { uid: string; name: string };
    player2?: { uid: string; name: string };
    wager: number;
};

type Referral = {
    uid: string;
    firstName: string;
    lastName: string;
    createdAt: any;
    level?: number;
};

type ClaimedCampaign = {
    id: string;
    amount: number;
    claimedAt: any;
    title?: string;
    description?: string;
}

const StatCard = ({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

export default function UserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { userId } = params;
    const { toast } = useToast();

    const [user, setUser] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [games, setGames] = useState<Game[]>([]);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [commissions, setCommissions] = useState<Transaction[]>([]);
    const [claimedCampaigns, setClaimedCampaigns] = useState<ClaimedCampaign[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        const fetchData = async () => {
            setLoading(true);

            const userDoc = await getDoc(doc(db, 'users', userId as string));
            if (!userDoc.exists()) {
                router.push('/admin/users');
                return;
            }
            setUser({ ...userDoc.data(), uid: userDoc.id } as UserProfile);

            const transQuery = query(collection(db, 'transactions'), where('userId', '==', userId));
            const transSnap = await getDocs(transQuery);
            const transData = transSnap.docs.map(d => ({ ...d.data(), id: d.id } as Transaction));
            setTransactions(transData);
            setCommissions(transData.filter(t => t.type === 'commission').sort((a,b) => b.createdAt.seconds - a.createdAt.seconds));
            setClaimedCampaigns(transData.filter(t => t.type === 'bonus' && t.description?.includes('Referral Campaign')).sort((a, b) => b.createdAt.seconds - a.createdAt.seconds));

            const gamesQuery = query(collection(db, 'game_rooms'), where('players', 'array-contains', userId), where('status', '==', 'completed'));
            const gamesSnap = await getDocs(gamesQuery);
            const gamesData = gamesSnap.docs.map(d => ({ ...d.data(), id: d.id } as Game));
            setGames(gamesData.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds));

            const refQuery = user?.role === 'marketer'
                ? query(collection(db, 'users'), where('referralChain', 'array-contains', userId))
                : query(collection(db, 'users'), where('referredBy', '==', userId));
            const refSnap = await getDocs(refQuery);
            const refData = refSnap.docs.map(d => {
                const data = d.data();
                const level = user?.role === 'marketer' ? (data.referralChain?.indexOf(userId) + 1 || 0) : 1;
                return { ...data, uid: d.id, level } as Referral
            });
            setReferrals(refData.sort((a,b) => (a.level || 0) - (b.level || 0)));

            setLoading(false);
        };

        fetchData();
    }, [userId, router, user?.role]);

    const financialStats = useMemo(() => {
        let totalDeposit = 0;
        let totalWithdrawal = 0;
        let totalEarning = 0;

        transactions.forEach(tx => {
            if (tx.type === 'deposit' && tx.status === 'approved') totalDeposit += tx.amount;
            if (tx.type === 'withdrawal' && tx.status === 'approved') totalWithdrawal += tx.amount;
            if (tx.type === 'payout') totalEarning += tx.amount;
            if (tx.type === 'wager') totalEarning -= tx.amount;
        });

        return { totalDeposit, totalWithdrawal, totalEarning };
    }, [transactions]);
    
    if (loading || !user) {
        return <Skeleton className="h-[500px] w-full" />;
    }

    const getInitials = (firstName: string, lastName: string) => `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

    return (
        <div className="space-y-6">
            <Link href="/admin/users" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to All Users</span>
            </Link>

            <Card>
                <CardHeader>
                    <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={user.photoURL} />
                            <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                        </Avatar>
                        <div className="grid gap-1 flex-1">
                            <CardTitle className="text-3xl">{user.firstName} {user.lastName}</CardTitle>
                            <CardDescription className="capitalize">{user.email} | {user.phone} | {user.gender}</CardDescription>
                            <CardDescription className="flex items-center gap-2 pt-2"><Home className="w-4 h-4" /> {user.address}, {user.city}, {user.country}</CardDescription>
                        </div>
                        <Badge variant={user.role === 'marketer' ? 'secondary' : 'outline'} className="capitalize">{user.role}</Badge>
                    </div>
                </CardHeader>
            </Card>

            <Tabs defaultValue="overview">
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="games">Game History</TabsTrigger>
                    <TabsTrigger value="wallet">Wallet History</TabsTrigger>
                    <TabsTrigger value="referrals">Referrals</TabsTrigger>
                    <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                    {user.campaignInfo && <TabsTrigger value="campaign">Active Task</TabsTrigger>}
                </TabsList>
                <TabsContent value="overview">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard title="Wallet Balance" value={`LKR ${user.balance.toFixed(2)}`} icon={<Wallet />} />
                        <StatCard title="Total Deposit" value={`LKR ${financialStats.totalDeposit.toFixed(2)}`} icon={<DollarSign />} />
                        <StatCard title="Total Withdrawal" value={`LKR ${financialStats.totalWithdrawal.toFixed(2)}`} icon={<DollarSign />} />
                        <StatCard title="Net Earnings" value={`LKR ${financialStats.totalEarning.toFixed(2)}`} icon={<DollarSign />} />
                        <StatCard title="Games Played" value={games.length} icon={<History />} />
                        <StatCard title="Wins" value={user.wins || 0} icon={<Trophy />} />
                        <StatCard title="Friends" value={user.friends?.length || 0} icon={<Users />} />
                        {user.role === 'marketer' && (
                            <StatCard title="Commission Balance" value={`LKR ${(user.marketingBalance || 0).toFixed(2)}`} icon={<Wallet />} />
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="games"><GameHistoryTable games={games} userId={user.uid} /></TabsContent>
                <TabsContent value="wallet"><TransactionTable transactions={transactions.filter(t => t.type === 'deposit' || t.type === 'withdrawal')} /></TabsContent>
                <TabsContent value="referrals">
                    <ReferralTab user={user} referrals={referrals} commissions={commissions} />
                </TabsContent>
                <TabsContent value="campaigns">
                    <Card>
                        <CardHeader><CardTitle>Claimed Campaign Bonuses</CardTitle></CardHeader>
                        <CardContent><ClaimedCampaignsTable campaigns={claimedCampaigns} /></CardContent>
                    </Card>
                </TabsContent>
                {user.campaignInfo && (
                    <TabsContent value="campaign">
                        <CampaignInfoTab campaignInfo={user.campaignInfo} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}

const ReferralTab = ({ user, referrals, commissions }: { user: UserProfile, referrals: Referral[], commissions: Transaction[] }) => {
    if (user.role === 'marketer') {
        return (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Card>
                    <CardHeader><CardTitle>Referral Network ({referrals.length})</CardTitle></CardHeader>
                    <CardContent><ReferralTable referrals={referrals} showLevel /></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Commission History</CardTitle></CardHeader>
                    <CardContent><TransactionTable transactions={commissions} /></CardContent>
                </Card>
            </div>
        )
    }
    return (
        <Card>
            <CardHeader><CardTitle>Level 1 Referrals ({referrals.length})</CardTitle></CardHeader>
            <CardContent><ReferralTable referrals={referrals} /></CardContent>
        </Card>
    );
};

const CampaignInfoTab = ({ campaignInfo }: { campaignInfo: UserProfile['campaignInfo'] }) => {
    const [campaignDetails, setCampaignDetails] = useState<any | null>(null);
    const [referrer, setReferrer] = useState<{firstName: string, lastName: string} | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!campaignInfo) return;
            const campaignDoc = await getDoc(doc(db, 'referral_campaigns', campaignInfo.campaignId));
            if (campaignDoc.exists()) {
                setCampaignDetails(campaignDoc.data());
            }
            const referrerDoc = await getDoc(doc(db, 'users', campaignInfo.referrerId));
            if(referrerDoc.exists()) {
                setReferrer(referrerDoc.data() as any);
            }
            setLoading(false);
        }
        fetchDetails();
    }, [campaignInfo]);

    if (loading) {
        return <Skeleton className="h-64 w-full" />
    }

    if (!campaignInfo || !campaignDetails) {
        return <p>No active campaign found for this user.</p>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Award /> Referral Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <p className="text-sm text-muted-foreground">Campaign Name</p>
                    <p className="font-semibold">{campaignDetails.title}</p>
                </div>
                 <div>
                    <p className="text-sm text-muted-foreground">Referred By</p>
                    <p className="font-semibold text-primary">{referrer ? `${referrer.firstName} ${referrer.lastName}` : 'Unknown'}</p>
                </div>
                <div>
                    <h4 className="font-semibold mb-2">Task Progress</h4>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Task</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Submitted Answer</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {campaignDetails.tasks.map((task: any) => (
                                <TableRow key={task.id}>
                                    <TableCell>{task.description}</TableCell>
                                    <TableCell>
                                        {campaignInfo.completedTasks.includes(task.id) 
                                            ? <Badge className="bg-green-500/20 text-green-400">Completed</Badge>
                                            : <Badge variant="secondary">Pending</Badge>
                                        }
                                    </TableCell>
                                    <TableCell>{campaignInfo.answers?.[task.id] || 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}

const GameHistoryTable = ({ games, userId }: { games: Game[], userId: string }) => {
    
    const getResultAndReturn = (game: Game) => {
        let result = 'Loss';
        let netReturn = -game.wager;
        let method = game.winner?.method ? game.winner.method.replace('-', ' ') : 'gameplay';

        if (game.draw) {
            result = 'Draw';
            netReturn = game.wager * -0.1;
        } else if (game.winner?.uid === userId) {
            result = 'Win';
            if (game.winner?.resignerId) {
                netReturn = game.wager * 0.05; // Win by resignation
            } else {
                netReturn = game.wager * 0.8; // Standard win
            }
        } else if (game.winner?.resignerId === userId) {
            result = 'Loss'; // Explicitly a loss
            netReturn = game.wager * -0.25; // Resignation loss
            method = 'resignation';
        }

        return { result, netReturn, method };
    }
    
    return (
    <Table>
        <TableHeader><TableRow><TableHead>Game</TableHead><TableHead>Opponent</TableHead><TableHead>Result</TableHead><TableHead>Return (LKR)</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
        <TableBody>
            {games.length > 0 ? games.map(game => {
                const opponent = game.createdBy.uid === userId ? game.player2 : game.createdBy;
                const { result, netReturn, method } = getResultAndReturn(game);
                return(
                <TableRow key={game.id}>
                    <TableCell className="capitalize">{game.gameType}</TableCell>
                    <TableCell>{opponent?.name || 'N/A'}</TableCell>
                    <TableCell>
                        <Badge variant={result === 'Win' ? 'default' : result === 'Draw' ? 'secondary' : 'destructive'}>
                            {result === 'Win' && <Trophy className="w-3 h-3 mr-1" />}
                            {result === 'Loss' && <Ban className="w-3 h-3 mr-1" />}
                            {result === 'Draw' && <Handshake className="w-3 h-3 mr-1" />}
                            {result}
                        </Badge>
                         <p className="text-xs text-muted-foreground capitalize mt-1">{method}</p>
                    </TableCell>
                    <TableCell className={cn("font-semibold", netReturn > 0 ? "text-green-400" : "text-red-400")}>
                        {netReturn >= 0 ? `+${netReturn.toFixed(2)}` : netReturn.toFixed(2)}
                    </TableCell>
                    <TableCell>{game.createdAt ? format(game.createdAt.toDate(), 'PPp') : 'N/A'}</TableCell>
                </TableRow>
            )}) : <TableRow><TableCell colSpan={5} className="text-center">No games played</TableCell></TableRow>}
        </TableBody>
    </Table>
)
}

const TransactionTable = ({ transactions }: { transactions: Transaction[] }) => (
    <Table>
        <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead>Status/Level</TableHead></TableRow></TableHeader>
        <TableBody>
            {transactions.length > 0 ? transactions.map(tx => (
                <TableRow key={tx.id}>
                    <TableCell className="capitalize">{tx.description || tx.type.replace('_', ' ')}</TableCell>
                    <TableCell>LKR {tx.amount.toFixed(2)}</TableCell>
                    <TableCell>{tx.createdAt ? format(tx.createdAt.toDate(), 'PPp') : 'N/A'}</TableCell>
                    <TableCell>
                        {tx.type === 'commission' && tx.level ? <Badge variant="outline">Level {tx.level}</Badge> : <Badge variant="secondary" className="capitalize">{tx.status}</Badge>}
                    </TableCell>
                </TableRow>
            )) : <TableRow><TableCell colSpan={4} className="text-center">No transactions found</TableCell></TableRow>}
        </TableBody>
    </Table>
)

const ReferralTable = ({ referrals, showLevel }: { referrals: Referral[], showLevel?: boolean }) => (
    <Table>
        <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Joined Date</TableHead>{showLevel && <TableHead>Level</TableHead>}</TableRow></TableHeader>
        <TableBody>
            {referrals.length > 0 ? referrals.map(ref => (
                <TableRow key={ref.uid}>
                    <TableCell>{ref.firstName} {ref.lastName}</TableCell>
                    <TableCell>{ref.createdAt ? format(ref.createdAt.toDate(), 'PPp') : 'N/A'}</TableCell>
                    {showLevel && <TableCell>{ref.level}</TableCell>}
                </TableRow>
            )) : <TableRow><TableCell colSpan={showLevel ? 3 : 2} className="text-center">No referrals found</TableCell></TableRow>}
        </TableBody>
    </Table>
)

const ClaimedCampaignsTable = ({ campaigns }: { campaigns: ClaimedCampaign[] }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Bonus</TableHead>
                <TableHead>Date Claimed</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {campaigns.length > 0 ? campaigns.map(c => (
                <TableRow key={c.id}>
                    <TableCell>{c.description || "Referral Campaign"}</TableCell>
                    <TableCell className="text-green-400 font-semibold">LKR {c.amount.toFixed(2)}</TableCell>
                    <TableCell>{c.createdAt ? format(c.createdAt.toDate(), 'PPp') : 'N/A'}</TableCell>
                </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">No campaign bonuses claimed.</TableCell>
                </TableRow>
            )}
        </TableBody>
    </Table>
);
