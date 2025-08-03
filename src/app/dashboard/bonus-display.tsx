
'use client'
import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Wallet, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface DepositBonus {
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
    return <Skeleton className="h-24 w-full" />;
  }

  if (!bonus) {
    return null;
  }
  
  const minUsdt = (bonus.minDeposit / USDT_RATE).toFixed(2);
  const maxUsdt = (bonus.maxDeposit / USDT_RATE).toFixed(2);

  return (
    <Card className="bg-gradient-to-r from-primary/10 via-card to-accent/10 border-primary/20 animate-in fade-in-50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Gift className="w-6 h-6 text-yellow-300" />
          <span className="text-yellow-300">Limited Time: {bonus.percentage}% Deposit Bonus!</span>
        </CardTitle>
        <CardDescription className="text-foreground/80">
          Get a {bonus.percentage}% bonus on any deposit between LKR {bonus.minDeposit.toFixed(2)} (~{minUsdt} USDT) and LKR {bonus.maxDeposit.toFixed(2)} (~{maxUsdt} USDT). 
          This offer is available for the first {bonus.maxUsers} players. Don't miss out!
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
