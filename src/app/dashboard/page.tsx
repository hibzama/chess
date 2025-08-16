
'use client'
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Users, Sword, DollarSign, List, Wallet, MessageSquare, BarChart3, Gamepad2, ArrowRight, Clock, Handshake, PercentCircle, TrendingUp, BrainCircuit, User, Gift, Award, Calendar, Banknote, Megaphone, ClipboardCheck } from 'lucide-react';
import { redirect } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs, onSnapshot, limit, doc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DailyBonusCampaign } from '@/app/admin/bonus/daily-bonus/page';
import { Campaign, CampaignTask } from '@/app/admin/referral-campaigns/page';
import { DepositBonusCampaign } from '@/app/admin/bonus/deposit-bonus/page';

// #region Bonus Components
const BonusCardShell = ({ title, description, icon, href, linkText, reward }: {title: string, description: string, icon: React.ReactNode, href: string, linkText: string, reward?: string}) => (
    <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20 flex flex-col">
        <CardHeader className="flex-grow">
            <CardTitle className="flex items-center gap-2 text-lg">{icon} {title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
            {reward && <div className="mb-4 text-center p-2 bg-yellow-400/10 border border-yellow-400/20 rounded-md text-yellow-300 font-bold text-sm">{reward}</div>}
            <Button variant="outline" asChild className="w-full">
                <Link href={href}>{linkText}</Link>
            </Button>
        </CardContent>
    </Card>
)

const BonusHub = ({ depositBonus, dailyBonus, referralTask }: { depositBonus: DepositBonusCampaign | null, dailyBonus: DailyBonusCampaign | null, referralTask: {task: CampaignTask, campaign: Campaign} | null }) => {
    const activeBonuses = [depositBonus, dailyBonus, referralTask].filter(Boolean);
    
    if (activeBonuses.length === 0) {
        return (
             <Card className="bg-card/50 border-dashed">
                <CardContent className="p-6 text-center text-muted-foreground">
                    No special bonuses available for you right now. Check back soon!
                </CardContent>
            </Card>
        );
    }
    
    const gridColsClass = useMemo(() => {
        switch (activeBonuses.length) {
            case 1: return "md:grid-cols-1";
            case 2: return "md:grid-cols-2";
            case 3: return "md:grid-cols-3";
            default: return "";
        }
    }, [activeBonuses.length]);

    return (
        <div className={cn("grid grid-cols-1 gap-4", gridColsClass)}>
            {depositBonus && (
                <BonusCardShell 
                    title={depositBonus.title || "Deposit Bonus"}
                    description={`Get a ${depositBonus.percentage}% bonus on deposits from LKR ${depositBonus.minDeposit} to LKR ${depositBonus.maxDeposit}!`}
                    icon={<Banknote className="text-green-400"/>}
                    href="/dashboard/wallet"
                    linkText="Make a Deposit"
                />
            )}
            {dailyBonus && (
                <BonusCardShell 
                    title={dailyBonus.title || "Daily Bonus"}
                    description="A special bonus is available for you to claim today!"
                    icon={<Calendar className="text-blue-400"/>}
                    href="/dashboard/bonus-center"
                    linkText="Claim Now"
                />
            )}
            {referralTask && (
                 <BonusCardShell 
                    title="Your Next Task" 
                    description={referralTask.task.description}
                    icon={<ClipboardCheck className="text-yellow-400"/>}
                    href="/dashboard/your-task"
                    linkText="Complete Task"
                    reward={`Reward: LKR ${referralTask.task.refereeBonus.toFixed(2)}`}
                />
            )}
        </div>
    );
};
// #endregion


const StatCard = ({ title, value, description, isLoading, colorClass }: { title: string, value: string | number, description?: string, isLoading: boolean, colorClass?: string}) => (
    <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <Skeleton className="h-8 w-1/2" />
            ) : (
                <p className={cn("text-3xl font-bold", colorClass)}>{value}</p>
            )}
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </CardContent>
    </Card>
)

export default function DashboardPage() {
    const { user, userData, loading } = useAuth();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [statsLoading, setStatsLoading] = useState(true);
    
    // State for all available bonuses
    const [depositBonus, setDepositBonus] = useState<DepositBonusCampaign | null>(null);
    const [dailyBonus, setDailyBonus] = useState<DailyBonusCampaign | null>(null);
    const [referralTask, setReferralTask] = useState<{task: CampaignTask, campaign: Campaign} | null>(null);
    const [checkingBonuses, setCheckingBonuses] = useState(true);

    const USDT_RATE = 310;
    
    useEffect(() => {
        if (!user || !userData) {
            setStatsLoading(false);
            setCheckingBonuses(false);
            return;
        }

        // Fetch Transactions
        const transQuery = query(collection(db, 'transactions'), where('userId', '==', user.uid));
        const unsubscribeTrans = onSnapshot(transQuery, (snapshot) => {
            const userTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTransactions(userTransactions);
            setStatsLoading(false);
        });

        // --- Fetch all bonuses ---
        const fetchBonuses = async () => {
            const now = new Date();
            
            // 1. Deposit Bonus - Simplified Query
            const depositQuery = query(collection(db, 'deposit_bonus_campaigns'), where('isActive', '==', true), limit(1));
            const depositSnapshot = await getDocs(depositQuery);
            if (!depositSnapshot.empty) {
                const campaign = depositSnapshot.docs[0].data() as DepositBonusCampaign;
                // Filter by expiration date in code
                if (campaign.expiresAt && campaign.expiresAt.toDate() > now) {
                    setDepositBonus(campaign);
                }
            }

            // 2. Daily Bonus
            const dailyQuery = query(collection(db, 'daily_bonus_campaigns'), where('isActive', '==', true));
            const dailySnapshot = await getDocs(dailyQuery);
            if (!dailySnapshot.empty) {
                const activeCampaigns = dailySnapshot.docs.map(d => d.data() as DailyBonusCampaign);
                const eligibleNow = activeCampaigns.find(c => c.endDate.toDate() > now && c.startDate.toDate() < now);

                if(eligibleNow) {
                    const claimSnap = await getDoc(doc(db, `users/${user.uid}/daily_bonus_claims`, dailySnapshot.docs[0].id));
                    if (!claimSnap.exists()) {
                        setDailyBonus(eligibleNow);
                    }
                }
            }
            
            // 3. Referral Task
            if (userData.campaignInfo) {
                const campaignDoc = await getDoc(doc(db, 'referral_campaigns', userData.campaignInfo.campaignId));
                if (campaignDoc.exists()) {
                    const campaignData = campaignDoc.data() as Campaign;
                    const completedTaskIds = new Set(userData.campaignInfo.completedTasks || []);
                    const nextTask = campaignData.tasks.find(t => !completedTaskIds.has(t.id));
                    if (nextTask) {
                        setReferralTask({ task: nextTask, campaign: campaignData });
                    }
                }
            }
            
            setCheckingBonuses(false);
        };
        
        fetchBonuses();

        return () => {
            unsubscribeTrans();
        };
    }, [user, userData]);

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

       {/* Bonus Hub Section */}
        <div className="space-y-4">
            {checkingBonuses ? (
                <Skeleton className="h-44 w-full" />
            ) : (
                <BonusHub depositBonus={depositBonus} dailyBonus={dailyBonus} referralTask={referralTask} />
            )}
        </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Wallet Balance"
            value={`LKR ${(userData?.balance ?? 0).toFixed(2)}`}
            description={`~${((userData?.balance ?? 0) / USDT_RATE).toFixed(2)} USDT`}
            isLoading={loading}
            colorClass="text-primary"
        />
         <StatCard 
            title="Total Deposit"
            value={`LKR ${financialStats.totalDeposit.toFixed(2)}`}
            description="All funds you've added."
            isLoading={statsLoading}
            colorClass="text-green-400"
        />
         <StatCard 
            title="Total Withdrawals"
            value={`LKR ${financialStats.totalWithdrawal.toFixed(2)}`}
            description="All funds you've taken out."
            isLoading={statsLoading}
            colorClass="text-red-400"
        />
         <StatCard 
            title="Total Earnings"
            value={`LKR ${financialStats.totalEarning.toFixed(2)}`}
            description="Your net profit from games."
            isLoading={statsLoading}
            colorClass={financialStats.totalEarning < 0 ? "text-yellow-400" : "text-green-400"}
        />
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainActions.map((action) => (
          <Link href={action.href} key={action.title}>
            <Card className="bg-card/80 hover:border-primary transition-all cursor-pointer h-full text-left p-6 flex flex-col justify-between backdrop-blur-sm">
                <div>
                  <div className="w-fit mb-4">
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
            <Card className="bg-card/80 hover:border-primary transition-all cursor-pointer h-full text-center items-center flex flex-col justify-center p-4 backdrop-blur-sm">
              <div className="w-fit mb-4">
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
