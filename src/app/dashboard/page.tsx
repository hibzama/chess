
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
import BonusDisplay from './bonus-display';
import type { Event } from './events/page';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';


const EventCountdown = ({ event }: { event: Event }) => {
    const [countdown, setCountdown] = useState('');
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        if (!event.createdAt) {
            setCountdown('Loading...');
            return;
        }

        const calculateCountdown = () => {
            const now = new Date().getTime();
            // The event's global expiry is based on when the admin created it + its duration
            const expiryTime = event.createdAt.toDate().getTime() + (event.durationHours * 60 * 60 * 1000);
            const distance = expiryTime - now;

            if (distance < 0) {
                if (intervalRef.current) clearInterval(intervalRef.current);
                setCountdown("EXPIRED");
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            let countdownString = '';
            if (days > 0) countdownString += `${days}d `;
            if (hours > 0) countdownString += `${hours}h `;
            if (minutes > 0) countdownString += `${minutes}m `;
            countdownString += `${seconds}s`;

            setCountdown(countdownString.trim());
        }
        
        calculateCountdown();
        intervalRef.current = setInterval(calculateCountdown, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [event]);

    return <div className="font-semibold">{countdown}</div>;
};


const EventListCard = ({ events }: { events: Event[] }) => {

    const getTargetDescription = (event: Event) => {
        if (event.targetType === 'winningMatches') {
            return `Win ${event.targetAmount} games`;
        }
        return `Earn LKR ${event.targetAmount.toFixed(2)}`;
    }

    return (
        <Card className="h-full border-primary/50 bg-primary/10 flex flex-col">
             <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-primary" />
                    <span className="text-primary">Active Events</span>
                </CardTitle>
                <CardDescription>Join a special event to earn exclusive rewards.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Event</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead>Reward</TableHead>
                            <TableHead>Time Left</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {events.map(event => (
                            <TableRow key={event.id}>
                                <TableCell>
                                    <p className="font-semibold">{event.title}</p>
                                </TableCell>
                                <TableCell>{getTargetDescription(event)}</TableCell>
                                <TableCell className="text-green-400 font-bold">LKR {event.rewardAmount.toFixed(2)}</TableCell>
                                <TableCell><EventCountdown event={event} /></TableCell>
                                <TableCell>
                                    <Button asChild size="sm" variant="ghost">
                                        <Link href="/dashboard/events">View <ArrowRight className="ml-2 w-4 h-4"/></Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

const EventDisplayCard = ({ event }: { event: Event }) => {
    
    const getTargetDescription = (event: Event) => {
        if (event.targetType === 'winningMatches') {
            return `Win ${event.targetAmount} games`;
        }
        return `Earn LKR ${event.targetAmount.toFixed(2)}`;
    }

    return (
        <Card className="h-full border-primary/50 bg-primary/10 flex flex-col">
             <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-primary" />
                    <span className="text-primary">{event.title}</span>
                </CardTitle>
                <CardDescription>{event.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
                 <div className="space-y-3 rounded-lg bg-card/50 p-4">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-2"><Trophy/> Target</span>
                        <span className="font-bold">{getTargetDescription(event)}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-2"><DollarSign/> Reward</span>
                        <span className="font-bold text-green-400">LKR {event.rewardAmount.toFixed(2)}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-2"><Handshake/> Fee</span>
                        <span className="font-bold text-red-400">LKR {event.enrollmentFee.toFixed(2)}</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button asChild className="w-full bg-primary hover:bg-primary/90">
                    <Link href="/dashboard/events">View Event Details <ArrowRight className="ml-2"/></Link>
                </Button>
            </CardFooter>
        </Card>
    );
};


export default function DashboardPage() {
    const { user, userData, loading } = useAuth();
    const [stats, setStats] = useState({
        totalDeposit: 0,
        totalWithdrawal: 0,
        totalEarning: 0,
    });
    const [statsLoading, setStatsLoading] = useState(true);
    const [activeEvents, setActiveEvents] = useState<Event[]>([]);
    const [isBonusActive, setIsBonusActive] = useState(false);
    const [promotionsLoading, setPromotionsLoading] = useState(true);

    const USDT_RATE = 310;

    useEffect(() => {
        if (user) {
            setStatsLoading(true);
            setPromotionsLoading(true);

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
            
            const eventsQuery = query(collection(db, 'events'), where('isActive', '==', true));
            const eventsUnsub = onSnapshot(eventsQuery, (snapshot) => {
                 setActiveEvents(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Event)));
                 setPromotionsLoading(false); 
            });

            const bonusRef = doc(db, 'settings', 'depositBonus');
            const bonusUnsub = onSnapshot(bonusRef, (docSnap) => {
                const bonusData = docSnap.data();
                const isActive = bonusData?.isActive && bonusData?.startTime && (bonusData.startTime.toDate().getTime() + (bonusData.durationHours * 3600 * 1000)) > new Date().getTime();
                setIsBonusActive(isActive);
                setPromotionsLoading(false);
            });
            
            return () => {
                eventsUnsub();
                bonusUnsub();
            };
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

  const hasPromotions = isBonusActive || activeEvents.length > 0;
  const showSingleEventCard = activeEvents.length === 1;

  return (
    <div className="flex flex-col gap-8">
      <div className="mb-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2">Welcome to the Arena</h1>
        <p className="text-muted-foreground md:text-lg">
          Your journey to becoming a grandmaster starts now. Choose your game and make your move.
        </p>
      </div>
      
       {promotionsLoading ? <Skeleton className="h-48 w-full rounded-lg" /> : (
            hasPromotions && (
                <div className={cn("grid gap-6", isBonusActive && activeEvents.length > 0 ? "lg:grid-cols-2" : "grid-cols-1")}>
                    {isBonusActive && <BonusDisplay />}
                    {showSingleEventCard && <EventDisplayCard event={activeEvents[0]}/>}
                    {!showSingleEventCard && activeEvents.length > 0 && <EventListCard events={activeEvents}/>}
                </div>
            )
       )}

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
                            <div>
                                <div className={cn("text-3xl font-bold", card.colorClass)}>LKR {card.value?.toFixed(2) ?? '0.00'}</div>
                                <p className="text-xs text-muted-foreground">~{((card.value ?? 0) / USDT_RATE).toFixed(2)} USDT</p>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">{card.description}</p>
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

