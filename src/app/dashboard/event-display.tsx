

'use client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export interface Event {
    id: string;
    title: string;
    description: string;
    isActive: boolean;
}

interface EventDisplayProps {
    event: Event;
}

export default function EventDisplay({ event }: EventDisplayProps) {
  if (!event) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
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
      <CardFooter className="mt-auto">
        <Button asChild className="w-full">
          <Link href="/dashboard/events">View Event Details <ArrowRight className="ml-2" /></Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
