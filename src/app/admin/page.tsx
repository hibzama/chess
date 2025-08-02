
'use client'
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Users, Clock, ArrowUpCircle, ArrowDownCircle, Megaphone, Wallet } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboardPage() {
  const [totalUserFunds, setTotalUserFunds] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTotalFunds = async () => {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "users"));
      let total = 0;
      querySnapshot.forEach((doc) => {
        total += doc.data().balance || 0;
      });
      setTotalUserFunds(total);
      setLoading(false);
    };

    fetchTotalFunds();
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
                <Wallet className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Total User Funds</CardTitle>
                <CardDescription>The combined wallet balance of all users.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Skeleton className="h-8 w-3/4" />
                ) : (
                    <p className="text-3xl font-bold">LKR {totalUserFunds.toFixed(2)}</p>
                )}
            </CardContent>
        </Card>

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
