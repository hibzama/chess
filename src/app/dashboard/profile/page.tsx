
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, getCountFromServer } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, User, History, Shield, Camera, Swords, Trophy, Handshake, Star, Ban, BrainCircuit, Layers, ShieldQuestion, Users } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { renderToString } from 'react-dom/server';


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

const BoyAvatar1 = () => <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g><circle cx="50" cy="50" r="45" fill="#fef3c7"/><path d="M25,80 C25,60 75,60 75,80 L75,95 L25,95 Z" fill="#fca5a5"/><path d="M25,80 L75,80" stroke="#f97316" strokeWidth="10"/><path d="M25,70 L75,70" stroke="#fcd34d" strokeWidth="10"/><path d="M35 30 C 40 20, 60 20, 65 30" stroke="#a16207" strokeWidth="4" fill="none"/><circle cx="40" cy="45" r="3" fill="#000"/><circle cx="60" cy="45" r="3" fill="#000"/><rect x="35" y="42" width="30" height="6" rx="3" stroke="#000" strokeWidth="1" fill="none"/><path d="M40,60 C45,65 55,65 60,60" stroke="#000" strokeWidth="2" fill="none"/></g></svg>;
const BoyAvatar2 = () => <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g><circle cx="50" cy="50" r="45" fill="#f3e8ff"/><path d="M25,80 C25,60 75,60 75,80 L75,95 L25,95 Z" fill="#c084fc"/><path d="M35 30 C 40 15, 60 15, 65 30" stroke="#1e293b" strokeWidth="5" fill="none"/><circle cx="40" cy="45" r="3" fill="#1e293b"/><circle cx="60" cy="45" r="3" fill="#1e293b"/><path d="M45,60 C50,62 55,62 55,60" stroke="#1e293b" strokeWidth="2" fill="none"/></g></svg>;
const BoyAvatar3 = () => <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g><circle cx="50" cy="50" r="45" fill="#f0fdf4"/><path d="M25,80 C25,60 75,60 75,80 L75,95 L25,95 Z" fill="#166534"/><path d="M40,80 L60,80 L60,65 L40,65 Z" fill="#fff"/><path d="M35 30 C 40 15, 60 15, 65 30" stroke="#1e293b" strokeWidth="5" fill="none"/><circle cx="40" cy="45" r="3" fill="#1e293b"/><circle cx="60" cy="45" r="3" fill="#1e293b"/><path d="M45,60 C50,62 55,62 55,60" stroke="#1e293b" strokeWidth="2" fill="none"/></g></svg>;
const BoyAvatar4 = () => <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g><circle cx="50" cy="50" r="45" fill="#e7e5e4"/><path d="M25,80 C25,60 75,60 75,80 L75,95 L25,95 Z" fill="#78716c"/><path d="M30 35 C 35 25, 65 25, 70 35" stroke="#f1f5f9" strokeWidth="5" fill="none"/><path d="M30,55 C40,75 60,75 70,55 L70,60 C60,85 40,85 30,60 Z" fill="#f1f5f9"/><circle cx="40" cy="45" r="3" fill="#1e293b"/><circle cx="60" cy="45" r="3" fill="#1e293b"/><path d="M45,60 C50,62 55,62 55,60" stroke="#1e293b" strokeWidth="2" fill="none"/></g></svg>;

const GirlAvatar1 = () => <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g><circle cx="50" cy="50" r="45" fill="#eff6ff"/><path d="M25,80 C25,60 75,60 75,80 L75,95 L25,95 Z" fill="#60a5fa"/><path d="M15 35 C 25 10, 75 10, 85 35 L50,35 Z" fill="#1e293b"/><circle cx="40" cy="45" r="3" fill="#1e293b"/><circle cx="60" cy="45" r="3" fill="#1e293b"/><path d="M45,60 C50,65 55,65 55,60" stroke="#1e293b" strokeWidth="2" fill="none"/><path d="M35 85 Q 40 80 45 85" stroke="#fff" strokeWidth="2" fill="none"/><path d="M55 85 Q 60 80 65 85" stroke="#fff" strokeWidth="2" fill="none"/><path d="M45 90 Q 50 85 55 90" stroke="#fff" strokeWidth="2" fill="none"/></g></svg>;
const GirlAvatar2 = () => <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g><circle cx="50" cy="50" r="45" fill="#f1f5f9"/><path d="M25,80 C25,60 75,60 75,80 L75,95 L25,95 Z" fill="#94a3b8"/><path d="M15 35 C 25 10, 75 10, 85 35 L50,35 Z" fill="#1e293b"/><circle cx="40" cy="45" r="3" fill="#1e293b"/><circle cx="60" cy="45" r="3" fill="#1e293b"/><path d="M45,60 C50,65 55,65 55,60" stroke="#1e293b" strokeWidth="2" fill="none"/></g></svg>;
const GirlAvatar3 = () => <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g><circle cx="50" cy="50" r="45" fill="#ede9fe"/><path d="M25,80 C25,60 75,60 75,80 L75,95 L25,95 Z" fill="#a78bfa"/><path d="M15 35 C 25 10, 75 10, 85 35 L50,35 Z" fill="#1e293b"/><circle cx="40" cy="45" r="3" fill="#1e293b"/><circle cx="60" cy="45" r="3" fill="#1e293b"/><path d="M45,60 C50,65 55,65 55,60" stroke="#1e293b" strokeWidth="2" fill="none"/><circle cx="28" cy="60" r="3" fill="#fcd34d"/><circle cx="72" cy="60" r="3" fill="#fcd34d"/></g></svg>;
const GirlAvatar4 = () => <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1, 1) translate(0, 0)"><circle cx="50" cy="50" r="45" fill="#f3e8ff"/><path d="M35 75 C 35 60 45 60 45 75 L 45 95 L 35 95 Z" fill="#c084fc"/><path d="M65 75 C 65 60 55 60 55 75 L 55 95 L 65 95 Z" fill="#c084fc"/><path d="M30 40 C 20 10, 50 10, 50 40 L50 20 C 70 10, 90 25, 80 50 C 95 60, 90 80, 75 75" fill="#1e293b"/><circle cx="45" cy="50" r="3" fill="#1e293b"/><path d="M35,60 C40,62 45,62 45,60" stroke="#1e293b" strokeWidth="2" fill="none"/></g></svg>;

const boyAvatars = [BoyAvatar1, BoyAvatar2, BoyAvatar3, BoyAvatar4];
const girlAvatars = [GirlAvatar1, GirlAvatar2, GirlAvatar3, GirlAvatar4];


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
    const { user, userData, loading: authLoading, setUserData } = useAuth();
    const { toast } = useToast();
    const [gameHistory, setGameHistory] = useState<Game[]>([]);
    const [statsLoading, setStatsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSendingReset, setIsSendingReset] = useState(false);
    const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState<React.FC | null>(null);
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
            
            const gamesQuery = query(
                collection(db, 'game_rooms'), 
                where('players', 'array-contains', user.uid), 
                where('status', '==', 'completed')
            );
            const gamesSnapshot = await getDocs(gamesQuery);

            let wins = 0;
            const history: Game[] = [];
            gamesSnapshot.forEach(doc => {
                const game = { ...doc.data(), id: doc.id } as Game;
                if (!game.draw && game.winner?.uid === user.uid) {
                    wins++;
                }
                history.push(game);
            });
            
            setGameHistory(history.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)));

            const allUsersCollection = collection(db, 'users');
            const allUsersSnapshot = await getDocs(allUsersCollection);
            const allUsers = allUsersSnapshot.docs.map(doc => {
                const data = doc.data();
                const totalWins = data.wins || 0; // Assuming 'wins' is a field on the user doc
                return { uid: doc.id, wins: totalWins };
            });

            allUsers.sort((a, b) => b.wins - a.wins);
            const rank = allUsers.findIndex(u => u.uid === user.uid) + 1;
            setWorldRank(rank > 0 ? rank : null);

            // Update user's win count in firestore if it's different
            if(userData?.wins !== wins) {
                await updateDoc(doc(db, 'users', user.uid), { wins });
            }

            setStatsLoading(false);
        };

        fetchGameData();
    }, [user, userData]);

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
            stats.chess.winRate = Math.round((stats.chess.wins / (stats.chess.played - stats.chess.draws)) * 100) || 0;
        }
        if (stats.checkers.played > 0) {
            stats.checkers.winRate = Math.round((stats.checkers.wins / (stats.checkers.played - stats.checkers.draws)) * 100) || 0;
        }

        return stats;
    }, [gameHistory, user]);
    
    const { rank, nextRank, winsToNextLevel, progress } = useMemo(() => {
        const currentRankIndex = ranks.slice().reverse().findIndex(r => totalWins >= r.minWins) ?? (ranks.length - 1);
        const rank = ranks[ranks.length - 1 - currentRankIndex];
        const nextRank = ranks[ranks.length - currentRankIndex] || null;
        const winsInLevel = totalWins - rank.minWins;
        const winsToNext = nextRank ? nextRank.minWins - rank.minWins : 0;
        const progressValue = winsToNext > 0 ? Math.round((winsInLevel / winsToNext) * 100) : 100;

        return { rank, nextRank, winsToNextLevel: winsToNext, progress: progressValue };
    }, [totalWins]);

    const handleAvatarSave = async () => {
        if (!selectedAvatar || !user || !userData) return;

        setIsSaving(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const svgString = renderToString(React.createElement(selectedAvatar));
            const dataUri = `data:image/svg+xml;base64,${btoa(svgString)}`;
            
            await updateDoc(userDocRef, { photoURL: dataUri });
            
            // Manually update local state to reflect change immediately
            setUserData({ ...userData, photoURL: dataUri });

            toast({ title: "Success", description: "Avatar updated successfully." });
            setIsAvatarDialogOpen(false);
            setSelectedAvatar(null);
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
            toast({ title: "Email Sent", description: "A password reset link has been sent to your registered email address." });
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
        const totalPlayed = chessStats.played + checkersStats.played;
        if (totalPlayed === 0) return 0;
        const totalNonDraws = totalPlayed - (chessStats.draws + checkersStats.draws);
        if (totalNonDraws === 0) return 0;
        return Math.round((totalWins / totalNonDraws) * 100);
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
                        <CardContent className="p-6 space-y-6">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <AlertDialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
                                    <AlertDialogTrigger asChild>
                                        <div className="relative cursor-pointer">
                                            <Avatar className="w-24 h-24 border-2 border-primary">
                                                <AvatarImage src={userData?.photoURL} />
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
                                                    {boyAvatars.map((AvatarComponent, i) => (
                                                        <button key={`boy-${i}`} onClick={() => setSelectedAvatar(() => AvatarComponent)} className={cn('rounded-full border-2 p-1 aspect-square', selectedAvatar === AvatarComponent ? 'border-primary ring-2 ring-primary' : 'border-transparent')}>
                                                             <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                                                                <AvatarComponent/>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold mb-2">Girl Avatars</h4>
                                                 <div className="grid grid-cols-4 gap-4">
                                                    {girlAvatars.map((AvatarComponent, i) => (
                                                        <button key={`girl-${i}`} onClick={() => setSelectedAvatar(() => AvatarComponent)} className={cn('rounded-full border-2 p-1 aspect-square', selectedAvatar === AvatarComponent ? 'border-primary ring-2 ring-primary' : 'border-transparent')}>
                                                            <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                                                                <AvatarComponent/>
                                                            </div>
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
                                        <Badge variant="secondary" className="text-base py-1 px-3 flex items-center gap-1.5"><Users className="w-4 h-4" /> Friends: {userData?.friends?.length || 0}</Badge>
                                    </div>
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
