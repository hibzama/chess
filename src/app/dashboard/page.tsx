
'use client'
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Users, Sword, DollarSign, List, Wallet, MessageSquare, BarChart3, Gift, Gamepad2, ArrowDown, ArrowUp, Trophy, Megaphone, Calendar, ArrowRight, Clock, Handshake, PercentCircle, TrendingUp, BrainCircuit } from 'lucide-react';
import { redirect } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs, onSnapshot, limit, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Award, Loader2 } from "lucide-react";
import { CampaignTask } from "@/app/admin/referral-campaigns/page";


function CampaignTaskAlert() {
    const { userData } = useAuth();
    const [campaign, setCampaign] = useState<{id: string, tasks: CampaignTask[]} | null>(null);
    const [currentTask, setCurrentTask] = useState<CampaignTask | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userData?.campaignInfo) {
            setLoading(false);
            return;
        }

        const fetchCampaign = async () => {
            const campaignDoc = await getDoc(doc(db, 'referral_campaigns', userData.campaignInfo.campaignId));
            if (campaignDoc.exists()) {
                const campaignData = campaignDoc.data() as { tasks: CampaignTask[], id: string };
                setCampaign({ ...campaignData, id: campaignDoc.id });
                
                const completedTasks = userData.campaignInfo.completedTasks || [];
                const nextTask = campaignData.tasks.find(task => !completedTasks.includes(task.id));
                setCurrentTask(nextTask || null);
            }
            setLoading(false);
        }
        fetchCampaign();
    }, [userData]);

    if (loading || !currentTask) {
        return null;
    }

    return (
        <Alert className="mb-6 border-primary bg-primary/5">
             <Award className="h-4 w-4 text-primary" />
            <AlertTitle className="font-bold text-primary">Complete Your Referral Task!</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
                <p>{currentTask.description}</p>
                <Button asChild size="sm">
                    <Link href="/dashboard/layout">Go to Task <ArrowRight className="w-4 h-4 ml-2"/></Link>
                </Button>
            </AlertDescription>
        </Alert>
    );
}

const StatCard = ({ title, value, description, icon, isLoading, isNegative = false }: { title: string, value: string | number, description?: string, icon?: React.ReactNode, isLoading: boolean, isNegative?: boolean}) => (
    <Card className="bg-card/50">
        <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <Skeleton className="h-8 w-1/2" />
            ) : (
                <p className={cn("text-3xl font-bold", isNegative ? 'text-destructive' : 'text-primary')}>{value}</p>
            )}
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </CardContent>
    </Card>
)

export default function DashboardPage() {
    const { user, userData, loading } = useAuth();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [statsLoading, setStatsLoading] = useState(true);

    const USDT_RATE = 310;
    
    useEffect(() => {
        if (!user) {
            setStatsLoading(false);
            return;
        }

        const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTransactions(userTransactions);
            setStatsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

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
    
    if (loading) {
        return (
            <div className="flex flex-col">
              <div className="mb-12">
                <Skeleton className="h-12 w-3/4 mb-2" />
                <Skeleton className="h-6 w-1/2" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28"/>)}
              </div>
            </div>
          );
    }
  
    if (!user) {
      redirect('/login');
    }

    const mainActions = [
        { title: "Practice Games", description: "Play for free against the bot", icon: Sword, href: "/practice" },
        { title: "Start Earning", description: "Play against others to win", icon: DollarSign, href: "/lobby" },
        { title: "My Rooms", description: "Check on your active games", icon: List, href: "/dashboard/my-rooms" },
        { title: "Top up Wallet", description: "Add funds to play and earn", icon: Wallet, href: "/dashboard/wallet" },
    ];
    
    const secondaryActions = [
        { title: "Friends", icon: Users, href: "/dashboard/friends" },
        { title: "Ranking", icon: BarChart3, href: "/dashboard/rankings" },
        { title: "Refer & Earn", icon: Megaphone, href: "/dashboard/refer-earn" },
        { title: "Chat", icon: MessageSquare, href: "/dashboard/chat" },
        { title: "Equipment", icon: Gamepad2, href: "/dashboard/equipment" },
        { title: "Profile", icon: User, href: "/dashboard/profile" },
    ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2">Welcome, {userData?.firstName}!</h1>
        <p className="text-muted-foreground md:text-lg">
          Your journey to becoming a grandmaster starts now. Choose your game and make your move.
        </p>
      </div>

      <CampaignTaskAlert />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Wallet Balance"
            value={`LKR ${(userData?.balance ?? 0).toFixed(2)}`}
            description={`~${((userData?.balance ?? 0) / USDT_RATE).toFixed(2)} USDT`}
            isLoading={loading}
        />
         <StatCard 
            title="Total Deposit"
            value={`LKR ${financialStats.totalDeposit.toFixed(2)}`}
            description={`~${(financialStats.totalDeposit / USDT_RATE).toFixed(2)} USDT`}
            isLoading={statsLoading}
        />
         <StatCard 
            title="Total Withdrawals"
            value={`LKR ${financialStats.totalWithdrawal.toFixed(2)}`}
            description={`~${(financialStats.totalWithdrawal / USDT_RATE).toFixed(2)} USDT`}
            isLoading={statsLoading}
        />
         <StatCard 
            title="Total Earnings"
            value={`LKR ${financialStats.totalEarning.toFixed(2)}`}
            description={`~${(financialStats.totalEarning / USDT_RATE).toFixed(2)} USDT`}
            isLoading={statsLoading}
            isNegative={financialStats.totalEarning < 0}
        />
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainActions.map((action) => (
          <Link href={action.href} key={action.title}>
            <Card className="bg-card/50 hover:border-primary transition-all cursor-pointer h-full text-left p-6 flex flex-col justify-between">
                <div>
                  <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                      <action.icon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="font-semibold text-lg">{action.title}</p>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {secondaryActions.map((action) => (
          <Link href={action.href} key={action.title}>
            <Card className="bg-card/50 hover:border-primary transition-all cursor-pointer h-full text-center items-center flex flex-col justify-center p-4">
              <div className="p-3 bg-primary/10 rounded-full w-fit mb-4">
                  <action.icon className="w-6 h-6 text-primary" />
              </div>
              <p className="font-semibold text-sm">{action.title}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
