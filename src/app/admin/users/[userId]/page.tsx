
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, History, DollarSign, Users, Wallet, Layers, Trophy, Ban, Handshake } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

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
    winner?: { uid: string | null };
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

    const [user, setUser] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [games, setGames] = useState<Game[]>([]);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [commissions, setCommissions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        const fetchData = async () => {
            setLoading(true);

            // Fetch User
            const userDoc = await getDoc(doc(db, 'users', userId as string));
            if (!userDoc.exists()) {
                router.push('/admin/users');
                return;
            }
            const userData = { ...userDoc.data(), uid: userDoc.id } as UserProfile;
            setUser(userData);

            // Fetch Transactions
            const transQuery = query(collection(db, 'transactions'), where('userId', '==', userId));
            const transSnap = await getDocs(transQuery);
            const transData = transSnap.docs.map(d => ({ ...d.data(), id: d.id } as Transaction));
            setTransactions(transData);
            setCommissions(transData.filter(t => t.type === 'commission').sort((a,b) => b.createdAt.seconds - a.createdAt.seconds));

            // Fetch Games
            const gamesQuery = query(collection(db, 'game_rooms'), where('players', 'array-contains', userId), where('status', '==', 'completed'));
            const gamesSnap = await getDocs(gamesQuery);
            const gamesData = gamesSnap.docs.map(d => ({ ...d.data(), id: d.id } as Game));
            setGames(gamesData.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds));

            // Fetch Referrals
            const refQuery = userData.role === 'marketer'
                ? query(collection(db, 'users'), where('referralChain', 'array-contains', userId))
                : query(collection(db, 'users'), where('referredBy', '==', userId));
            const refSnap = await getDocs(refQuery);
            const refData = refSnap.docs.map(d => {
                const data = d.data();
                const level = userData.role === 'marketer' ? (data.referralChain?.indexOf(userId) + 1 || 0) : 1;
                return { ...data, uid: d.id, level } as Referral
            });
            setReferrals(refData.sort((a,b) => (a.level || 0) - (b.level || 0)));

            setLoading(false);
        };

        fetchData();
    }, [userId, router]);

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
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={user.photoURL} />
                            <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-3xl">{user.firstName} {user.lastName}</CardTitle>
                            <CardDescription>{user.email} | {user.phone}</CardDescription>
                            <Badge variant={user.role === 'marketer' ? 'secondary' : 'outline'} className="mt-2 capitalize">{user.role}</Badge>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {user.role === 'user' && (
                 <Tabs defaultValue="overview">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="games">Game History</TabsTrigger>
                        <TabsTrigger value="wallet">Wallet History</TabsTrigger>
                        <TabsTrigger value="referrals">Referrals</TabsTrigger>
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
                        </div>
                    </TabsContent>
                    <TabsContent value="games"><GameHistoryTable games={games} userId={user.uid} /></TabsContent>
                    <TabsContent value="wallet"><TransactionTable transactions={transactions.filter(t => t.type === 'deposit' || t.type === 'withdrawal')} /></TabsContent>
                    <TabsContent value="referrals">
                        <Card>
                            <CardHeader><CardTitle>Level 1 Referrals ({referrals.length})</CardTitle></CardHeader>
                            <CardContent><ReferralTable referrals={referrals} /></CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}

             {user.role === 'marketer' && (
                 <Tabs defaultValue="overview">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="referrals">Referral Network</TabsTrigger>
                        <TabsTrigger value="commissions">Commissions</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview">
                         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <StatCard title="Commission Balance" value={`LKR ${(user.marketingBalance || 0).toFixed(2)}`} icon={<Wallet />} />
                            <StatCard title="Total Referrals" value={referrals.length} icon={<Users />} />
                             <StatCard title="Total Commissions" value={`LKR ${commissions.reduce((acc, t) => acc + t.amount, 0).toFixed(2)}`} icon={<DollarSign />} />
                        </div>
                    </TabsContent>
                     <TabsContent value="referrals">
                         <Card>
                            <CardHeader><CardTitle>Referral Network ({referrals.length})</CardTitle></CardHeader>
                            <CardContent><ReferralTable referrals={referrals} showLevel /></CardContent>
                        </Card>
                     </TabsContent>
                    <TabsContent value="commissions">
                        <Card>
                            <CardHeader><CardTitle>Commission History</CardTitle></CardHeader>
                            <CardContent><TransactionTable transactions={commissions} /></CardContent>
                        </Card>
                    </TabsContent>
                 </Tabs>
            )}
        </div>
    );
}

const GameHistoryTable = ({ games, userId }: { games: Game[], userId: string }) => (
    <Table>
        <TableHeader><TableRow><TableHead>Game</TableHead><TableHead>Opponent</TableHead><TableHead>Result</TableHead><TableHead>Wager</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
        <TableBody>
            {games.length > 0 ? games.map(game => {
                const opponent = game.createdBy.uid === userId ? game.player2 : game.createdBy;
                let result = 'Loss';
                if (game.draw) result = 'Draw';
                else if (game.winner?.uid === userId) result = 'Win';
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
                    </TableCell>
                    <TableCell>LKR {game.wager.toFixed(2)}</TableCell>
                    <TableCell>{game.createdAt ? format(game.createdAt.toDate(), 'PPp') : 'N/A'}</TableCell>
                </TableRow>
            )}) : <TableRow><TableCell colSpan={5} className="text-center">No games played</TableCell></TableRow>}
        </TableBody>
    </Table>
)

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
