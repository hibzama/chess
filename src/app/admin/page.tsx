
'use client'
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Users, Clock, ArrowUpCircle, ArrowDownCircle, Megaphone, Wallet, Swords, DollarSign, TrendingUp, History } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';

export default function AdminDashboardPage() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [gamesLast24h, setGamesLast24h] = useState(0);
  const [wagersLast24h, setWagersLast24h] = useState(0);
  const [returnsLast24h, setReturnsLast24h] = useState(0);
  const [allTimeGames, setAllTimeGames] = useState(0);
  const [allTimeWagers, setAllTimeWagers] = useState(0);
  const [allTimeReturns, setAllTimeReturns] = useState(0);
  const [loading, setLoading] = useState(true);
  const { currencyConfig } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      
      // Fetch total users
      const usersQuerySnapshot = await getDocs(collection(db, "users"));
      setTotalUsers(usersQuerySnapshot.size);

      // --- Last 24 Hours Stats ---
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayTimestamp = Timestamp.fromDate(yesterday);

      const games24hQuery = query(
        collection(db, "game_rooms"), 
        where('createdAt', '>=', yesterdayTimestamp)
      );
      
      const games24hSnapshot = await getDocs(games24hQuery);
      let gameCount24h = 0;
      let totalWager24h = 0;
      let totalReturn24h = 0;
      const validStatuses = ['in-progress', 'completed'];

      games24hSnapshot.forEach(doc => {
        const gameData = doc.data();
        if (validStatuses.includes(gameData.status)) {
            gameCount24h++;
            const wager = gameData.wager || 0;
            totalWager24h += wager * 2; // Total wager is from 2 players
            if (gameData.status === 'completed') {
                totalReturn24h += wager * 1.8; // Total return is always 180% of the wager
            }
        }
      });

      setGamesLast24h(gameCount24h);
      setWagersLast24h(totalWager24h);
      setReturnsLast24h(totalReturn24h);
      
      // --- All Time Stats ---
      const allGamesQuery = query(
        collection(db, "game_rooms"),
        where('status', '==', 'completed')
      );
      const allGamesSnapshot = await getDocs(allGamesQuery);
      let totalGames = 0;
      let totalWagers = 0;
      let totalReturns = 0;

      allGamesSnapshot.forEach(doc => {
        const gameData = doc.data();
        totalGames++;
        const wager = gameData.wager || 0;
        totalWagers += wager * 2; // Total wager is from 2 players
        totalReturns += wager * 1.8;
      });

      setAllTimeGames(totalGames);
      setAllTimeWagers(totalWagers);
      setAllTimeReturns(totalReturns);


      setLoading(false);
    };

    fetchStats();
  }, []);

  const adminActions = [
    { title: "Pending Deposits", description: "Review and approve new deposits.", icon: Clock, href: "/admin/deposits/pending" },
    { title: "Pending Withdrawals", description: "Process new withdrawal requests.", icon: Clock, href: "/admin/withdrawals/pending" },
    { title: "User Management", description: "View and manage all registered users.", icon: Users, href: "/admin/users" },
    { title: "Transaction Histories", description: "View all deposit and withdrawal records.", icon: ArrowUpCircle, href: "/admin/deposits/history" },
    { title: "Marketing Apps", description: "Review new marketing applications.", icon: Megaphone, href: "/admin/marketing/applications" },
  ];

  const StatCard = ({ title, value, description, icon, isLoading }: { title: string, value: string | number, description: string, icon: React.ReactNode, isLoading: boolean}) => (
     <Card>
        <CardHeader>
            {icon}
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <Skeleton className="h-8 w-1/2" />
            ) : (
                <p className="text-3xl font-bold">{value}</p>
            )}
        </CardContent>
    </Card>
  )

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground md:text-lg">
          Welcome to the control center. Manage your platform from here.
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Clock className="text-primary"/> Last 24 Hours</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                title="Total Users" 
                value={totalUsers} 
                description="The total number of registered players."
                icon={<Users className="w-8 h-8 text-primary mb-2" />}
                isLoading={loading}
            />
            <StatCard 
                title="Games Played (24h)" 
                value={gamesLast24h} 
                description="Number of games played."
                icon={<Swords className="w-8 h-8 text-primary mb-2" />}
                isLoading={loading}
            />
            <StatCard 
                title="Wagers (24h)" 
                value={`${currencyConfig.symbol} ${wagersLast24h.toFixed(2)}`}
                description="Total wagered."
                icon={<DollarSign className="w-8 h-8 text-primary mb-2" />}
                isLoading={loading}
            />
             <StatCard 
                title="Returns (24h)" 
                value={`${currencyConfig.symbol} ${returnsLast24h.toFixed(2)}`}
                description="Total returned to players."
                icon={<TrendingUp className="w-8 h-8 text-primary mb-2" />}
                isLoading={loading}
            />
        </div>
      </div>
      
       <div className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2"><History className="text-primary"/> All-Time Statistics</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
             <StatCard 
                title="Total Games" 
                value={allTimeGames} 
                description="All completed games."
                icon={<Swords className="w-8 h-8 text-primary mb-2" />}
                isLoading={loading}
            />
             <StatCard 
                title="Total Wagers" 
                value={`${currencyConfig.symbol} ${allTimeWagers.toFixed(2)}`}
                description="All-time wagered."
                icon={<DollarSign className="w-8 h-8 text-primary mb-2" />}
                isLoading={loading}
            />
             <StatCard 
                title="Total Returns" 
                value={`${currencyConfig.symbol} ${allTimeReturns.toFixed(2)}`}
                description="All-time returned."
                icon={<TrendingUp className="w-8 h-8 text-primary mb-2" />}
                isLoading={loading}
            />
        </div>
      </div>

      <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminActions.map((action) => (
          <Link href={action.href} key={action.title}>
            <Card className="hover:bg-primary/5 transition-all cursor-pointer h-full">
              <CardHeader>
                <action.icon className="w-8 h-8 text-primary mb-2" />
                <CardTitle>{action.title}</CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
