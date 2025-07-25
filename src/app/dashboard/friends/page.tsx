
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, writeBatch, arrayUnion, arrayRemove, serverTimestamp, addDoc, getDoc, limit, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Mail, MessageSquare, UserMinus, Search, Loader2 } from 'lucide-react';
import Link from 'next/link';

type FriendRequest = {
  id: string;
  fromId: string;
  fromName: string;
  fromAvatar?: string;
  status: 'pending';
};

type UserProfile = {
  uid: string;
  firstName: string;
  lastName: string;
  photoURL?: string;
  email: string;
};

const UserCard = ({ person, onAction, actionType, loading }: { person: UserProfile, onAction: (id: string, name: string) => void, actionType: 'add' | 'remove', loading: boolean }) => (
    <Card className="flex items-center p-4 gap-4">
        <Avatar>
            <AvatarImage src={person.photoURL} data-ai-hint="avatar" />
            <AvatarFallback>{person.firstName?.[0]}{person.lastName?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
            <p className="font-semibold">{person.firstName} {person.lastName}</p>
            <p className="text-xs text-muted-foreground">{person.email}</p>
        </div>
        <div className="flex gap-2">
            {actionType === 'remove' && <Button variant="ghost" size="icon" asChild><Link href={`/chat/${person.uid}`}><MessageSquare /></Link></Button>}
            <Button variant={actionType === 'add' ? 'outline' : 'destructive'} size="icon" onClick={() => onAction(person.uid, `${person.firstName} ${person.lastName}`)} disabled={loading}>
                 {actionType === 'add' ? <UserPlus /> : <UserMinus />}
            </Button>
        </div>
    </Card>
);

const RequestCard = ({ req, onAccept, onDecline, loading }: { req: FriendRequest, onAccept: (reqId: string, fromId: string) => void, onDecline: (reqId: string) => void, loading: boolean }) => (
     <Card className="flex items-center p-4 gap-4">
        <Avatar>
            <AvatarImage src={req.fromAvatar} data-ai-hint="avatar" />
            <AvatarFallback>{req.fromName?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
            <p className="font-semibold">{req.fromName}</p>
            <p className="text-xs text-muted-foreground">Wants to be your friend.</p>
        </div>
        <div className="flex gap-2">
            <Button size="sm" onClick={() => onAccept(req.id, req.fromId)} disabled={loading}>Accept</Button>
            <Button size="sm" variant="destructive" onClick={() => onDecline(req.id)} disabled={loading}>Decline</Button>
        </div>
    </Card>
)

export default function FriendsPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const [friends, setFriends] = useState<UserProfile[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResult, setSearchResult] = useState<UserProfile | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    const fetchFriends = useCallback(async () => {
        if (!userData || !userData.friends || userData.friends.length === 0) {
            setFriends([]);
            return;
        }
        const friendPromises = userData.friends.map(friendId => getDoc(doc(db, 'users', friendId)));
        const friendDocs = await Promise.all(friendPromises);
        const friendData = friendDocs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
        setFriends(friendData);
    }, [userData]);

    const fetchSuggestions = useCallback(async () => {
        if(!user) return;
        const q = query(collection(db, 'users'), where('uid', '!=', user.uid), orderBy('uid'), limit(10));
        const userDocs = await getDocs(q);
        const suggestedUsers = userDocs.docs.map(doc => ({...doc.data(), uid: doc.id} as UserProfile));
        setSuggestions(suggestedUsers.filter(u => !userData?.friends?.includes(u.uid)));
    }, [user, userData?.friends]);
    
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const reqQuery = query(collection(db, 'friend_requests'), where('toId', '==', user.uid), where('status', '==', 'pending'));
        const unsubscribeReqs = onSnapshot(reqQuery, (snapshot) => {
            const reqsData = snapshot.docs.map(doc => ({...doc.data(), id: doc.id } as FriendRequest));
            setRequests(reqsData);
        });
        
        Promise.all([fetchFriends(), fetchSuggestions()]).finally(() => setLoading(false));

        return () => unsubscribeReqs();
    }, [user, fetchFriends, fetchSuggestions]);
    
    const handleAddFriend = async (targetId: string, targetName: string) => {
        if(!user || !userData) return;
        setActionLoading(targetId);
        try {
            // Check if already friends
            if(userData.friends?.includes(targetId)) {
                toast({ variant: 'destructive', title: 'Already Friends', description: `You are already friends with ${targetName}.` });
                return;
            }

            // Check if a request already exists
            const sentReqQuery = query(collection(db, 'friend_requests'), where('fromId', '==', user.uid), where('toId', '==', targetId), where('status', '==', 'pending'));
            const receivedReqQuery = query(collection(db, 'friend_requests'), where('fromId', '==', targetId), where('toId', '==', user.uid), where('status', '==', 'pending'));
            const [sentSnapshot, receivedSnapshot] = await Promise.all([getDocs(sentReqQuery), getDocs(receivedReqQuery)]);
            
            if(!sentSnapshot.empty || !receivedSnapshot.empty) {
                toast({ title: 'Request Pending', description: `A friend request between you and ${targetName} is already pending.` });
                return;
            }

            await addDoc(collection(db, 'friend_requests'), {
                fromId: user.uid,
                fromName: `${userData.firstName} ${userData.lastName}`,
                fromAvatar: userData.photoURL || '',
                toId: targetId,
                status: 'pending',
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Request Sent!', description: `Friend request sent to ${targetName}.` });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not send friend request.' });
        } finally {
            setActionLoading(null);
        }
    }
    
     const handleAcceptRequest = async (requestId: string, fromId: string) => {
        if (!user) return;
        setActionLoading(requestId);
        const batch = writeBatch(db);

        const requestRef = doc(db, 'friend_requests', requestId);
        batch.update(requestRef, { status: 'accepted' });

        const currentUserRef = doc(db, 'users', user.uid);
        batch.update(currentUserRef, { friends: arrayUnion(fromId) });

        const otherUserRef = doc(db, 'users', fromId);
        batch.update(otherUserRef, { friends: arrayUnion(user.uid) });
        
        try {
             await batch.commit();
             toast({ title: "Friend Added!", description: "You are now friends." });
             fetchFriends();
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to accept request.' });
        } finally {
            setActionLoading(null);
        }
    };
    
    const handleDeclineRequest = async (requestId: string) => {
        setActionLoading(requestId);
         const requestRef = doc(db, 'friend_requests', requestId);
         const batch = writeBatch(db);
         batch.update(requestRef, { status: 'declined' });
         try {
             await batch.commit();
             toast({ title: "Request Declined" });
         } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to decline request.' });
         } finally {
             setActionLoading(null);
         }
    };

    const handleRemoveFriend = async (friendId: string, friendName: string) => {
        if(!user) return;
        setActionLoading(friendId);
         const batch = writeBatch(db);

        const currentUserRef = doc(db, 'users', user.uid);
        batch.update(currentUserRef, { friends: arrayRemove(friendId) });

        const otherUserRef = doc(db, 'users', friendId);
        batch.update(otherUserRef, { friends: arrayRemove(user.uid) });

        try {
             await batch.commit();
             toast({ title: "Friend Removed", description: `You are no longer friends with ${friendName}.` });
             fetchFriends();
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove friend.' });
        } finally {
             setActionLoading(null);
        }
    }
    
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!searchEmail.trim()) return;
        setIsSearching(true);
        setSearchResult(null);
        try {
            const q = query(collection(db, 'users'), where('email', '==', searchEmail.trim()));
            const querySnapshot = await getDocs(q);
            if(querySnapshot.empty) {
                toast({ variant: 'destructive', title: 'Not Found', description: 'No user found with that email.' });
            } else {
                const foundUser = querySnapshot.docs[0].data() as UserProfile;
                 if(foundUser.uid === user?.uid) {
                     toast({ variant: 'destructive', title: 'Error', description: "You can't add yourself as a friend."});
                     return;
                 }
                setSearchResult(foundUser);
            }
        } catch(e) {
            console.error(e);
             toast({ variant: 'destructive', title: 'Error', description: 'Could not perform search.' });
        } finally {
            setIsSearching(false);
        }
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3"><Users/> Friends & Community</h1>
                <p className="text-muted-foreground">Manage your friends, pending requests, and find new people to challenge.</p>
            </div>
            
            <Tabs defaultValue="friends" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="friends">My Friends ({friends.length})</TabsTrigger>
                    <TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger>
                    <TabsTrigger value="find">Find People</TabsTrigger>
                </TabsList>
                
                <TabsContent value="friends">
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Friends List</CardTitle>
                            <CardDescription>Your connected friends. Start a chat or challenge them to a game.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {loading ? <p>Loading friends...</p> : friends.length > 0 ? friends.map(friend => (
                               <UserCard key={friend.uid} person={friend} onAction={handleRemoveFriend} actionType="remove" loading={actionLoading === friend.uid} />
                           )) : <p className="text-muted-foreground text-center p-4">You have no friends yet. Go find some!</p>}
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="requests">
                     <Card>
                        <CardHeader>
                            <CardTitle>Pending Requests</CardTitle>
                            <CardDescription>These people want to be your friend.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loading ? <p>Loading requests...</p> : requests.length > 0 ? requests.map(req => (
                               <RequestCard key={req.id} req={req} onAccept={handleAcceptRequest} onDecline={handleDeclineRequest} loading={actionLoading === req.id} />
                           )) : <p className="text-muted-foreground text-center p-4">No pending friend requests.</p>}
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="find">
                     <Card>
                        <CardHeader>
                            <CardTitle>Find New Friends</CardTitle>
                            <CardDescription>Search for players by email or discover them from the suggestions below.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <Input type="email" placeholder="Enter user's email" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} />
                                <Button type="submit" disabled={isSearching}>{isSearching ? <Loader2 className="animate-spin" /> : <Search />}</Button>
                            </form>
                            {searchResult && (
                                <div>
                                    <h3 className="font-semibold mb-2">Search Result</h3>
                                    <UserCard person={searchResult} onAction={handleAddFriend} actionType="add" loading={actionLoading === searchResult.uid} />
                                </div>
                            )}

                            <div>
                                <h3 className="font-semibold mb-2">Suggestions</h3>
                                <div className="space-y-4">
                                     {loading ? <p>Loading suggestions...</p> : suggestions.length > 0 ? suggestions.map(person => (
                                       <UserCard key={person.uid} person={person} onAction={handleAddFriend} actionType="add" loading={actionLoading === person.uid} />
                                   )) : <p className="text-muted-foreground text-center p-4">No suggestions right now. Check back later!</p>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
