
'use client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Event } from './events/page';

export default function EventDisplay({ event }: { event: Event }) {
  const goalText = event.targetType === 'winningMatches'
    ? `${event.targetAmount} Wins`
    : `LKR ${event.targetAmount.toLocaleString()}`;

  return (
    <Card className="h-full border-purple-400/50 bg-purple-400/10 flex flex-col">
        <CardHeader className="items-center text-center">
            <div className="p-3 bg-purple-400/10 rounded-full w-fit mb-2">
                <Target className="w-8 h-8 text-purple-400" />
            </div>
            <CardTitle className="text-lg text-purple-400">{event.title}</CardTitle>
             <CardDescription className="text-purple-400/80">
                Complete the goal to win LKR {event.rewardAmount.toLocaleString()}!
            </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-center items-center">
            <p className="text-4xl font-bold">{goalText}</p>
            <p className="text-sm text-muted-foreground">Event Goal</p>
        </CardContent>
         <CardContent>
             <Button asChild className="w-full bg-purple-600 hover:bg-purple-600/90">
                <Link href="/dashboard/events">View Event <ArrowRight className="ml-2"/></Link>
            </Button>
        </CardContent>
    </Card>
  );
}
