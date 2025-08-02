
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift } from 'lucide-react';

export function BonusCard() {
  const bonusLimit = 250;
  const LKR_BONUS = 100;

  return (
    <Card className="bg-card/50 border-primary/20">
      <CardHeader className="text-center">
        <CardTitle className="text-lg flex items-center justify-center gap-2">
          <Gift className="w-6 h-6 text-yellow-300" />
          <span className="text-yellow-300">{LKR_BONUS} LKR Registration Bonus!</span>
        </CardTitle>
        <CardDescription>The first {bonusLimit} users to register get a free bonus to start playing.</CardDescription>
      </CardHeader>
    </Card>
  );
}
