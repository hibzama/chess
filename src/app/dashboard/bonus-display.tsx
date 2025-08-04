

'use client'
import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Wallet, Users, Percent, Landmark, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export interface DepositBonus {
    percentage: number;
    minDeposit: number;
    maxDeposit: number;
    maxUsers: number;
    isActive: boolean;
    durationHours: number;
    startTime?: Timestamp;
}

export default function BonusDisplay() {
  const [bonus, setBonus] = useState<DepositBonus | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const USDT_RATE = 310;

  useEffect(() => {
    const bonusRef = doc(db, 'settings', 'depositBonus');
    const unsubscribe = onSnapshot(bonusRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().isActive) {
        setBonus(docSnap.data() as DepositBonus);
      } else {
        setBonus(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

   useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        if (!bonus?.isActive || !bonus.startTime) {
            setCountdown('');
            return;
        }

        const calculateCountdown = () => {
            const now = new Date().getTime();
            const expiryTime = bonus.startTime!.toDate().getTime() + (bonus.durationHours * 60 * 60 * 1000);
            const distance = expiryTime - now;

            if (distance < 0) {
                if (intervalRef.current) clearInterval(intervalRef.current);
                setCountdown("EXPIRED");
                setBonus(null); 
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }
        
        calculateCountdown(); // Run immediately
        intervalRef.current = setInterval(calculateCountdown, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [bonus]);

  if (loading) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
  }

  if (!bonus) {
    return null;
  }

  return (
    <Card className="h-full border-accent/50 bg-accent/10">
        <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
                <Gift className="w-6 h-6 text-accent" />
                <span className="text-accent">Limited Time Deposit Bonus!</span>
            </CardTitle>
             <CardDescription>
                A special promotion is active. Deposit now to earn extra rewards.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <div className="bg-background/50 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold">{bonus.percentage}%</p>
                <p className="text-xs text-muted-foreground">Bonus Rate</p>
            </div>
            <div className="text-center">
                 <p className="text-sm font-semibold">Time Remaining:</p>
                <p className="text-xl font-bold text-accent">{countdown}</p>
            </div>
             <Button asChild className="w-full">
                <Link href="/dashboard/wallet">Make Deposit <ArrowRight className="ml-2"/></Link>
            </Button>
        </CardContent>
    </Card>
  );
}
