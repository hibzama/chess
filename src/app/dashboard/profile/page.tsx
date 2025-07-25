
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, User, History, Shield, Camera, Swords, Trophy, Handshake, Star } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

type GameStats = {
    played: number;
    wins: number;
    losses: number;
    draws: number;
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) => (
    <Card className="bg-card/50 text-center">
        <CardContent className="p-4">
            <div className="mx-auto w-fit p-2 rounded-full bg-primary/10 mb-2 text-primary">{icon}</div>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
        </CardContent>
    </Card>
);


export default function ProfilePage() {
    const { user, userData, loading } = useAuth();
    const [stats, setStats] = useState<{ chess: GameStats, checkers: GameStats }>({
        chess: { played: 0, wins: 0, losses: 0, draws: 0 },
        checkers: { played: 0, wins: 0, losses: 0, draws: 0 },
    });
    const [statsLoading, setStatsLoading] = useState(true);
    
    useEffect(() => {
        if (!user) return;

        const fetchStats = async () => {
            setStatsLoading(true);
            const gamesQuery = query(collection(db, 'game_rooms'), where('players', 'array-contains', user.uid), where('status', '==', 'completed'));
            const gamesSnapshot = await getDocs(gamesQuery);

            const chessStats: GameStats = { played: 0, wins: 0, losses: 0, draws: 0 };
            const checkersStats: GameStats = { played: 0, wins: 0, losses: 0, draws: 0 };

            gamesSnapshot.forEach(doc => {
                const game = doc.data();
                const isWinner = game.winner?.uid === user.uid;

                if (game.gameType === 'chess') {
                    chessStats.played++;
                    if (isWinner) chessStats.wins++;
                    else if (game.draw) chessStats.draws++;
                    else chessStats.losses++;
                } else if (game.gameType === 'checkers') {
                    checkersStats.played++;
                    if (isWinner) checkersStats.wins++;
                    else if (game.draw) checkersStats.draws++;
                    else checkersStats.losses++;
                }
            });
            
            setStats({ chess: chessStats, checkers: checkersStats });
            setStatsLoading(false);
        };

        fetchStats();
    }, [user]);

    const getInitials = () => {
        if (userData) {
            return `${userData.firstName.charAt(0)}${userData.lastName.charAt(0)}`.toUpperCase();
        }
        return '..';
    }

    const rank = {
        name: 'Beginner',
        level: 2,
        winsToNext: 15,
        worldRank: 1,
    }
    const winRate = stats.chess.played > 0 ? Math.round((stats.chess.wins / stats.chess.played) * 100) : 0;
    const progress = Math.round((stats.chess.wins / rank.winsToNext) * 100);

    if(loading) {
        return <Skeleton className="w-full h-[600px]" />
    }

    return (
        <div className="space-y-6">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
            </Link>

            <Tabs defaultValue="profile">
                <TabsList className="grid w-full grid-cols-3 max-w-lg">
                    <TabsTrigger value="profile"><User className="mr-2"/> Profile</TabsTrigger>
                    <TabsTrigger value="history"><History className="mr-2"/> Game History</TabsTrigger>
                    <TabsTrigger value="security"><Shield className="mr-2"/> Security</TabsTrigger>
                </TabsList>
                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <Avatar className="w-24 h-24 border-2 border-primary">
                                        <AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="user avatar" />
                                        <AvatarFallback>{getInitials()}</AvatarFallback>
                                    </Avatar>
                                    <Button size="icon" variant="secondary" className="absolute bottom-0 right-0 rounded-full h-8 w-8">
                                        <Camera className="w-4 h-4"/>
                                    </Button>
                                </div>
                                <div className="space-y-1">
                                    <h1 className="text-3xl font-bold">{userData?.firstName} {userData?.lastName}</h1>
                                    <p className="text-muted-foreground">{userData?.email}</p>
                                    <div className="flex items-center gap-4 pt-2 text-sm">
                                        <div className="flex items-center gap-1 bg-yellow-400/20 text-yellow-300 px-2 py-1 rounded-md">
                                            <Star className="w-4 h-4 fill-current"/>
                                            <span className="font-bold">{rank.name}</span>
                                            <span className="text-xs">Rank Title</span>
                                        </div>
                                        <div className="text-muted-foreground">World Rank: <span className="font-bold text-foreground">#{rank.worldRank}</span></div>
                                        <div className="text-muted-foreground">Win Rate: <span className="font-bold text-foreground">{winRate}%</span></div>
                                    </div>
                                </div>
                            </div>
                             <div className="mt-4">
                                <Progress value={progress} className="h-2" />
                                <p className="text-xs text-muted-foreground text-right mt-1">{stats.chess.wins} / {rank.winsToNext} wins to next level</p>
                             </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <div>
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Swords /> Chess Stats</h2>
                                <div className="grid grid-cols-4 gap-4">
                                    <StatCard icon={<Swords/>} label="Played" value={stats.chess.played} />
                                    <StatCard icon={<Trophy/>} label="Wins" value={stats.chess.wins} />
                                    <StatCard icon={<Shield/>} label="Losses" value={stats.chess.losses} />
                                    <StatCard icon={<Handshake/>} label="Draws" value={stats.chess.draws} />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Layers /> Checkers Stats</h2>
                                <div className="grid grid-cols-4 gap-4">
                                    <StatCard icon={<Swords/>} label="Played" value={stats.checkers.played} />
                                    <StatCard icon={<Trophy/>} label="Wins" value={stats.checkers.wins} />
                                    <StatCard icon={<Shield/>} label="Losses" value={stats.checkers.losses} />
                                    <StatCard icon={<Handshake/>} label="Draws" value={stats.checkers.draws} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="history">
                     <Card>
                        <CardHeader>
                            <CardTitle>Game History</CardTitle>
                            <CardDescription>Your past match results.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-center text-muted-foreground py-8">Game history will be implemented soon.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="security">
                     <Card>
                        <CardHeader>
                            <CardTitle>Security Settings</CardTitle>
                            <CardDescription>Manage your account security.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-center text-muted-foreground py-8">Security settings will be implemented soon.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
