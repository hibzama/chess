
'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function DailyBonusDisplay() {
  const [activeBonusCount, setActiveBonusCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bonusesQuery = query(collection(db, 'bonuses'), where('isActive', '==', true), limit(1));
    const unsubscribe = onSnapshot(bonusesQuery, (snapshot) => {
      setActiveBonusCount(snapshot.size);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
  }

  if (activeBonusCount === 0) {
    return (
        <Card className="h-full bg-accent/10 border-accent/20 flex flex-col items-center justify-center text-center">
             <CardHeader>
                <div className="mx-auto p-3 bg-accent/10 rounded-full w-fit mb-2">
                    <Gift className="w-8 h-8 text-accent" />
                </div>
                <CardTitle className="text-lg text-accent">No Active Bonuses</CardTitle>
                <CardDescription>
                    Check back later for new daily gifts and promotions!
                </CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
    <Card className="h-full border-primary/20 bg-primary/10 flex flex-col">
        <CardHeader className="items-center text-center">
            <div className="p-3 bg-primary/10 rounded-full w-fit mb-2">
                <Gift className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-lg text-primary">Daily Bonuses Available!</CardTitle>
             <CardDescription>
                Free rewards are waiting for you. Don't miss out!
            </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-center items-center">
            <p className="text-4xl font-bold">{activeBonusCount}</p>
            <p className="text-sm text-muted-foreground">{activeBonusCount > 1 ? 'Bonuses' : 'Bonus'} Available</p>
        </CardContent>
         <CardContent>
             <Button asChild className="w-full bg-primary hover:bg-primary/90">
                <Link href="/dashboard/bonus">Claim Your Bonus <ArrowRight className="ml-2"/></Link>
            </Button>
        </CardContent>
    </Card>
  );
}
