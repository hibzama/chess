
'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DepositBonus {
    percentage: number;
    minDeposit: number;
    maxDeposit: number;
    isActive: boolean;
}

export default function BonusDisplay() {
  const [bonus, setBonus] = useState<DepositBonus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bonusRef = doc(db, 'settings', 'depositBonus');
    const unsubscribe = onSnapshot(bonusRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as DepositBonus;
        if (data.isActive) {
          setBonus(data);
        } else {
          setBonus(null);
        }
      } else {
        setBonus(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (!bonus) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-primary/10 via-card to-accent/10 border-primary/20 animate-in fade-in-50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Gift className="w-6 h-6 text-yellow-300" />
          <span className="text-yellow-300">Limited Time: {bonus.percentage}% Deposit Bonus!</span>
        </CardTitle>
        <CardDescription className="text-foreground/80">
          Get a {bonus.percentage}% bonus on any deposit between LKR {bonus.minDeposit.toFixed(2)} and LKR {bonus.maxDeposit.toFixed(2)}. Don't miss out!
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

    