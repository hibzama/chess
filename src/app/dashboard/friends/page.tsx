
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, writeBatch, arrayUnion, arrayRemove, serverTimestamp, addDoc, getDoc, limit, orderBy, deleteDoc, startAt, endAt } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Mail, MessageSquare, UserMinus, Search, Loader2, Send, Check } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

type FriendRequest = {
  id: string;
  fromId: string;
  toId: string;
  toName?: string;
  toAvatar?: string;
  fromName: string;
  fromAvatar?: string;
  status: 'pending' | 'accepted' | 'declined';
};

type UserProfile = {
  uid: string;
  firstName: string;
  lastName: string;
  photoURL?: string;
  email: string;
  status?: 'online' | 'offline';
  lastSeen?: any;
};

const UserCard = ({ person, onAction, actionType, loading, onUserClick }: { person: UserProfile, onAction: (id: string, name: string) => void, actionType: 'add' | 'remove', loading: boolean, onUserClick: (uid: string) => void }) => (
    <Card className="flex items-center p-4 gap-4">
        <button onClick={() => onUserClick(person.uid)} className="relative flex items-center gap-4 text-left flex-grow">
            <Avatar>
                <AvatarImage src={person.photoURL} />
                <AvatarFallback>{person.firstName?.[0]}{person.lastName?.[0]}</AvatarFallback>
            </Avatar>
             {person.status === 'online' && <div className="absolute top-0 left-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full" />}
            <div className="flex-grow">
                <p className="font-semibold">{person.firstName} {person.lastName}</p>
                {person.status === 'online' ? (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">Online</Badge>
                ) : (
                     <p className="text-xs text-muted-foreground">
                        {person.lastSeen ? `Last seen ${formatDistanceToNowStrict(person.lastSeen.toDate(), { addSuffix: true })}` : 'Offline'}
                    </p>
                )}
            </div>
        </button>
        <div className="flex gap-2">
            {actionType === 'remove' && <Button variant="ghost" size="icon" asChild><Link href={`/dashboard/chat/${getChatId(person.uid)}`}><MessageSquare /></Link></Button>}
            <Button variant={actionType === 'add' ? 'outline' : 'destructive'} size="icon" onClick={() => onAction(person.uid, `${person.firstName} ${person.lastName}`)} disabled={loading}>
                    {actionType === 'add' ? <UserPlus /> : <UserMinus />}
            </Button>
        </div>
    </Card>
);

const getChatId = (otherUserId: string) => {
    const currentUserId = "currentUser"; 
    return [currentUserId, otherUserId].sort().join('_');
};


const RequestCard = ({ req, onAccept, onDecline, loading }: { req: FriendRequest, onAccept: (reqId: string, fromId: string, fromName: string) => void, onDecline: (reqId: string) => void, loading: boolean }) => (
     <Card className="flex items-center p-4 gap-4">
        <Avatar>
            <AvatarImage src={req.fromAvatar} />
            <AvatarFallback>{req.fromName?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
            <p className="font-semibold">{req.fromName}</p>
            <p className="text-xs text-muted-foreground">Wants to be your friend.</p>
        </div>
        <div className="flex gap-2">
            <Button size="sm" onClick={() => onAccept(req.id, req.fromId, req.fromName)} disabled={loading}>Accept</Button>
            <Button size="sm" variant="destructive" onClick={() => onDecline(req.id)} disabled={loading}>Decline</Button>
        </div>
    </Card>
)

const SentRequestCard = ({ req, onCancel, loading }: { req: FriendRequest, onCancel: (reqId: string) => void, loading: boolean }) => (
     <Card className="flex items-center p-4 gap-4">
        <Avatar>
            <AvatarImage src={req.toAvatar} />
            <AvatarFallback>{req.toName?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
            <p className="font-semibold">{req.toName}</p>
            <p className="text-xs text-muted-foreground">Request sent.</p>
        </div>
        <Button size="sm" variant="destructive" onClick={() => onCancel(req.id)} disabled={loading}>Cancel</Button>
    </Card>
)


export default function FriendsPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [friends, setFriends] = useState<UserProfile[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
    const [suggestedFriends, setSuggestedFriends] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const sortUsers = (users: UserProfile[]) => {
        return [...users].sort((a,b) => {
            if (a.status === 'online' && b.status !== 'online') return -1;
            if (a.status !== 'online' && b.status === 'online') return 1;
            if (a.lastSeen && b.lastSeen) {
                return b.lastSeen.seconds - a.lastSeen.seconds;
            }
            if (a.lastSeen) return -1;
            if (b.lastSeen) return 1;
            return 0;
        });
    }

    const fetchFriends = useCallback(async () => {
        if (!user) {
            setFriends([]);
            return;
        }
        const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
        const currentFriends = currentUserDoc.data()?.friends || [];
        if (currentFriends.length === 0) {
            setFriends([]);
            return;
        }
        const friendPromises = currentFriends.map((friendId: string) => getDoc(doc(db, 'users', friendId)));
        const friendDocs = await Promise.all(friendPromises);
        const friendData = friendDocs.filter(doc => doc.exists()).map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
        setFriends(sortUsers(friendData));
    }, [user]);
    
    useEffect(() => {
        if (!user || !userData) {
            setLoading(false);
            return;
        }

        const unsubscribes: (() => void)[] = [];

        const setupListeners = async () => {
            setLoading(true);

            await fetchFriends();
            
            const reqQuery = query(collection(db, 'friend_requests'), where('toId', '==', user.uid), where('status', '==', 'pending'));
            const unsubscribeReqs = onSnapshot(reqQuery, (snapshot) => {
                const reqsData = snapshot.docs.map(doc => ({...doc.data(), id: doc.id } as FriendRequest));
                setRequests(reqsData);
            });
            unsubscribes.push(unsubscribeReqs);

            const sentReqQuery = query(collection(db, 'friend_requests'), where('fromId', '==', user.uid), where('status', '==', 'pending'));
            const unsubscribeSentReqs = onSnapshot(sentReqQuery, async (snapshot) => {
                const sentReqsDataPromises = snapshot.docs.map(async (d) => {
                    const req = {...d.data(), id: d.id } as FriendRequest;
                    const toUserDoc = await getDoc(doc(db, 'users', req.toId));
                    if (toUserDoc.exists()) {
                        const toUserData = toUserDoc.data();
                        req.toName = `${toUserData.firstName} ${toUserData.lastName}`;
                        req.toAvatar = toUserData.photoURL;
                    }
                    return req;
                });
                const sentReqsData = await Promise.all(sentReqsDataPromises);
                setSentRequests(sentReqsData);
            });
            unsubscribes.push(unsubscribeSentReqs);
            
             // Fetch suggestions
            const randomId = doc(collection(db, 'users')).id;
            const suggestionsQuery = query(collection(db, 'users'), where('__name__', '>=', randomId), limit(10));
            const suggestionsSnapshot = await getDocs(suggestionsQuery);
            const allFriendIds = new Set([...(userData.friends || []), ...sentRequests.map(r => r.toId), user.uid]);
            const suggestions = suggestionsSnapshot.docs
                .map(d => ({...d.data(), uid: d.id} as UserProfile))
                .filter(u => !allFriendIds.has(u.uid))
                .slice(0, 5);
            setSuggestedFriends(suggestions);


            setLoading(false);
        };

        setupListeners();
        
        return () => {
            unsubscribes.forEach(unsub => unsub());
        };

    }, [user, userData, fetchFriends]);
    
    const handleAddFriend = async (targetId: string, targetName: string) => {
        if(!user || !userData) return;
        setActionLoading(targetId);
        try {
            if(userData.friends?.includes(targetId)) {
                toast({ variant: 'destructive', title: 'Already Friends', description: `You are already friends with ${targetName}.` });
                return;
            }

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

            await addDoc(collection(db, 'notifications'), {
                userId: targetId,
                title: "New Friend Request",
                description: `${userData.firstName} ${userData.lastName} wants to be your friend.`,
                href: '/dashboard/friends',
                createdAt: serverTimestamp(),
                read: false,
            });


            toast({ title: 'Request Sent!', description: `Friend request sent to ${targetName}.` });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not send friend request.' });
        } finally {
            setActionLoading(null);
        }
    }
    
     const handleAcceptRequest = async (requestId: string, fromId: string, fromName: string) => {
        if (!user || !userData) return;
        setActionLoading(requestId);
        const batch = writeBatch(db);

        const requestRef = doc(db, 'friend_requests', requestId);
        batch.delete(requestRef);

        const currentUserRef = doc(db, 'users', user.uid);
        batch.update(currentUserRef, { friends: arrayUnion(fromId) });

        const otherUserRef = doc(db, 'users', fromId);
        batch.update(otherUserRef, { friends: arrayUnion(user.uid) });
        
        try {
             await batch.commit();

             await addDoc(collection(db, 'notifications'), {
                userId: fromId,
                title: "Friend Request Accepted",
                description: `${userData.firstName} ${userData.lastName} accepted your friend request.`,
                href: `/dashboard/chat`,
                createdAt: serverTimestamp(),
                read: false,
            });

             toast({ title: "Friend Added!", description: `You are now friends with ${fromName}.` });
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
         try {
             await deleteDoc(requestRef);
             toast({ title: "Request Declined" });
         } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to decline request.' });
         } finally {
             setActionLoading(null);
         }
    };

    const handleCancelSentRequest = async (requestId: string) => {
        setActionLoading(requestId);
        const requestRef = doc(db, 'friend_requests', requestId);
        try {
            await deleteDoc(requestRef);
            toast({ title: "Request Cancelled" });
        } catch(e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to cancel request.' });
        } finally {
            setActionLoading(null);
        }
    }

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
        if(!searchTerm.trim()) return;
        setIsSearching(true);
        setSearchResults([]);
        try {
            const q = query(
                collection(db, 'users'), 
                orderBy('firstName'), 
                startAt(searchTerm.trim()), 
                endAt(searchTerm.trim() + '\uf8ff')
            );
            const querySnapshot = await getDocs(q);
            if(querySnapshot.empty) {
                toast({ variant: 'destructive', title: 'Not Found', description: 'No user found with that name.' });
            } else {
                const foundUsers = querySnapshot.docs
                    .map(d => ({...d.data(), uid: d.id } as UserProfile))
                    .filter(u => u.uid !== user?.uid);
                setSearchResults(foundUsers);
            }
        } catch(e) {
            console.error(e);
             toast({ variant: 'destructive', title: 'Error', description: 'Could not perform search.' });
        } finally {
            setIsSearching(false);
        }
    }

    const handleUserClick = (uid: string) => {
        router.push(`/dashboard/profile/${uid}`);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3"><Users/> Friends & Community</h1>
                <p className="text-muted-foreground">Manage your friends, pending requests, and find new people to challenge.</p>
            </div>
            
            <Tabs defaultValue="friends" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="friends">My Friends ({friends.length})</TabsTrigger>
                    <TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger>
                    <TabsTrigger value="sent">Sent ({sentRequests.length})</TabsTrigger>
                    <TabsTrigger value="find">Find People</TabsTrigger>
                </TabsList>
                
                <TabsContent value="friends">
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Friends List</CardTitle>
                            <CardDescription>Your connected friends. Click their profile to view stats, or start a chat.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {loading ? <p>Loading friends...</p> : friends.length > 0 ? friends.map(friend => (
                               <UserCard key={friend.uid} person={friend} onAction={handleRemoveFriend} actionType="remove" loading={actionLoading === friend.uid} onUserClick={handleUserClick} />
                           )) : <p className="text-muted-foreground text-center p-4">You have no friends yet. Go find some!</p>}
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="requests">
                     <Card>
                        <CardHeader>
                            <CardTitle>Incoming Requests</CardTitle>
                            <CardDescription>These people want to be your friend.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loading ? <p>Loading requests...</p> : requests.length > 0 ? requests.map(req => (
                               <RequestCard key={req.id} req={req} onAccept={handleAcceptRequest} onDecline={handleDeclineRequest} loading={actionLoading === req.id} />
                           )) : <p className="text-muted-foreground text-center p-4">No incoming friend requests.</p>}
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="sent">
                     <Card>
                        <CardHeader>
                            <CardTitle>Sent Requests</CardTitle>
                            <CardDescription>You've sent friend requests to these people.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loading ? <p>Loading sent requests...</p> : sentRequests.length > 0 ? sentRequests.map(req => (
                               <SentRequestCard key={req.id} req={req} onCancel={handleCancelSentRequest} loading={actionLoading === req.id} />
                           )) : <p className="text-muted-foreground text-center p-4">No pending sent requests.</p>}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="find">
                     <Card>
                        <CardHeader>
                            <CardTitle>Find New Friends</CardTitle>
                            <CardDescription>Search for players by their first name to send them a friend request.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <Input placeholder="Enter player's name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                <Button type="submit" disabled={isSearching}>{isSearching ? <Loader2 className="animate-spin" /> : <Search />}</Button>
                            </form>
                            {searchResults.length > 0 && (
                                <div>
                                    <h3 className="font-semibold mb-2">Search Results</h3>
                                     <div className="space-y-4">
                                        {searchResults.map(res => (
                                             <UserCard key={res.uid} person={res} onAction={handleAddFriend} actionType="add" loading={actionLoading === res.uid} onUserClick={handleUserClick}/>
                                        ))}
                                    </div>
                                </div>
                            )}
                             <div className="space-y-4">
                                <h3 className="font-semibold">Friend Suggestions</h3>
                                {loading ? <p>Loading suggestions...</p> : suggestedFriends.length > 0 ? suggestedFriends.map(friend => (
                                    <UserCard key={friend.uid} person={friend} onAction={handleAddFriend} actionType="add" loading={actionLoading === friend.uid} onUserClick={handleUserClick}/>
                                )) : <p className="text-muted-foreground text-center p-4">No suggestions right now.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
