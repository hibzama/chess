
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, User, History, Shield, Camera, Swords, Trophy, Handshake, Star, Ban, BrainCircuit, Layers, ShieldQuestion } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


type Game = {
    id: string;
    gameType: 'chess' | 'checkers';
    status: 'completed';
    winner?: { uid: string | null, method: string };
    draw?: boolean;
    createdAt: any;
    createdBy: { uid: string, name: string };
    player2?: { uid: string, name: string };
};

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

const boyAvatars = [
    'https://placehold.co/100x100/3b82f6/FFFFFF.png',
    'https://placehold.co/100x100/ef4444/FFFFFF.png',
    'https://placehold.co/100x100/22c55e/FFFFFF.png',
    'https://placehold.co/100x100/eab308/FFFFFF.png',
];

const girlAvatars = [
    'https://placehold.co/100x100/ec4899/FFFFFF.png',
    'https://placehold.co/100x100/8b5cf6/FFFFFF.png',
    'https://placehold.co/100x100/f97316/FFFFFF.png',
    'https://placehold.co/100x100/14b8a6/FFFFFF.png',
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

export default function ProfilePage() {
    const { user, userData, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [gameHistory, setGameHistory] = useState<Game[]>([]);
    const [statsLoading, setStatsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSendingReset, setIsSendingReset] = useState(false);
    const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
    const [worldRank, setWorldRank] = useState<number | null>(null);

    const getInitials = () => {
        if (userData) {
            return `${userData.firstName.charAt(0)}${userData.lastName.charAt(0)}`.toUpperCase();
        }
        return '..';
    }
    
    useEffect(() => {
        if (!user) return;

        const fetchGameData = async () => {
            setStatsLoading(true);
            
            // Fetch game history for the current user
            const gamesQuery = query(
                collection(db, 'game_rooms'), 
                where('players', 'array-contains', user.uid), 
                where('status', '==', 'completed')
            );
            const gamesSnapshot = await getDocs(gamesQuery);

            const history: Game[] = [];
            gamesSnapshot.forEach(doc => {
                history.push({ ...doc.data(), id: doc.id } as Game);
            });
            
            setGameHistory(history.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)));

            // Fetch all users to calculate world rank
            const allUsersSnapshot = await getDocs(collection(db, 'users'));
            const allUsers = allUsersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

            // This is a placeholder for win calculation. A real implementation would fetch wins for each user.
            // For now, we'll sort by who has more documents, which is not accurate.
            // A more robust solution involves storing win counts on the user document itself.
            const sortedUsers = allUsers.sort((a, b) => (b.l1Count || 0) - (a.l1Count || 0)); // Placeholder sorting
            const rank = sortedUsers.findIndex(u => u.uid === user.uid) + 1;
            setWorldRank(rank > 0 ? rank : null);

            setStatsLoading(false);
        };

        fetchGameData();
    }, [user]);

    const { chess: chessStats, checkers: checkersStats, totalWins } = useMemo(() => {
        const stats: { chess: GameStats, checkers: GameStats, totalWins: number } = {
            chess: { played: 0, wins: 0, losses: 0, draws: 0, winRate: 0 },
            checkers: { played: 0, wins: 0, losses: 0, draws: 0, winRate: 0 },
            totalWins: 0,
        };

        if (!user) return stats;

        gameHistory.forEach(game => {
            const statType = game.gameType;
            if (!statType || !stats[statType]) return;

            let result: 'win' | 'loss' | 'draw' = 'loss';
            if (game.draw) {
                result = 'draw';
            } else if (game.winner?.uid === user.uid) {
                result = 'win';
            }

            stats[statType].played++;
            if (result === 'win') {
                stats[statType].wins++;
                stats.totalWins++;
            } else if (result === 'loss') {
                stats[statType].losses++;
            } else {
                stats[statType].draws++;
            }
        });

        if (stats.chess.played > 0) {
            stats.chess.winRate = Math.round((stats.chess.wins / stats.chess.played) * 100);
        }
        if (stats.checkers.played > 0) {
            stats.checkers.winRate = Math.round((stats.checkers.wins / stats.checkers.played) * 100);
        }

        return stats;
    }, [gameHistory, user]);
    
    const { rank, nextRank, winsToNextLevel, progress } = useMemo(() => {
        const currentRankIndex = ranks.slice().reverse().findIndex(r => totalWins >= r.minWins) ?? (ranks.length - 1);
        const rank = ranks[ranks.length - 1 - currentRankIndex];
        const nextRank = ranks[ranks.length - currentRankIndex] || null;
        const winsInLevel = totalWins - rank.minWins;
        const winsToNext = nextRank ? nextRank.minWins - rank.minWins : 0;
        const progress = winsToNext > 0 ? Math.round((winsInLevel / winsToNext) * 100) : 100;

        return { rank, nextRank, winsToNextLevel: winsToNext, progress };
    }, [totalWins]);

    const handleAvatarSave = async () => {
        if (!selectedAvatar || !user) return;

        setIsSaving(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { photoURL: selectedAvatar });
            
            toast({ title: "Success", description: "Avatar updated successfully." });
            setIsAvatarDialogOpen(false);
        } catch (error) {
            console.error("Avatar update failed:", error);
            toast({ variant: 'destructive', title: "Update Failed", description: "Could not update your avatar." });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handlePasswordReset = async () => {
        if (!user?.email) {
            toast({ variant: 'destructive', title: "Error", description: "No email address found for this user." });
            return;
        };
        setIsSendingReset(true);
        try {
            await sendPasswordResetEmail(auth, user.email);
            toast({ title: "Email Sent", description: "A password reset link has been sent to your email address." });
        } catch (error) {
            console.error("Password reset failed:", error);
            toast({ variant: 'destructive', title: "Error", description: "Failed to send password reset email." });
        } finally {
            setIsSendingReset(false);
        }
    }
    
    const getResultForUser = (game: Game) => {
        if (game.draw) return { text: 'Draw', color: 'text-yellow-400' };
        if (game.winner?.uid === user?.uid) return { text: 'Win', color: 'text-green-400' };
        return { text: 'Loss', color: 'text-red-400' };
    }

    if (authLoading || statsLoading) {
        return <Skeleton className="w-full h-[600px]" />
    }

    const overallWinRate = () => {
        const rates = [];
        if (chessStats?.winRate > 0) rates.push(chessStats.winRate);
        if (checkersStats?.winRate > 0) rates.push(checkersStats.winRate);
        if (rates.length === 0) return 0;
        return rates.reduce((a, b) => a + b, 0) / rates.length;
    };

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
                        <CardContent className="p-6 space-y-6">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <AlertDialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
                                    <AlertDialogTrigger asChild>
                                        <div className="relative cursor-pointer">
                                            <Avatar className="w-24 h-24 border-2 border-primary">
                                                <AvatarImage src={userData?.photoURL} data-ai-hint="user avatar" />
                                                <AvatarFallback>{getInitials()}</AvatarFallback>
                                            </Avatar>
                                            <div className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-secondary flex items-center justify-center">
                                                <Camera className="w-4 h-4"/>
                                            </div>
                                        </div>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Choose your Avatar</AlertDialogTitle>
                                            <AlertDialogDescription>Select an icon to represent you on the platform.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="font-semibold mb-2">Boy Avatars</h4>
                                                <div className="grid grid-cols-4 gap-4">
                                                    {boyAvatars.map((url, i) => (
                                                        <button key={`boy-${i}`} onClick={() => setSelectedAvatar(url)} className={cn('rounded-full border-2', selectedAvatar === url ? 'border-primary ring-2 ring-primary' : 'border-transparent')}>
                                                            <Avatar className="w-16 h-16"><AvatarImage src={url} data-ai-hint={`boy avatar ${i + 1}`} /></Avatar>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold mb-2">Girl Avatars</h4>
                                                 <div className="grid grid-cols-4 gap-4">
                                                    {girlAvatars.map((url, i) => (
                                                        <button key={`girl-${i}`} onClick={() => setSelectedAvatar(url)} className={cn('rounded-full border-2', selectedAvatar === url ? 'border-primary ring-2 ring-primary' : 'border-transparent')}>
                                                            <Avatar className="w-16 h-16"><AvatarImage src={url} data-ai-hint={`girl avatar ${i + 1}`} /></Avatar>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleAvatarSave} disabled={isSaving || !selectedAvatar}>
                                                {isSaving ? "Saving..." : "Save Avatar"}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <div className="flex-1 space-y-2 text-center md:text-left">
                                    <h1 className="text-3xl font-bold">{userData?.firstName} {userData?.lastName}</h1>
                                    <p className="text-muted-foreground">{userData?.email}</p>
                                    <div className="flex items-center justify-center md:justify-start gap-4 pt-2 text-sm flex-wrap">
                                        <Badge variant="secondary" className="gap-1.5 text-base py-1 px-3 bg-yellow-400/20 text-yellow-300">
                                            <Star className="w-4 h-4 fill-current"/>
                                            <span className="font-bold">{rank.title}</span>
                                            <span className="text-xs">Rank Title</span>
                                        </Badge>
                                        <Badge variant="secondary" className="text-base py-1 px-3">World Rank: #{worldRank ?? 'N/A'}</Badge>
                                        <Badge variant="secondary" className="text-base py-1 px-3">Win Rate: {overallWinRate().toFixed(0)}%</Badge>
                                    </div>
                                </div>
                            </div>
                             <div className="mt-4">
                                <Progress value={progress} className="h-2" />
                                <p className="text-xs text-muted-foreground text-right mt-1">
                                    {nextRank ? `${totalWins - rank.minWins} / ${winsToNextLevel} wins to next level` : `Max rank achieved!`}
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
                            <CardDescription>Your past multiplayer match results.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Game</TableHead>
                                        <TableHead>Opponent</TableHead>
                                        <TableHead>Result</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {gameHistory.length > 0 ? gameHistory.map(game => {
                                        const opponent = game.createdBy.uid === user?.uid ? game.player2 : game.createdBy;
                                        const result = getResultForUser(game);
                                        return (
                                            <TableRow key={game.id}>
                                                <TableCell className="capitalize">{game.gameType}</TableCell>
                                                <TableCell>{opponent?.name || 'Unknown'}</TableCell>
                                                <TableCell><Badge variant={result.text === 'Win' ? 'default' : result.text === 'Loss' ? 'destructive' : 'secondary'}>{result.text}</Badge></TableCell>
                                                <TableCell className="capitalize">{game.winner?.method || 'N/A'}</TableCell>
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
                <TabsContent value="security">
                     <Card>
                        <CardHeader>
                            <CardTitle>Security Settings</CardTitle>
                            <CardDescription>Manage your account security options.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Card className="bg-card/30">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2"><ShieldQuestion/> Password Reset</CardTitle>
                                    <CardDescription>If you wish to change your password, we can send a reset link to your registered email address.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button onClick={handlePasswordReset} disabled={isSendingReset}>
                                        {isSendingReset ? "Sending..." : "Send Password Reset Email"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}



    