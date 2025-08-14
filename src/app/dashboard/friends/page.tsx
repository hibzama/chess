
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, writeBatch, arrayUnion, arrayRemove, serverTimestamp, addDoc, getDoc, limit, orderBy, deleteDoc } from 'firebase/firestore';
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
import type { User } from 'firebase/auth';

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

const getChatId = (uid1: string, uid2: string) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};

const UserCard = ({ currentUser, person, onAction, actionType, loading, onUserClick }: { currentUser: User, person: UserProfile, onAction: (person: UserProfile) => void, actionType: 'add' | 'remove' | 'suggestion', loading: boolean, onUserClick: (uid: string) => void }) => (
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
            {actionType === 'remove' && <Button variant="ghost" size="icon" asChild><Link href={`/dashboard/chat/${getChatId(currentUser.uid, person.uid)}`}><MessageSquare /></Link></Button>}
            {actionType !== 'suggestion' && 
                <Button variant={actionType === 'add' ? 'outline' : 'destructive'} size="icon" onClick={() => onAction(person)} disabled={loading}>
                     {actionType === 'add' ? <UserPlus /> : <UserMinus />}
                </Button>
            }
             {actionType === 'suggestion' && 
                <Button variant="outline" size="icon" onClick={() => onAction(person)} disabled={loading}>
                    <UserPlus />
                </Button>
            }
        </div>
    </Card>
);

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
    const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResult, setSearchResult] = useState<UserProfile | null>(null);
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
            
            // Received Requests Listener
            const reqQuery = query(collection(db, 'friend_requests'), where('toId', '==', user.uid), where('status', '==', 'pending'));
            const unsubscribeReqs = onSnapshot(reqQuery, (snapshot) => {
                const reqsData = snapshot.docs.map(doc => ({...doc.data(), id: doc.id } as FriendRequest));
                setRequests(reqsData);
            });
            unsubscribes.push(unsubscribeReqs);

            // Sent Requests Listener
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
            
             // Suggestions listener
             const usersQuery = query(collection(db, 'users'), limit(100));
             const unsubscribeUsers = onSnapshot(usersQuery, (usersSnapshot) => {
                 const allUsers = usersSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
                 
                 // We need to know who NOT to suggest
                 const friendIds = userData?.friends || [];
                 const sentRequestIds = sentRequests.map(req => req.toId);
                 const receivedRequestIds = requests.map(req => req.fromId);
                 const excludeIds = [user.uid, ...friendIds, ...sentRequestIds, ...receivedRequestIds];
                 
                 const suggestedUsers = allUsers.filter(u => !excludeIds.includes(u.uid));
                 setSuggestions(sortUsers(suggestedUsers));
             });
             unsubscribes.push(unsubscribeUsers);

            setLoading(false);
        };

        setupListeners();
        
        return () => {
            unsubscribes.forEach(unsub => unsub());
        };

    }, [user, userData, fetchFriends]);
    
    const handleAddFriend = async (targetUser: UserProfile) => {
        if(!user || !userData) return;
        setActionLoading(targetUser.uid);
        try {
            if(userData.friends?.includes(targetUser.uid)) {
                toast({ variant: 'destructive', title: 'Already Friends', description: `You are already friends with ${targetUser.firstName}.` });
                return;
            }

            const sentReqQuery = query(collection(db, 'friend_requests'), where('fromId', '==', user.uid), where('toId', '==', targetUser.uid), where('status', '==', 'pending'));
            const receivedReqQuery = query(collection(db, 'friend_requests'), where('fromId', '==', targetUser.uid), where('toId', '==', user.uid), where('status', '==', 'pending'));
            const [sentSnapshot, receivedSnapshot] = await Promise.all([getDocs(sentReqQuery), getDocs(receivedReqQuery)]);
            
            if(!sentSnapshot.empty || !receivedSnapshot.empty) {
                toast({ title: 'Request Pending', description: `A friend request between you and ${targetUser.firstName} is already pending.` });
                return;
            }

            await addDoc(collection(db, 'friend_requests'), {
                fromId: user.uid,
                fromName: `${userData.firstName} ${userData.lastName}`,
                fromAvatar: userData.photoURL || '',
                toId: targetUser.uid,
                toName: `${targetUser.firstName} ${targetUser.lastName}`,
                toAvatar: targetUser.photoURL || '',
                status: 'pending',
                createdAt: serverTimestamp(),
            });

            await addDoc(collection(db, 'notifications'), {
                userId: targetUser.uid,
                title: "New Friend Request",
                description: `${userData.firstName} ${userData.lastName} wants to be your friend.`,
                href: '/dashboard/friends',
                createdAt: serverTimestamp(),
                read: false,
            });


            toast({ title: 'Request Sent!', description: `Friend request sent to ${targetUser.firstName}.` });
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

    const handleRemoveFriend = async (friend: UserProfile) => {
        if(!user) return;
        setActionLoading(friend.uid);
         const batch = writeBatch(db);

        const currentUserRef = doc(db, 'users', user.uid);
        batch.update(currentUserRef, { friends: arrayRemove(friend.uid) });

        const otherUserRef = doc(db, 'users', friend.uid);
        batch.update(otherUserRef, { friends: arrayRemove(user.uid) });

        try {
             await batch.commit();
             toast({ title: "Friend Removed", description: `You are no longer friends with ${friend.firstName}.` });
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
                const foundUserDoc = querySnapshot.docs[0];
                const foundUser = {...foundUserDoc.data(), uid: foundUserDoc.id } as UserProfile;
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

    const handleUserClick = (uid: string) => {
        router.push(`/dashboard/profile/${uid}`);
    };

    if (!user) {
        return <p>Loading...</p>
    }

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
                               <UserCard key={friend.uid} currentUser={user} person={friend} onAction={() => handleRemoveFriend(friend)} actionType="remove" loading={actionLoading === friend.uid} onUserClick={handleUserClick} />
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
                                    <UserCard currentUser={user} person={searchResult} onAction={handleAddFriend} actionType="add" loading={actionLoading === searchResult.uid} onUserClick={handleUserClick}/>
                                </div>
                            )}

                            <div>
                                <h3 className="font-semibold mb-2">Suggestions</h3>
                                <div className="space-y-4">
                                     {loading ? <p>Loading suggestions...</p> : suggestions.length > 0 ? suggestions.map(person => (
                                       <UserCard key={person.uid} currentUser={user} person={person} onAction={handleAddFriend} actionType="suggestion" loading={actionLoading === person.uid} onUserClick={handleUserClick} />
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
