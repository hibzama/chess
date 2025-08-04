

'use client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowRight, Trophy, Handshake, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export interface Event {
    id: string;
    title: string;
    description: string;
    isActive: boolean;
    enrollmentFee: number;
    targetType: 'totalEarnings' | 'winningMatches';
    targetAmount: number;
    minWager?: number;
    rewardAmount: number;
    durationHours: number;
}

interface EventDisplayProps {
    event: Event;
}

export default function EventDisplay({ event }: EventDisplayProps) {
  if (!event) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
  }

  const getTargetDescription = () => {
    if (event.targetType === 'winningMatches') {
        return `Win ${event.targetAmount} games`;
    }
    return `Earn LKR ${event.targetAmount.toFixed(2)}`;
  }

  return (
    <Card className="h-full border-primary/50 bg-primary/10 flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" />
          <span className="text-primary">{event.title}</span>
        </CardTitle>
        <CardDescription>{event.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm flex-grow">
        <div className="flex items-center justify-between p-3 rounded-md bg-background/30">
            <span className="font-semibold flex items-center gap-2 text-muted-foreground"><Trophy /> Target</span>
            <span className="font-bold">{getTargetDescription()}</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-md bg-background/30">
            <span className="font-semibold flex items-center gap-2 text-muted-foreground"><DollarSign /> Reward</span>
            <span className="font-bold text-green-400">LKR {event.rewardAmount.toFixed(2)}</span>
        </div>
         <div className="flex items-center justify-between p-3 rounded-md bg-background/30">
            <span className="font-semibold flex items-center gap-2 text-muted-foreground"><Handshake /> Fee</span>
            <span className="font-bold text-red-400">LKR {event.enrollmentFee.toFixed(2)}</span>
        </div>
      </CardContent>
      <CardFooter className="mt-auto">
        <Button asChild className="w-full">
          <Link href="/dashboard/events">View Event Details <ArrowRight className="ml-2" /></Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
