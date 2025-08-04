
'use client'
import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, Timestamp } from 'firebase/firestore';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import BonusDisplay, { type DepositBonus } from './bonus-display';
import EventDisplay, { type Event } from './event-display';

export default function PromotionsCarousel() {
    const [bonus, setBonus] = useState<DepositBonus | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const autoplay = useRef(Autoplay({ delay: 5000, stopOnInteraction: true }));

    useEffect(() => {
        const bonusRef = doc(db, 'settings', 'depositBonus');
        const bonusUnsub = onSnapshot(bonusRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().isActive) {
                setBonus(docSnap.data() as DepositBonus);
            } else {
                setBonus(null);
            }
            checkLoading();
        });

        const eventsQuery = query(collection(db, 'events'), where('isActive', '==', true));
        const eventsUnsub = onSnapshot(eventsQuery, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Event));
            setEvents(eventsData);
            checkLoading();
        });

        const checkLoading = () => {
            // This is a simplified way to set loading to false after both fetches attempt to run
            setLoading(false);
        };

        return () => {
            bonusUnsub();
            eventsUnsub();
        };
    }, []);

    const promotionItems = [
        ...(bonus ? [{ type: 'bonus', data: bonus }] : []),
        ...events.map(event => ({ type: 'event', data: event }))
    ];

    if (loading) {
        return <Skeleton className="h-48 w-full rounded-lg" />;
    }

    if (promotionItems.length === 0) {
        return null; // Don't render anything if there are no promotions
    }

    return (
        <Carousel
            plugins={[autoplay.current]}
            className="w-full"
            onMouseEnter={autoplay.current.stop}
            onMouseLeave={autoplay.current.reset}
        >
            <CarouselContent>
                {promotionItems.map((item, index) => (
                    <CarouselItem key={index}>
                        <div className="p-1">
                            {item.type === 'bonus' ? <BonusDisplay /> : <EventDisplay event={item.data as Event} />}
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
        </Carousel>
    );
}
