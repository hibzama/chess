
'use client'
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Users, Sword, DollarSign, List, Wallet, MessageSquare, BarChart3, Gift, Gamepad2, ArrowDown, ArrowUp, Trophy, Megaphone, Calendar, ArrowRight, Clock, Handshake } from 'lucide-react';
import { redirect } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useRef } from 'react';
import { collection, query, where, getDocs, onSnapshot, limit, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import BonusDisplay, { type DepositBonus } from './bonus-display';
import EventDisplay from './event-display';
import DailyBonusDisplay from './daily-bonus-display';
import type { Event } from './events/page';


export default function DashboardPage() {
    const { user, userData, loading } = useAuth();
    const [stats, setStats] = useState({
        totalDeposit: 0,
        totalWithdrawal: 0,
        totalEarning: 0,
    });
    const [statsLoading, setStatsLoading] = useState(true);

    const [depositBonus, setDepositBonus] = useState<DepositBonus | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [hasDailyBonus, setHasDailyBonus] = useState(false);
    const [promotionsLoading, setPromotionsLoading] = useState(true);

    const USDT_RATE = 310;

    useEffect(() => {
        if (user) {
            setStatsLoading(true);

            const fetchStats = async () => {
                const q = query(collection(db, "transactions"), where("userId", "==", user.uid));
                const querySnapshot = await getDocs(q);
                let deposit = 0, withdrawal = 0, earning = 0;
                querySnapshot.forEach((doc) => {
                    const t = doc.data();
                    if (t.type === 'deposit' && t.status === 'approved') deposit += t.amount;
                    if (t.type === 'withdrawal' && t.status === 'approved') withdrawal += t.amount;
                    if (t.type === 'payout') earning += t.amount;
                    if (t.type === 'wager') earning -= t.amount;
                });
                setStats({ totalDeposit: deposit, totalWithdrawal: withdrawal, totalEarning: earning });
                setStatsLoading(false);
            };
            fetchStats();
            
        }
    }, [user]);

    useEffect(() => {
        let bonusLoaded = false;
        let eventsLoaded = false;
        let dailyBonusLoaded = false;

        const checkLoading = () => {
            if (bonusLoaded && eventsLoaded && dailyBonusLoaded) {
                setPromotionsLoading(false);
            }
        };

        const bonusRef = doc(db, 'settings', 'depositBonus');
        const bonusUnsub = onSnapshot(bonusRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().isActive) {
                setDepositBonus(docSnap.data() as DepositBonus);
            } else {
                setDepositBonus(null);
            }
            bonusLoaded = true;
            checkLoading();
        });

        const eventsQuery = query(collection(db, 'events'), where('isActive', '==', true), limit(1));
        const eventsUnsub = onSnapshot(eventsQuery, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Event));
            setEvents(eventsData);
            eventsLoaded = true;
            checkLoading();
        });

        const dailyBonusQuery = query(collection(db, 'bonuses'), where('isActive', '==', true), limit(1));
        const dailyBonusUnsub = onSnapshot(dailyBonusQuery, (snapshot) => {
            setHasDailyBonus(!snapshot.empty);
            dailyBonusLoaded = true;
            checkLoading();
        });

        return () => {
            bonusUnsub();
            eventsUnsub();
            dailyBonusUnsub();
        };
    }, []);

    const promotionItems = [
        ...(depositBonus ? [{ type: 'bonus', data: depositBonus, id: 'deposit-bonus' }] : []),
        ...(hasDailyBonus ? [{ type: 'dailyBonus', data: {}, id: 'daily-bonus' }] : []),
        ...events.map(event => ({ type: 'event', data: event, id: event.id }))
    ];


    if (loading) {
        return (
            <div className="flex flex-col">
              <div className="mb-12">
                <Skeleton className="h-12 w-3/4 mb-2" />
                <Skeleton className="h-6 w-1/2" />
              </div>
              <div className="grid gap-6">
                <Skeleton className="h-48 w-full" />
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <Card key={i}><CardHeader><Skeleton className="w-8 h-8 rounded-full mb-2" /><Skeleton className="h-6 w-3/4 mb-1" /><Skeleton className="h-4 w-1/2" /></CardHeader></Card>
                    ))}
                </div>
              </div>
            </div>
          );
    }
  
    if (!user) {
      redirect('/login');
    }
    
    const summaryCards = {
        balance: { title: "Wallet Balance", value: userData?.balance, description: "Your current available funds.", colorClass: "text-primary" },
        bonus: { title: "Bonus Balance", value: userData?.bonusBalance, description: "Funds for gameplay.", colorClass: "text-accent" },
        earnings: { title: "Total Earnings", value: stats.totalEarning, description: "Your net profit from games.", colorClass: "text-yellow-500" },
        deposit: { title: "Total Deposit", value: stats.totalDeposit, description: "All funds you've added.", colorClass: "text-green-500" },
        withdrawals: { title: "Total Withdrawals", value: stats.totalWithdrawal, description: "All funds you've taken out.", colorClass: "text-red-500" },
    };

    const StatCard = ({ card }: { card: typeof summaryCards.balance }) => (
         <Card className="bg-card/50">
            <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
                 {statsLoading ? (
                    <Skeleton className="h-8 w-3/4" />
                ) : (
                    <div>
                        <div className={cn("text-3xl font-bold", card.colorClass)}>LKR {card.value?.toFixed(2) ?? '0.00'}</div>
                        <p className="text-xs text-muted-foreground">~{((card.value ?? 0) / USDT_RATE).toFixed(2)} USDT</p>
                    </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">{card.description}</p>
            </CardContent>
        </Card>
    );

  const mainActions = [
    { title: "Practice Games", description: "Play for free against the bot", icon: Sword, href: "/practice" },
    { title: "Start Earning", description: "Play against others to win", icon: DollarSign, href: "/lobby" },
    { title: "My Rooms", description: "Check on your active games", icon: List, href: "/dashboard/my-rooms" },
    { title: "Top up Wallet", description: "Add funds to play and earn", icon: Wallet, href: "/dashboard/wallet" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="mb-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2">Welcome to the Arena</h1>
        <p className="text-muted-foreground md:text-lg">
          Your journey to becoming a grandmaster starts now. Choose your game and make your move.
        </p>
      </div>
      
       {promotionsLoading ? (
           <Skeleton className="h-48 w-full" />
       ) : promotionItems.length > 0 && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {promotionItems.map(item => {
                   if (item.type === 'bonus') return <BonusDisplay key={item.id}/>;
                   if (item.type === 'dailyBonus') return <DailyBonusDisplay key={item.id}/>;
                   if (item.type === 'event') return <EventDisplay key={item.id} event={item.data as Event}/>
                   return null;
               })}
           </div>
       )}

      <div className="grid gap-6">
        <div className="grid grid-cols-2 gap-6">
            <StatCard card={summaryCards.balance} />
            <StatCard card={summaryCards.bonus} />
        </div>
        <div className="grid grid-cols-2 gap-6">
            <StatCard card={summaryCards.earnings} />
            <StatCard card={summaryCards.deposit} />
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
