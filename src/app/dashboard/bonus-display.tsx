
'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface DepositBonus {
    percentage: number;
    minDeposit: number;
    maxDeposit: number;
    isActive: boolean;
    durationHours: number;
    startTime?: Timestamp;
}

export default function BonusDisplay() {
  const [bonus, setBonus] = useState<DepositBonus | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState('');

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

   useEffect(() => {
        if (!bonus?.isActive || !bonus.startTime) {
            setCountdown('');
            return;
        }

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const expiryTime = bonus.startTime!.toMillis() + (bonus.durationHours * 60 * 60 * 1000);
            const distance = expiryTime - now;

            if (distance < 0) {
                clearInterval(interval);
                setCountdown("EXPIRED");
                setBonus(null); // Hide the bonus card once it's expired
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }, 1000);

        return () => clearInterval(interval);
    }, [bonus]);

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
      <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
            <p className="text-sm font-semibold">Time Remaining:</p>
            <p className="text-xl font-bold text-accent">{countdown}</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/wallet"><Wallet className="mr-2"/> Make Deposit</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
