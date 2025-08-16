
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function BonusCard() {
  const [bonusConfig, setBonusConfig] = useState<{ enabled: boolean, amount: number, limit: number }>({ enabled: false, amount: 0, limit: 0 });

  useEffect(() => {
    const fetchBonusConfig = async () => {
      const docRef = doc(db, 'settings', 'bonusConfig');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBonusConfig({
          enabled: data.signupBonusEnabled,
          amount: data.signupBonusAmount,
          limit: data.signupBonusLimit
        });
      }
    };
    fetchBonusConfig();
  }, []);

  if (!bonusConfig.enabled || bonusConfig.amount === 0) {
    return null;
  }

  return (
    <Card className="bg-card/50 border-primary/20">
      <CardHeader className="text-center">
        <CardTitle className="text-lg flex items-center justify-center gap-2">
          <Gift className="w-6 h-6 text-yellow-300" />
          <span className="text-yellow-300">{bonusConfig.amount} LKR Registration Bonus!</span>
        </CardTitle>
        <CardDescription>The first {bonusConfig.limit} users to register get a free bonus to start playing.</CardDescription>
      </CardHeader>
    </Card>
  );
}
