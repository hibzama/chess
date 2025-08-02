
'use client'
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Users, Clock, ArrowUpCircle, ArrowDownCircle, Megaphone, Wallet, Swords, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboardPage() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [gamesLast24h, setGamesLast24h] = useState(0);
  const [wagersLast24h, setWagersLast24h] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      
      // Fetch total users
      const usersQuerySnapshot = await getDocs(collection(db, "users"));
      setTotalUsers(usersQuerySnapshot.size);

      // Fetch game stats for last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayTimestamp = Timestamp.fromDate(yesterday);

      const gamesQuery = query(
        collection(db, "game_rooms"), 
        where('createdAt', '>=', yesterdayTimestamp),
        where('status', 'in', ['in-progress', 'completed'])
      );
      
      const gamesSnapshot = await getDocs(gamesQuery);
      let gameCount = 0;
      let totalWager = 0;
      gamesSnapshot.forEach(doc => {
        gameCount++;
        totalWager += doc.data().wager || 0;
      });

      setGamesLast24h(gameCount);
      setWagersLast24h(totalWager);

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

  return (
    <div className="flex flex-col">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground md:text-lg">
          Welcome to the control center. Manage your platform from here.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
            <CardHeader>
                <Users className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Total Users</CardTitle>
                <CardDescription>The total number of registered players.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Skeleton className="h-8 w-1/2" />
                ) : (
                    <p className="text-3xl font-bold">{totalUsers}</p>
                )}
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <Swords className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Games (24h)</CardTitle>
                <CardDescription>Number of games played in last 24h.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Skeleton className="h-8 w-1/2" />
                ) : (
                    <p className="text-3xl font-bold">{gamesLast24h}</p>
                )}
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <DollarSign className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Wagers (24h)</CardTitle>
                <CardDescription>Total LKR wagered in last 24h.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Skeleton className="h-8 w-1/2" />
                ) : (
                    <p className="text-3xl font-bold">LKR {wagersLast24h.toFixed(2)}</p>
                )}
            </CardContent>
        </Card>
      </div>

      <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
