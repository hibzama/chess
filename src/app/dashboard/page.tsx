
'use client'
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Users, Sword, DollarSign, List, Wallet, MessageSquare, BarChart3, Gift, Gamepad2, ArrowDown, ArrowUp, Trophy, Megaphone } from 'lucide-react';
import { redirect } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
    const { user, userData, loading } = useAuth();
    const [stats, setStats] = useState({
        totalDeposit: 0,
        totalWithdrawal: 0,
        totalEarning: 0,
    });
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            const fetchStats = async () => {
                setStatsLoading(true);
                const q = query(collection(db, "transactions"), where("userId", "==", user.uid));
                const querySnapshot = await getDocs(q);
                let deposit = 0;
                let withdrawal = 0;
                let earning = 0;

                querySnapshot.forEach((doc) => {
                    const transaction = doc.data();
                    if (transaction.type === 'deposit' && transaction.status === 'approved') {
                        deposit += transaction.amount;
                    }
                    if (transaction.type === 'withdrawal' && transaction.status === 'approved') {
                        withdrawal += transaction.amount;
                    }
                    if (transaction.type === 'payout') {
                        earning += transaction.amount;
                    }
                    if (transaction.type === 'wager') {
                        earning -= transaction.amount;
                    }
                });

                setStats({
                    totalDeposit: deposit,
                    totalWithdrawal: withdrawal,
                    totalEarning: earning
                });
                setStatsLoading(false);
            };
            fetchStats();
        }
    }, [user]);

    if (loading) {
        return (
            <div className="flex flex-col">
              <div className="mb-12">
                <Skeleton className="h-12 w-3/4 mb-2" />
                <Skeleton className="h-6 w-1/2" />
              </div>
        
              <div className="grid gap-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <Card key={i}>
                        <CardHeader>
                            <Skeleton className="w-8 h-8 rounded-full mb-2" />
                            <Skeleton className="h-6 w-3/4 mb-1" />
                            <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        </Card>
                    ))}
                </div>
                <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
                  {[...Array(6)].map((_, i) => (
                     <Card key={i}>
                      <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
                        <Skeleton className="w-7 h-7 rounded-full" />
                        <Skeleton className="h-5 w-16" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          );
    }
  
    if (!user) {
      redirect('/login');
    }
    
    const summaryCards = [
        { title: "Wallet Balance", value: userData?.balance, description: "Your current available funds.", colorClass: "text-primary" },
        { title: "Total Deposit", value: stats.totalDeposit, description: "All funds you've added.", colorClass: "text-green-500" },
        { title: "Total Withdrawals", value: stats.totalWithdrawal, description: "All funds you've taken out.", colorClass: "text-red-500" },
        { title: "Total Earnings", value: stats.totalEarning, description: "Your net profit from games.", colorClass: "text-yellow-500" },
    ];

  const mainActions = [
    { title: "Practice Games", description: "Play for free against the bot", icon: Sword, href: "/practice" },
    { title: "Start Earning", description: "Play against others to win", icon: DollarSign, href: "/lobby" },
    { title: "My Rooms", description: "Check on your active games", icon: List, href: "/dashboard/my-rooms" },
    { title: "Top up Wallet", description: "Add funds to play and earn", icon: Wallet, href: "/dashboard/wallet" },
  ];

  return (
    <div className="flex flex-col">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2">Welcome to the Arena</h1>
        <p className="text-muted-foreground md:text-lg">
          Your journey to becoming a grandmaster starts now. Choose your game and make your move.
        </p>
      </div>

      <div className="grid gap-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {summaryCards.map((card) => (
                <Card key={card.title} className="bg-card/50">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                         {statsLoading ? (
                            <Skeleton className="h-8 w-3/4" />
                        ) : (
                            <div className={cn("text-3xl font-bold", card.colorClass)}>LKR {card.value?.toFixed(2) ?? '0.00'}</div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                    </CardContent>
                </Card>
            ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {mainActions.map((action) => (
            <Link href={action.href} key={action.title}>
                <Card className="bg-card/50 hover:bg-primary/5 transition-all cursor-pointer h-full">
                <CardHeader>
                    <div className="p-3 bg-primary/10 rounded-full w-fit mb-4">
                        <action.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                </CardHeader>
                </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
