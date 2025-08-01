
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift } from 'lucide-react';
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

export function BonusCard() {
  const [claimedBonuses, setClaimedBonuses] = useState(0);
  const [loading, setLoading] = useState(true);
  const bonusLimit = 250;
  const LKR_BONUS = 100;

  useEffect(() => {
    const fetchBonusCount = async () => {
      try {
        const usersCollection = collection(db, "users");
        const snapshot = await getCountFromServer(usersCollection);
        setClaimedBonuses(snapshot.data().count);
      } catch (e) {
        console.error("Could not fetch user count for bonus", e);
      } finally {
        setLoading(false);
      }
    };
    fetchBonusCount();
  }, []);

  const remainingBonuses = Math.max(0, bonusLimit - claimedBonuses);

  return (
    <Card className="bg-card/50 border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-center gap-2">
          <Gift className="w-6 h-6 text-yellow-300" />
          <span className="text-yellow-300">{LKR_BONUS} LKR Registration Bonus!</span>
        </CardTitle>
        <CardDescription>The first {bonusLimit} users get a free bonus to start playing.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <p className="text-sm text-center text-muted-foreground">
            <span className="font-bold text-foreground">{Math.min(claimedBonuses, bonusLimit)} / {bonusLimit}</span> bonuses claimed. 
            <span className="font-bold text-foreground"> {remainingBonuses} remaining!</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
