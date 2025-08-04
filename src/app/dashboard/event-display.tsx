
'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

interface Event {
    id: string;
    title: string;
    description: string;
    isActive: boolean;
}

export default function EventDisplay() {
  const [activeEvents, setActiveEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'events'), where('isActive', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const eventsData = snapshot.docs.map(doc => doc.data() as Event);
        setActiveEvents(eventsData);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (activeEvents.length === 0) {
    return null;
  }

  return (
    <Card className="border-accent/50 bg-accent/10">
        <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-6 h-6 text-accent" />
                <span className="text-accent">Active Events</span>
            </CardTitle>
             <CardDescription>
                Check out the ongoing events and challenges you can join to win big rewards.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Carousel opts={{ align: "start", loop: true }}>
                <CarouselContent>
                    {activeEvents.map((event) => (
                        <CarouselItem key={event.id}>
                            <div className="p-1">
                                <Card className="bg-background/50">
                                    <CardHeader>
                                        <CardTitle>{event.title}</CardTitle>
                                        <CardDescription>{event.description}</CardDescription>
                                    </CardHeader>
                                </Card>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                {activeEvents.length > 1 && (
                    <>
                        <CarouselPrevious className="hidden sm:flex" />
                        <CarouselNext className="hidden sm:flex" />
                    </>
                )}
            </Carousel>
             <Button asChild className="w-full mt-4">
                <Link href="/dashboard/events">View All Events <ArrowRight className="ml-2"/></Link>
            </Button>
        </CardContent>
    </Card>
  );
}
