
'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Swords, User, Clock, Watch, BarChart2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { useTranslation } from '@/hooks/use-translation';

type GameRoom = {
    id: string;
    wager: number;
    timeControl: number;
    createdBy: { name: string; uid: string; };
    createdAt: Timestamp;
    expiresAt: Timestamp;
    status: 'waiting' | 'in-progress' | 'completed';
};

type PublicGamesProps = {
    gameType: string;
    currencySymbol: string;
    usdtRate: number;
}

export default function PublicGames({ gameType, currencySymbol, usdtRate }: PublicGamesProps) {
    const [allWaitingRooms, setAllWaitingRooms] = useState<GameRoom[]>([]);
    const [displayedRooms, setDisplayedRooms] = useState<GameRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const t = useTranslation;

    useEffect(() => {
        const q = query(
            collection(db, 'game_rooms'), 
            where('gameType', '==', gameType),
            where('isPrivate', '==', false),
            where('status', '==', 'waiting')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedRooms = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as GameRoom));
            const sortedRooms = fetchedRooms.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            setAllWaitingRooms(sortedRooms);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching public games:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [gameType]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            const now = Timestamp.now();
            setDisplayedRooms(allWaitingRooms.filter(room => room.expiresAt.toMillis() > now.toMillis()));
        }, 1000); // Re-filter every second

        // Initial filter run
        const now = Timestamp.now();
        setDisplayedRooms(allWaitingRooms.filter(room => room.expiresAt.toMillis() > now.toMillis()));

        return () => clearInterval(intervalId);
    }, [allWaitingRooms]);

    const handleJoin = (roomId: string) => {
        router.push(`/game/multiplayer/${roomId}`);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Swords />
                    {t('Find a Public Game')}
                </CardTitle>
                <CardDescription>{t('Join a game created by another player from the public lobby.')}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><User className="inline-block mr-1"/> {t('Player')}</TableHead>
                            <TableHead><BarChart2 className="inline-block mr-1"/> {t('Stakes')}</TableHead>
                            <TableHead><Watch className="inline-block mr-1"/> {t('Timer')}</TableHead>
                            <TableHead><Clock className="inline-block mr-1"/> {t('Created')}</TableHead>
                            <TableHead className="text-right">{t('Action')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5}>
                                    <div className="space-y-2">
                                        <Skeleton className="h-8" />
                                        <Skeleton className="h-8" />
                                        <Skeleton className="h-8" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : displayedRooms.length > 0 ? displayedRooms.map(room => (
                            <TableRow key={room.id}>
                                <TableCell className="font-medium">{room.createdBy.name}</TableCell>
                                <TableCell>
                                    <div className="font-bold">{currencySymbol} {room.wager.toFixed(2)}</div>
                                    <div className="text-xs text-muted-foreground">~{(room.wager / usdtRate).toFixed(2)} USDT</div>
                                </TableCell>
                                <TableCell>{room.timeControl / 60} min</TableCell>
                                <TableCell>{formatDistanceToNowStrict(room.createdAt.toDate(), { addSuffix: true })}</TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" onClick={() => handleJoin(room.id)}>{t('Join Game')}</Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    {t('No open public games found.')} <Link href={`/lobby/${gameType}/create`} className="text-primary underline">{t('Create one!')}</Link>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
