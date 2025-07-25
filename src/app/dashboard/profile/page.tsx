
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { db, storage } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, User, History, Shield, Camera, Swords, Trophy, Handshake, Star, Upload } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

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
    const { user, userData, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [totalWins, setTotalWins] = useState(0);
    const [gameHistory, setGameHistory] = useState<Game[]>([]);
    const [statsLoading, setStatsLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

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
                if (game.winner?.uid === user.uid) {
                    wins++;
                }
                history.push(game);
            });
            
            setTotalWins(wins);
            setGameHistory(history.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds));
            setStatsLoading(false);
        };

        fetchGameData();
    }, [user]);

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        setIsUploading(true);
        try {
            const avatarRef = ref(storage, `avatars/${user.uid}/${file.name}`);
            await uploadBytes(avatarRef, file);
            const downloadURL = await getDownloadURL(avatarRef);

            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { photoURL: downloadURL });
            
            toast({ title: "Success", description: "Avatar updated successfully." });
        } catch (error) {
            console.error("Avatar upload failed:", error);
            toast({ variant: 'destructive', title: "Upload Failed", description: "Could not upload your avatar." });
        } finally {
            setIsUploading(false);
        }
    };

    const { rank, nextRank, progress, level } = useMemo(() => {
        const currentRankIndex = ranks.slice().reverse().findIndex(r => totalWins >= r.minWins) ?? (ranks.length - 1);
        const rank = ranks[ranks.length - 1 - currentRankIndex];
        const nextRank = ranks[ranks.length - currentRankIndex] || null;
        const winsInLevel = totalWins - rank.minWins;
        const winsToNext = nextRank ? nextRank.minWins - rank.minWins : 0;
        const progress = winsToNext > 0 ? Math.round((winsInLevel / winsToNext) * 100) : 100;

        return { rank, nextRank, progress, level: rank.level };
    }, [totalWins]);
    
    const getResultForUser = (game: Game) => {
        if (game.draw) return { text: 'Draw', color: 'text-yellow-400' };
        if (game.winner?.uid === user?.uid) return { text: 'Win', color: 'text-green-400' };
        return { text: 'Loss', color: 'text-red-400' };
    }

    if (authLoading || statsLoading) {
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
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="relative">
                                    <Avatar className="w-24 h-24 border-2 border-primary">
                                        <AvatarImage src={userData?.photoURL} data-ai-hint="user avatar" />
                                        <AvatarFallback>{getInitials()}</AvatarFallback>
                                    </Avatar>
                                     <Button size="icon" variant="secondary" className="absolute bottom-0 right-0 rounded-full h-8 w-8" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                        {isUploading ? <Upload className="w-4 h-4 animate-pulse"/> : <Camera className="w-4 h-4"/>}
                                        <span className="sr-only">Change Avatar</span>
                                    </Button>
                                    <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
                                </div>
                                <div className="space-y-1 text-center md:text-left">
                                    <h1 className="text-3xl font-bold">{userData?.firstName} {userData?.lastName}</h1>
                                    <p className="text-muted-foreground">{userData?.email}</p>
                                    <div className="flex items-center justify-center md:justify-start gap-4 pt-2 text-sm">
                                        <div className="flex items-center gap-1 bg-yellow-400/20 text-yellow-300 px-2 py-1 rounded-md">
                                            <Star className="w-4 h-4 fill-current"/>
                                            <span className="font-bold">{rank.title}</span>
                                            <span className="text-xs">(Level {level})</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                             <div className="mt-4">
                                <Progress value={progress} className="h-2" />
                                <p className="text-xs text-muted-foreground text-right mt-1">
                                    {nextRank ? `${totalWins} / ${nextRank.minWins} wins to next rank (${nextRank.title})` : `Max rank achieved!`}
                                </p>
                             </div>
                        </CardHeader>
                        <CardContent>
                             <Card className="bg-card/30">
                                 <CardHeader><CardTitle className="text-lg">Global Standing</CardTitle></CardHeader>
                                 <CardContent className="grid grid-cols-2 gap-4">
                                     <div className="text-center p-4 rounded-lg bg-background">
                                        <p className="text-4xl font-bold">{totalWins}</p>
                                        <p className="text-muted-foreground">Total Wins</p>
                                     </div>
                                      <div className="text-center p-4 rounded-lg bg-background">
                                        <p className="text-4xl font-bold">#1</p>
                                        <p className="text-muted-foreground">World Rank</p>
                                     </div>
                                 </CardContent>
                             </Card>
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
                                                <TableCell>{format(game.createdAt.toDate(), 'PPp')}</TableCell>
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
