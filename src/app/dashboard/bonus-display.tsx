

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
    bonusType: 'percentage' | 'fixed';
    percentage: number;
    fixedAmount: number;
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

  const bonusText = bonus.bonusType === 'fixed' 
    ? `LKR ${bonus.fixedAmount.toFixed(2)}`
    : `${bonus.percentage}%`;
  
  const bonusDescription = bonus.bonusType === 'fixed'
    ? 'Fixed Bonus Amount'
    : 'Bonus Rate';

  return (
    <Card className="h-full border-accent bg-accent/10 flex flex-col items-center text-center">
        <CardHeader>
            <div className="mx-auto p-3 bg-accent/10 rounded-full w-fit mb-2">
                <Gift className="w-8 h-8 text-accent" />
            </div>
            <CardTitle className="text-lg text-accent">Limited Time Deposit Bonus!</CardTitle>
             <CardDescription className="text-accent/80">
                A special promotion is active. Deposit now to earn extra rewards.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 flex-1 flex flex-col justify-center items-center">
             <div className="bg-background/50 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold">{bonusText}</p>
                <p className="text-xs text-muted-foreground">{bonusDescription}</p>
            </div>
            <div className="text-center">
                 <p className="text-sm font-semibold">Time Remaining:</p>
                <p className="text-xl font-bold text-accent">{countdown}</p>
            </div>
        </CardContent>
         <CardContent className="w-full">
             <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/dashboard/wallet">Make Deposit <ArrowRight className="ml-2"/></Link>
            </Button>
        </CardContent>
    </Card>
  );
}
