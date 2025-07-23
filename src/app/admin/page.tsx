'use client'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Users, Clock, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {

  const adminActions = [
    { title: "Pending Deposits", description: "Review and approve new deposits.", icon: Clock, href: "/admin/deposits/pending" },
    { title: "Pending Withdrawals", description: "Process new withdrawal requests.", icon: Clock, href: "/admin/withdrawals/pending" },
    { title: "User Management", description: "View and manage all registered users.", icon: Users, href: "/admin/users" },
    { title: "Transaction Histories", description: "View all deposit and withdrawal records.", icon: ArrowUpCircle, href: "/admin/deposits/history" },
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
