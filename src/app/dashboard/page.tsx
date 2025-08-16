
'use client'
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Users, Sword, DollarSign, List, Wallet, MessageSquare, BarChart3, Gift, Gamepad2, ArrowDown, ArrowUp, Trophy, Megaphone, Calendar, ArrowRight, Clock, Handshake, PercentCircle } from 'lucide-react';
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

function BonusHub() {
    const [dailyBonusAvailable, setDailyBonusAvailable] = useState(false);
    const [depositBonusAvailable, setDepositBonusAvailable] = useState(false);
    
    // In a real app, you would fetch the availability of these bonuses.
    // For now, we'll just simulate them being available.
    useEffect(() => {
        setDailyBonusAvailable(true);
        setDepositBonusAvailable(true);
    }, []);

    if (!dailyBonusAvailable && !depositBonusAvailable) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {dailyBonusAvailable && (
                <Card className="bg-gradient-to-tr from-yellow-400/10 to-yellow-500/10 border-yellow-400/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Calendar className="text-yellow-400"/> Daily Login Bonus</CardTitle>
                        <CardDescription>Claim your free daily reward!</CardDescription>
                    </CardHeader>
                    <CardFooter>
                         <Button asChild variant="secondary">
                            <Link href="/dashboard/bonus-center">Claim Now</Link>
                        </Button>
                    </CardFooter>
                </Card>
            )}
             {depositBonusAvailable && (
                <Card className="bg-gradient-to-tr from-green-400/10 to-green-500/10 border-green-400/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><PercentCircle className="text-green-400"/> Deposit Bonus</CardTitle>
                        <CardDescription>Get extra value on your next deposit.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button asChild variant="secondary">
                            <Link href="/dashboard/wallet">Deposit Now</Link>
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    )
}


export default function DashboardPage() {
    const { user, userData, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="flex flex-col">
              <div className="mb-12">
                <Skeleton className="h-12 w-3/4 mb-2" />
                <Skeleton className="h-6 w-1/2" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28"/>)}
              </div>
            </div>
          );
    }
  
    if (!user) {
      redirect('/login');
    }

  const mainActions = [
    { title: "Start Earning", description: "Play against others to win", icon: DollarSign, href: "/lobby" },
    { title: "My Rooms", description: "Check on your active games", icon: List, href: "/dashboard/my-rooms" },
    { title: "Friends", description: "Find and challenge friends", icon: Users, href: "/dashboard/friends" },
    { title: "Rankings", description: "See the top players", icon: BarChart3, href: "/dashboard/rankings" },
    { title: "Refer & Earn", description: "Earn passive income", icon: Megaphone, href: "/dashboard/refer-earn" },
    { title: "Equipment", description: "Customize your game", icon: Gamepad2, href: "/dashboard/equipment" },
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
      <BonusHub />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {mainActions.map((action) => (
          <Link href={action.href} key={action.title}>
            <Card className="bg-card/50 hover:bg-primary/5 transition-all cursor-pointer h-full text-center items-center flex flex-col justify-center p-4">
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
