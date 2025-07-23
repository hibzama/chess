import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Users, Sword, DollarSign, List, Wallet, MessageSquare, BarChart3, Gift, Gamepad2 } from 'lucide-react';
import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // This is a placeholder for user authentication.
  // In a real app, you would check for a valid session.
  const isLoggedIn = false; 

  if (!isLoggedIn) {
    redirect('/login');
  }

  const mainActions = [
    { title: "Practice Games", description: "Play for free against the bot", icon: Sword, href: "#" },
    { title: "Start Earning", description: "Play against others to win", icon: DollarSign, href: "#" },
    { title: "My Rooms", description: "Check on your active games", icon: List, href: "#" },
    { title: "Top up Wallet", description: "Add funds to play and earn", icon: Wallet, href: "#" },
  ];

  const secondaryActions = [
    { title: "Friends", icon: Users, href: "#" },
    { title: "Ranking", icon: BarChart3, href: "#" },
    { title: "Start Earning", icon: DollarSign, href: "#" },
    { title: "Chat", icon: MessageSquare, href: "#" },
    { title: "Refer & Earn", icon: Gift, href: "#" },
    { title: "Equipment", icon: Gamepad2, href: "#" },
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
          {mainActions.map((action) => (
            <Card key={action.title} className="hover:bg-primary/5 transition-all cursor-pointer">
              <CardHeader>
                <action.icon className="w-8 h-8 text-primary mb-2" />
                <CardTitle>{action.title}</CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
          {secondaryActions.map((action) => (
             <Card key={action.title} className="hover:bg-primary/5 transition-all cursor-pointer">
              <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
                <action.icon className="w-7 h-7 text-primary" />
                <span className="font-semibold text-center text-sm">{action.title}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

    