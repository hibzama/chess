'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type Game = {
    id: string;
    gameType: 'chess' | 'checkers';
    winner?: { uid: string | null, method: string, resignerId?: string | null };
    draw?: boolean;
    createdAt: any;
    createdBy: { uid: string, name: string };
    player2?: { uid: string, name: string };
    wager: number;
};

export default function GameHistoryPage() {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'game_rooms'), 
            where('status', '==', 'completed'),
            orderBy('createdAt', 'desc'),
            limit(100)
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
            setGames(history);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const getGameResult = (game: Game) => {
        if (game.draw) {
             return (
                <div className="flex flex-col items-start">
                    <Badge variant="secondary">Draw</Badge>
                    <span className="text-xs text-muted-foreground mt-1">Each player gets LKR {(game.wager * 0.9).toFixed(2)}</span>
                </div>
            )
        }
        if (!game.winner || !game.winner.uid) {
            return <Badge variant="outline">Unknown</Badge>;
        }
        
        const winnerName = game.winner.uid === game.createdBy.uid ? game.createdBy.name : game.player2?.name;
        const winMethod = game.winner.method.replace('-', ' ');

        let returnAmount = game.wager * 1.8;
        if(game.winner.method === 'resign') {
            returnAmount = game.wager * 1.05;
        }

        return (
            <div className="flex flex-col items-start gap-1">
                <Badge>{winnerName} Won</Badge>
                <div className="text-xs text-muted-foreground capitalize">
                   <p>Method: {winMethod}</p>
                   <p className="text-green-400">Return: LKR {returnAmount.toFixed(2)}</p>
                </div>
            </div>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Game History</CardTitle>
                <CardDescription>A log of the last 100 completed games on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p>Loading game history...</p>
                ) : games.length === 0 ? (
                    <p>No completed games found.</p>
                ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Game Type</TableHead>
                            <TableHead>Players</TableHead>
                            <TableHead>Wager (LKR)</TableHead>
                            <TableHead>Result</TableHead>
                            <TableHead>Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {games.map((game) => (
                            <TableRow key={game.id}>
                                <TableCell className="capitalize">{game.gameType}</TableCell>
                                <TableCell>{game.createdBy.name} vs {game.player2?.name || 'N/A'}</TableCell>
                                <TableCell>LKR {game.wager.toFixed(2)}</TableCell>
                                <TableCell>{getGameResult(game)}</TableCell>
                                <TableCell>{game.createdAt ? format(new Date(game.createdAt.seconds * 1000), 'PPp') : 'N/A'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                )}
            </CardContent>
        </Card>
    );
}
