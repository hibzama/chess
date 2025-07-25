
'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, where, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Trophy, Star, ShieldCheck, UserPlus, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type RankedUser = {
    uid: string;
    firstName: string;
    lastName: string;
    photoURL?: string;
    wins: number;
    rankTitle: string;
    friendStatus: 'friends' | 'pending' | 'not_friends';
};

const ranks = [
    { title: "Beginner", minWins: 0 }, { title: "Novice", minWins: 48 },
    { title: "Apprentice", minWins: 211 }, { title: "Journeyman", minWins: 553 },
    { title: "Strategist", minWins: 1182 }, { title: "Expert", minWins: 3506 },
    { title: "Master", minWins: 7725 }, { title: "Grandmaster", minWins: 14797 },
    { title: "Legend", minWins: 43680 }, { title: "Immortal", minWins: 91444 },
];

const getRankTitle = (wins: number) => {
    return ranks.slice().reverse().find(r => wins >= r.minWins)?.title || "Beginner";
}

export default function RankingsPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const [leaderboard, setLeaderboard] = useState<RankedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            const usersRef = collection(db, 'users');
            const q = query(usersRef, orderBy('wins', 'desc'), limit(100));
            const userDocs = await getDocs(q);

            let rankedUsers: RankedUser[] = [];
            
            if (user) {
                const sentReqQuery = query(collection(db, 'friend_requests'), where('fromId', '==', user.uid), where('status', '==', 'pending'));
                const sentReqSnapshot = await getDocs(sentReqQuery);
                const pendingRequests = new Set(sentReqSnapshot.docs.map(d => d.data().toId));

                 rankedUsers = userDocs.docs.map(doc => {
                    const data = doc.data();
                    let friendStatus: RankedUser['friendStatus'] = 'not_friends';
                    if (userData?.friends?.includes(doc.id)) {
                        friendStatus = 'friends';
                    } else if (pendingRequests.has(doc.id)) {
                        friendStatus = 'pending';
                    }
                    
                    return {
                        uid: doc.id,
                        firstName: data.firstName,
                        lastName: data.lastName,
                        photoURL: data.photoURL,
                        wins: data.wins || 0,
                        rankTitle: getRankTitle(data.wins || 0),
                        friendStatus,
                    };
                });
            } else {
                 rankedUsers = userDocs.docs.map(doc => {
                    const data = doc.data();
                    return {
                        uid: doc.id, firstName: data.firstName, lastName: data.lastName, photoURL: data.photoURL,
                        wins: data.wins || 0, rankTitle: getRankTitle(data.wins || 0), friendStatus: 'not_friends',
                    };
                });
            }

            setLeaderboard(rankedUsers);
            setLoading(false);
        };
        fetchLeaderboard();
    }, [user, userData]);

     const handleAddFriend = async (targetUser: RankedUser) => {
        if(!user || !userData) {
            toast({ variant: 'destructive', title: 'Login Required', description: 'You must be logged in to add friends.' });
            return;
        }
        setActionLoading(targetUser.uid);
        try {
            await addDoc(collection(db, 'friend_requests'), {
                fromId: user.uid, fromName: `${userData.firstName} ${userData.lastName}`,
                fromAvatar: userData.photoURL || '', toId: targetUser.uid,
                status: 'pending', createdAt: serverTimestamp(),
            });
            toast({ title: 'Request Sent!', description: `Friend request sent to ${targetUser.firstName}.` });
            setLeaderboard(prev => prev.map(u => u.uid === targetUser.uid ? {...u, friendStatus: 'pending'} : u));
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not send friend request.' });
        } finally {
            setActionLoading(null);
        }
    }


    const topThree = leaderboard.slice(0, 3);
    const restOfLeaderboard = leaderboard.slice(3);

    const getPodiumCardClass = (index: number) => {
        switch(index) {
            case 0: return 'bg-yellow-400/20 border-yellow-400 shadow-lg shadow-yellow-400/10';
            case 1: return 'bg-slate-400/20 border-slate-400';
            case 2: return 'bg-orange-400/20 border-orange-400';
            default: return '';
        }
    }


    return (
        <div className="space-y-8">
            <div className="text-center">
                 <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10">
                        <Trophy className="w-10 h-10 text-primary" />
                    </div>
                </div>
                <h1 className="text-4xl font-bold tracking-tight">Global Leaderboard</h1>
                <p className="text-muted-foreground mt-2">See how you stack up against the best players in the world. Rankings are based on total wins.</p>
            </div>

            {loading ? <Skeleton className="h-48 w-full" /> : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {topThree.map((player, index) => (
                    <Card key={player.uid} className={cn("text-center p-6 flex flex-col items-center", getPodiumCardClass(index))}>
                         <Avatar className="w-20 h-20 mb-4 border-2 border-primary">
                            <AvatarImage src={player.photoURL} />
                            <AvatarFallback>{player.firstName?.[0]}{player.lastName?.[0]}</AvatarFallback>
                        </Avatar>
                        <h3 className="font-bold text-lg">{player.firstName} {player.lastName}</h3>
                        <p className="text-sm text-muted-foreground">{player.rankTitle}</p>
                        <Badge className="mt-2 text-base" variant="secondary">{player.wins} Wins</Badge>
                    </Card>
                ))}
            </div>
            )}
            
            <Card>
                <CardHeader><CardTitle>Top 100 Players</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Rank</TableHead>
                                <TableHead>Player</TableHead>
                                <TableHead>Rank Title</TableHead>
                                <TableHead>Wins</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? [...Array(10)].map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full"/></TableCell></TableRow>
                            )) : restOfLeaderboard.map((player, index) => (
                                <TableRow key={player.uid}>
                                    <TableCell className="font-bold">{index + 4}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-8 h-8">
                                                <AvatarImage src={player.photoURL} />
                                                <AvatarFallback>{player.firstName?.[0]}{player.lastName?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <span>{player.firstName} {player.lastName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell><Badge variant="outline" className="gap-1"><Star className="w-3 h-3"/> {player.rankTitle}</Badge></TableCell>
                                    <TableCell>{player.wins}</TableCell>
                                    <TableCell className="text-right">
                                        {player.uid !== user?.uid && (
                                             player.friendStatus === 'not_friends' ? (
                                                <Button size="sm" onClick={() => handleAddFriend(player)} disabled={actionLoading === player.uid}>
                                                    <UserPlus className="w-4 h-4 mr-2"/> Add Friend
                                                </Button>
                                            ) : player.friendStatus === 'pending' ? (
                                                <Button size="sm" variant="ghost" disabled>Request Sent</Button>
                                            ) : (
                                                 <Button size="sm" variant="secondary" disabled>
                                                    <Check className="w-4 h-4 mr-2"/> Friends
                                                </Button>
                                            )
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
