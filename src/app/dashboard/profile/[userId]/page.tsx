
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, getCountFromServer, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, User, History, Swords, Trophy, Handshake, Star, Ban, BrainCircuit, Layers, MessageSquare, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useParams, useRouter } from 'next/navigation';


type Game = {
    id: string;
    gameType: 'chess' | 'checkers';
    status: 'completed';
    winner?: { uid: string | null, method: string, resignerId?: string | null };
    draw?: boolean;
    createdAt: any;
    createdBy: { uid: string, name: string };
    player2?: { uid: string, name: string };
    wager: number;
};

type UserProfileData = {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    photoURL?: string;
    friends?: string[];
    wins?: number;
}

type GameStats = {
    played: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
};

const ranks = [
    { title: "Beginner", minWins: 0, level: 1 },
    { title: "Novice", minWins: 48, level: 5 },
    { title: "Apprentice", minWins: 211, level: 10 },
    { title: "Journeyman", minWins: 553, level: 15 },
    { title: "Strategist", minWins: 1182, level: 20 },
    { title: "Expert", minWins: 3506, level: 30 },
    { title: "Master", minWins: 7725, level: 40 },
    { title: "Grandmaster", minWins: 14797, level: 50 },
    { title: "Legend", minWins: 43680, level: 75 },
    { title: "Immortal", minWins: 91444, level: 100 },
];

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: number | string }) => (
    <Card className="bg-card/50 text-center">
        <CardContent className="p-4 flex flex-col items-center gap-1">
            <div className="text-primary mb-1">{icon}</div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </CardContent>
    </Card>
);

export default function PublicProfilePage() {
    const { user, userData: currentUserData } = useAuth();
    const router = useRouter();
    const params = useParams();
    const { userId } = params;
    
    const { toast } = useToast();
    const [profileData, setProfileData] = useState<UserProfileData | null>(null);
    const [gameHistory, setGameHistory] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [worldRank, setWorldRank] = useState<number | null>(null);

    const isOwnProfile = user?.uid === userId;

    useEffect(() => {
        if(isOwnProfile) {
            router.replace('/dashboard/profile');
            return;
        }

        if (!userId) {
            setLoading(false);
            return;
        }

        const fetchProfileData = async () => {
            setLoading(true);
            
            // Fetch User Profile
            const userDocRef = doc(db, 'users', userId as string);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                toast({ variant: 'destructive', title: 'User not found' });
                router.push('/dashboard/friends');
                return;
            }
            const userData = { ...userDoc.data(), uid: userDoc.id } as UserProfileData;
            setProfileData(userData);

            // Fetch Game History
            const gamesQuery = query(
                collection(db, 'game_rooms'), 
                where('players', 'array-contains', userId), 
                where('status', '==', 'completed')
            );
            const gamesSnapshot = await getDocs(gamesQuery);
            const history: Game[] = gamesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Game));
            setGameHistory(history.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)));

            // Fetch World Rank
            const usersWithMoreWinsQuery = query(
                collection(db, 'users'),
                where('wins', '>', userData.wins || 0)
            );
            const snapshot = await getCountFromServer(usersWithMoreWinsQuery);
            setWorldRank(snapshot.data().count + 1);

            setLoading(false);
        };

        fetchProfileData();
    }, [userId, isOwnProfile, router, toast]);

     const { chess: chessStats, checkers: checkersStats } = useMemo(() => {
        const stats: { chess: GameStats, checkers: GameStats } = {
            chess: { played: 0, wins: 0, losses: 0, draws: 0, winRate: 0 },
            checkers: { played: 0, wins: 0, losses: 0, draws: 0, winRate: 0 },
        };

        if (!userId) return stats;

        gameHistory.forEach(game => {
            const statType = game.gameType;
            if (!statType || !stats[statType]) return;

            let result: 'win' | 'loss' | 'draw' = 'loss';
            if (game.draw) {
                result = 'draw';
            } else if (game.winner?.uid === userId) {
                result = 'win';
            }

            stats[statType].played++;
            if (result === 'win') stats[statType].wins++;
            else if (result === 'loss') stats[statType].losses++;
            else stats[statType].draws++;
        });

        if (stats.chess.played > 0) {
            stats.chess.winRate = Math.round((stats.chess.wins / (stats.chess.played - stats.chess.draws)) * 100) || 0;
        }
        if (stats.checkers.played > 0) {
            stats.checkers.winRate = Math.round((stats.checkers.wins / (stats.checkers.played - stats.checkers.draws)) * 100) || 0;
        }

        return stats;
    }, [gameHistory, userId]);
    
    const totalWins = profileData?.wins || 0;

    const { rank, nextRank, winsToNextLevel, progress } = useMemo(() => {
        const currentRankIndex = ranks.slice().reverse().findIndex(r => totalWins >= r.minWins) ?? (ranks.length - 1);
        const rankInfo = ranks[ranks.length - 1 - currentRankIndex];
        const nextRankInfo = ranks[ranks.length - currentRankIndex] || null;
        const winsInLevel = totalWins - rankInfo.minWins;
        const winsToNext = nextRankInfo ? nextRankInfo.minWins - rankInfo.minWins : 0;
        const progressValue = winsToNext > 0 ? Math.round((winsInLevel / winsToNext) * 100) : 100;

        return { rank: rankInfo, nextRank: nextRankInfo, winsToNextLevel: winsToNext, progress: progressValue };
    }, [totalWins]);
    
    const getResultForUser = (game: Game) => {
        if (game.draw) return { text: 'Draw', color: 'text-yellow-400' };
        if (game.winner?.uid === userId) return { text: 'Win', color: 'text-green-400' };
        return { text: 'Loss', color: 'text-red-400' };
    }

    if (loading || !profileData) {
        return <div className="flex justify-center items-center h-full"><Skeleton className="w-full h-[600px]" /></div>
    }
    
    const overallWinRate = () => {
        const totalPlayed = chessStats.played + checkersStats.played;
        if (totalPlayed === 0) return 0;
        const totalNonDraws = totalPlayed - (chessStats.draws + checkersStats.draws);
        if (totalNonDraws === 0) return 0;
        return Math.round(((chessStats.wins + checkersStats.wins) / totalNonDraws) * 100);
    }
    
    const getInitials = () => {
        return `${profileData.firstName.charAt(0)}${profileData.lastName.charAt(0)}`.toUpperCase();
    }

    return (
        <div className="space-y-6">
            <Link href="/dashboard/friends" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Friends & Community</span>
            </Link>

            <Tabs defaultValue="profile">
                <TabsList className="grid w-full grid-cols-2 max-w-lg">
                    <TabsTrigger value="profile"><User className="mr-2"/> Profile</TabsTrigger>
                    <TabsTrigger value="history"><History className="mr-2"/> Game History</TabsTrigger>
                </TabsList>
                <TabsContent value="profile">
                    <Card>
                        <CardContent className="p-6 space-y-6">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <Avatar className="w-24 h-24 border-2 border-primary">
                                    <AvatarImage src={profileData.photoURL} />
                                    <AvatarFallback>{getInitials()}</AvatarFallback>
                                </Avatar>
                                
                                <div className="flex-1 space-y-2 text-center md:text-left">
                                    <h1 className="text-3xl font-bold">{profileData.firstName} {profileData.lastName}</h1>
                                     <div className="flex items-center justify-center md:justify-start gap-4 pt-2 text-sm flex-wrap">
                                        <Badge variant="secondary" className="gap-1.5 text-base py-1 px-3 bg-yellow-400/20 text-yellow-300">
                                            <Star className="w-4 h-4 fill-current"/>
                                            <span className="font-bold">{rank.title}</span>
                                        </Badge>
                                        <Badge variant="secondary" className="text-base py-1 px-3">World Rank: #{worldRank ?? 'N/A'}</Badge>
                                        <Badge variant="secondary" className="text-base py-1 px-3">Win Rate: {overallWinRate().toFixed(0)}%</Badge>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                     <Button asChild><Link href={`/dashboard/chat/${userId}`}><MessageSquare className="mr-2"/> Chat</Link></Button>
                                     {currentUserData?.friends && !currentUserData.friends.includes(userId as string) && (
                                         <Button variant="outline"><UserPlus className="mr-2"/> Add Friend</Button>
                                     )}
                                </div>
                            </div>
                             <div className="mt-4">
                                <Progress value={progress} className="h-2" />
                                <p className="text-xs text-muted-foreground text-right mt-1">
                                    {nextRank ? `${totalWins - rank.minWins} / ${winsToNextLevel} wins to ${nextRank.title}` : `Max rank achieved!`}
                                </p>
                             </div>

                             <div className="space-y-6">
                                <div>
                                    <h3 className="font-semibold flex items-center gap-2 mb-4"><BrainCircuit/> Chess Stats</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <StatCard icon={<Swords/>} label="Played" value={chessStats.played} />
                                        <StatCard icon={<Trophy/>} label="Wins" value={chessStats.wins} />
                                        <StatCard icon={<Ban/>} label="Losses" value={chessStats.losses} />
                                        <StatCard icon={<Handshake/>} label="Draws" value={chessStats.draws} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold flex items-center gap-2 mb-4"><Layers/> Checkers Stats</h3>
                                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <StatCard icon={<Swords/>} label="Played" value={checkersStats.played} />
                                        <StatCard icon={<Trophy/>} label="Wins" value={checkersStats.wins} />
                                        <StatCard icon={<Ban/>} label="Losses" value={checkersStats.losses} />
                                        <StatCard icon={<Handshake/>} label="Draws" value={checkersStats.draws} />
                                    </div>
                                </div>
                             </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="history">
                     <Card>
                        <CardHeader>
                            <CardTitle>Game History</CardTitle>
                            <CardDescription>This player's past multiplayer match results.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Game</TableHead>
                                        <TableHead>Opponent</TableHead>
                                        <TableHead>Result</TableHead>
                                        <TableHead>Wager</TableHead>
                                        <TableHead>Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {gameHistory.length > 0 ? gameHistory.map(game => {
                                        const opponent = game.createdBy.uid === userId ? game.player2 : game.createdBy;
                                        const result = getResultForUser(game);
                                        return (
                                            <TableRow key={game.id}>
                                                <TableCell className="capitalize">{game.gameType}</TableCell>
                                                <TableCell>{opponent?.name || 'Unknown'}</TableCell>
                                                <TableCell><Badge variant={result.text === 'Win' ? 'default' : result.text === 'Loss' ? 'destructive' : 'secondary'}>{result.text}</Badge></TableCell>
                                                <TableCell>LKR {game.wager.toFixed(2)}</TableCell>
                                                <TableCell>{game.createdAt ? format(game.createdAt.toDate(), 'PPp') : 'N/A'}</TableCell>
                                            </TableRow>
                                        )
                                    }) : (
                                        <TableRow><TableCell colSpan={5} className="text-center h-24">No multiplayer games played yet.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
