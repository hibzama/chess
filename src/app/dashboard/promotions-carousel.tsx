
'use client'
import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, Timestamp } from 'firebase/firestore';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import BonusDisplay, { type DepositBonus } from './bonus-display';
import EventDisplay from './event-display';
import DailyBonusDisplay from './daily-bonus-display';
import type { Event } from './events/page';

export default function PromotionsCarousel() {
    const [bonus, setBonus] = useState<DepositBonus | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [hasDailyBonus, setHasDailyBonus] = useState(false);
    const [loading, setLoading] = useState(true);
    const autoplay = useRef(Autoplay({ delay: 5000, stopOnInteraction: true }));

    useEffect(() => {
        let bonusLoaded = false;
        let eventsLoaded = false;
        let dailyBonusLoaded = false;

        const checkLoading = () => {
            if (bonusLoaded && eventsLoaded && dailyBonusLoaded) {
                setLoading(false);
            }
        };

        const bonusRef = doc(db, 'settings', 'depositBonus');
        const bonusUnsub = onSnapshot(bonusRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().isActive) {
                setBonus(docSnap.data() as DepositBonus);
            } else {
                setBonus(null);
            }
            bonusLoaded = true;
            checkLoading();
        });

        const eventsQuery = query(collection(db, 'events'), where('isActive', '==', true));
        const eventsUnsub = onSnapshot(eventsQuery, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Event));
            setEvents(eventsData);
            eventsLoaded = true;
            checkLoading();
        });

        const dailyBonusQuery = query(collection(db, 'bonuses'), where('isActive', '==', true));
        const dailyBonusUnsub = onSnapshot(dailyBonusQuery, (snapshot) => {
            setHasDailyBonus(!snapshot.empty);
            dailyBonusLoaded = true;
            checkLoading();
        });

        return () => {
            bonusUnsub();
            eventsUnsub();
            dailyBonusUnsub();
        };
    }, []);

    const promotionItems = [
        ...(bonus ? [{ type: 'bonus', data: bonus, id: 'deposit-bonus' }] : []),
        ...(hasDailyBonus ? [{ type: 'dailyBonus', data: {}, id: 'daily-bonus' }] : []),
        ...events.map(event => ({ type: 'event', data: event, id: event.id }))
    ];

    if (loading) {
        return <Skeleton className="h-48 w-full rounded-lg" />;
    }

    if (promotionItems.length === 0) {
        return null;
    }
    
    // If there's only one item, don't use the carousel.
    if (promotionItems.length === 1) {
        const item = promotionItems[0];
        return (
            <div className="w-full">
                {item.type === 'bonus' && <BonusDisplay />}
                {item.type === 'dailyBonus' && <DailyBonusDisplay />}
                {item.type === 'event' && <EventDisplay event={item.data as Event} />}
            </div>
        )
    }

    return (
        <Carousel
            plugins={[autoplay.current]}
            className="w-full"
            onMouseEnter={autoplay.current.stop}
            onMouseLeave={autoplay.current.reset}
        >
            <CarouselContent>
                {promotionItems.map((item) => (
                    <CarouselItem key={item.id}>
                        <div className="p-1">
                            {item.type === 'bonus' && <BonusDisplay />}
                            {item.type === 'dailyBonus' && <DailyBonusDisplay />}
                            {item.type === 'event' && <EventDisplay event={item.data as Event} />}
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
        </Carousel>
    );
}
