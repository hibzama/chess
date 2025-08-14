
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
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

const UserCard = ({ currentUser, person, onAction, actionType, loading, onUserClick }: { currentUser: any, person: UserProfile, onAction: (id: string, name: string) => void, actionType: 'add' | 'remove' | 'suggestion', loading: boolean, onUserClick: (uid: string) => void }) => {
    
    const getChatId = (currentUserId: string, otherUserId: string) => {
        return [currentUserId, otherUserId].sort().join('_');
    };

    return (
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
                    <Button variant={actionType === 'add' ? 'outline' : 'destructive'} size="icon" onClick={() => onAction(person.uid, `${person.firstName} ${person.lastName}`)} disabled={loading}>
                        {actionType === 'add' ? <UserPlus /> : <UserMinus />}
                    </Button>
                }
                {actionType === 'suggestion' && 
                    <Button variant="outline" size="icon" onClick={() => onAction(person.uid, `${person.firstName} ${person.lastName}`)} disabled={loading}>
                        <UserPlus />
                    </Button>
                }
            </div>
        </Card>
    );
}

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
            
            const suggestFriendsCallable = httpsCallable(functions, 'suggestFriends');
            try {
                const result = await suggestFriendsCallable();
                setSuggestions(result.data as UserProfile[]);
            } catch (error) {
                console.error("Error fetching suggestions:", error);
            }

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
                    if(req.toId) {
                        const toUserDoc = await getDoc(doc(db, 'users', req.toId));
                        if (toUserDoc.exists()) {
                            const toUserData = toUserDoc.data();
                            req.toName = `${toUserData.firstName} ${toUserData.lastName}`;
                            req.toAvatar = toUserData.photoURL;
                        }
                    }
                    return req;
                });
                const sentReqsData = await Promise.all(sentReqsDataPromises);
                setSentRequests(sentReqsData);
            });
            unsubscribes.push(unsubscribeSentReqs);
            
            setLoading(false);
        };

        setupListeners();
        
        return () => {
            unsubscribes.forEach(unsub => unsub());
        };

    }, [user, userData, fetchFriends]);
    
    const handleAddFriend = async (targetId: string, targetName: string) => {
        if(!user) return;
        setActionLoading(targetId);
        try {
            const sendFriendRequestCallable = httpsCallable(functions, 'sendFriendRequest');
            await sendFriendRequestCallable({ toId: targetId });
            toast({ title: 'Request Sent!', description: `Friend request sent to ${targetName}.` });
        } catch (error: any) {
            console.error("Error sending friend request", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not send friend request.' });
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
    
    if(!user) return <Loader2 className="animate-spin" />;

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
                               <UserCard key={friend.uid} currentUser={user} person={friend} onAction={handleRemoveFriend} actionType="remove" loading={actionLoading === friend.uid} onUserClick={handleUserClick} />
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

```
- src/app/dashboard/chat/page.tsx
'use client'
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc, writeBatch, serverTimestamp, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, Circle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNowStrict } from 'date-fns';

type Friend = {
    uid: string;
    firstName: string;
    lastName: string;
    photoURL?: string;
    hasUnread?: boolean;
    status?: 'online' | 'offline';
    lastSeen?: any;
}

const getChatId = (uid1: string, uid2: string) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};


export default function ChatInboxPage() {
    const { user, userData } = useAuth();
    const router = useRouter();
    const [friendsWithChatStatus, setFriendsWithChatStatus] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !userData?.friends || userData.friends.length === 0) {
            setLoading(false);
            return;
        }

        const friendPromises = userData.friends.map(friendId => getDoc(doc(db, 'users', friendId)));

        Promise.all(friendPromises).then(friendDocs => {
            const friendsData = friendDocs.filter(doc => doc.exists()).map(doc => ({ ...doc.data(), uid: doc.id } as Friend));
            
            const unsubscribes = friendsData.map(friend => {
                const chatId = getChatId(user.uid, friend.uid);
                const chatRef = doc(db, 'chats', chatId);
                return onSnapshot(chatRef, (chatSnap) => {
                    const chatData = chatSnap.data();
                    const hasUnread = chatData?.users?.[user.uid]?.hasUnread || false;

                    setFriendsWithChatStatus(prevFriends => {
                        const existingFriend = prevFriends.find(f => f.uid === friend.uid);
                        if (existingFriend && existingFriend.hasUnread === hasUnread) {
                            return prevFriends; // No change needed
                        }
                        const newFriends = prevFriends.filter(f => f.uid !== friend.uid);
                        return [...newFriends, { ...friend, hasUnread }];
                    });
                });
            });

             setFriendsWithChatStatus(friendsData);
             setLoading(false);

            return () => unsubscribes.forEach(unsub => unsub());
        });

    }, [user, userData?.friends]);

    const handleStartChat = async (friend: Friend) => {
        if (!user || !userData) return;
        
        const chatId = getChatId(user.uid, friend.uid);
        const chatRef = doc(db, 'chats', chatId);

        try {
            const chatSnap = await getDoc(chatRef);
            if (!chatSnap.exists()) {
                const batch = writeBatch(db);
                batch.set(chatRef, {
                    users: {
                        [user.uid]: {
                            name: `${userData.firstName} ${userData.lastName}`,
                            avatar: userData.photoURL || '',
                            exists: true,
                            hasUnread: false,
                        },
                        [friend.uid]: {
                            name: `${friend.firstName} ${friend.lastName}`,
                            avatar: friend.photoURL || '',
                            exists: true,
                            hasUnread: false,
                        }
                    },
                    createdAt: serverTimestamp(),
                    lastMessage: null, // Initialize lastMessage field
                });
                await batch.commit();
            }

            router.push(`/dashboard/chat/${chatId}`);
        } catch (error) {
            console.error("Error starting chat:", error);
        }
    };
    
    const sortedFriends = [...friendsWithChatStatus].sort((a,b) => {
        if (a.hasUnread && !b.hasUnread) return -1;
        if (!a.hasUnread && b.hasUnread) return 1;
        if (a.status === 'online' && b.status !== 'online') return -1;
        if (a.status !== 'online' && b.status === 'online') return 1;
        return 0;
    });

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3"><MessageSquare/> Direct Messages</h1>
                <p className="text-muted-foreground">Your private conversations with other players.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Start a Conversation</CardTitle>
                    <CardDescription>Select a friend to start or continue a conversation.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                         <div className="space-y-2">
                            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full"/>)}
                         </div>
                    ) : sortedFriends.length > 0 ? (
                        <div className="space-y-2">
                           {sortedFriends.map(friend => (
                                <div key={friend.uid} className="p-4 rounded-lg hover:bg-muted transition-colors flex items-center gap-4">
                                     <div className="relative">
                                        <Avatar>
                                            <AvatarImage src={friend.photoURL} />
                                            <AvatarFallback>{friend.firstName?.[0]}</AvatarFallback>
                                        </Avatar>
                                         {friend.status === 'online' && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full" />}
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-semibold">{friend.firstName} {friend.lastName}</p>
                                         {friend.status === 'online' ? (
                                            <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">Online</Badge>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">
                                                {friend.lastSeen ? `Last seen ${formatDistanceToNowStrict(friend.lastSeen.toDate(), { addSuffix: true })}` : 'Offline'}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {friend.hasUnread && <Circle className="w-3 h-3 text-primary fill-current" />}
                                        <Button onClick={() => handleStartChat(friend)}>Chat</Button>
                                    </div>
                                </div>
                           ))}
                        </div>
                    ) : (
                        <div className="text-center p-8 text-muted-foreground">
                            <p>You haven't added any friends yet.</p>
                            <Button variant="link" onClick={() => router.push('/dashboard/friends')}>Find friends to start a conversation!</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
- src/app/dashboard/chat/[chatId]/page.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, doc, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, getDoc, updateDoc, where, getDocs, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Send, Smile, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

type Message = {
    id: string;
    text: string;
    senderId: string;
    createdAt: Timestamp;
};

type OtherUser = {
    name: string;
    avatar?: string;
};

export default function ChatPage() {
    const { chatId } = useParams();
    const router = useRouter();
    const { user, userData } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
    const [loading, setLoading] = useState(true);
    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const otherUserIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!user || !chatId) return;

        const chatRef = doc(db, 'chats', chatId as string);

        updateDoc(chatRef, { [`users.${user.uid}.hasUnread`]: false }).catch(e => console.log("Failed to mark as read initially:", e));

        const unsubscribeChat = onSnapshot(chatRef, (docSnap) => {
            if (docSnap.exists()) {
                const chatData = docSnap.data();
                const otherUserId = Object.keys(chatData.users).find(uid => uid !== user.uid);

                if (!otherUserId || !chatData.users[otherUserId].exists) {
                    router.push('/dashboard/chat');
                    return;
                }
                
                otherUserIdRef.current = otherUserId;
                setOtherUser(chatData.users[otherUserId]);
            } else {
                 router.push('/dashboard/chat');
            }
             setLoading(false);
        });

        const messagesRef = collection(db, 'chats', chatId as string, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));

        const unsubscribeMessages = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Message));
            setMessages(fetchedMessages);
        });

        return () => {
            unsubscribeChat();
            unsubscribeMessages();
        };
    }, [chatId, user, router]);

    useEffect(() => {
        if (scrollViewportRef.current) {
            const { scrollHeight } = scrollViewportRef.current;
            scrollViewportRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);
    

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !chatId || !otherUserIdRef.current || !userData) return;

        setIsSending(true);
        const messagesRef = collection(db, 'chats', chatId as string, 'messages');
        const chatRef = doc(db, 'chats', chatId as string);
        const recipientId = otherUserIdRef.current;

        try {
            await addDoc(messagesRef, {
                text: newMessage,
                senderId: user.uid,
                createdAt: serverTimestamp(),
            });
            await updateDoc(chatRef, {
                lastMessage: {
                    text: newMessage,
                    senderId: user.uid,
                    timestamp: serverTimestamp(),
                },
                [`users.${recipientId}.hasUnread`]: true,
            })

            // Check if we need to send a notification
            const notifQuery = query(
                collection(db, 'notifications'), 
                where('userId', '==', recipientId), 
                where('contextId', '==', chatId), 
                limit(1)
            );
            const notifSnapshot = await getDocs(notifQuery);
            if (notifSnapshot.empty) { // Only send if no recent notification for this chat exists
                 await addDoc(collection(db, 'notifications'), {
                    userId: recipientId,
                    title: "New Message",
                    description: `You have a new message from ${userData.firstName}.`,
                    href: `/dashboard/chat/${chatId}`,
                    createdAt: serverTimestamp(),
                    read: false,
                    contextId: chatId, // Add context to prevent spamming
                });
            }

            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setIsSending(false);
        }
    };
    
    if(loading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>
    }

    return (
        <Card className="flex flex-col h-[calc(100vh-10rem)] w-full max-w-4xl mx-auto">
             <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-4">
                     <Link href="/dashboard/chat" className="p-1 rounded-full hover:bg-muted lg:hidden">
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Back to Chats</span>
                     </Link>
                    <Avatar>
                        <AvatarImage src={otherUser?.avatar} />
                        <AvatarFallback>{otherUser?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold">{otherUser?.name}</h3>
                </div>
            </div>
             <div className="flex-1 min-h-0 p-4">
                <ScrollArea className="h-full pr-4" viewportRef={scrollViewportRef}>
                    {messages.length > 0 ? (
                        <div className="space-y-4">
                            {messages.map((msg) => (
                                <div key={msg.id} className={cn("flex items-end gap-3", msg.senderId === user?.uid ? "justify-end" : "justify-start")}>
                                    {msg.senderId !== user?.uid && (
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={otherUser?.avatar} />
                                            <AvatarFallback>{otherUser?.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className={cn("max-w-xs lg:max-w-md rounded-lg px-3 py-2 text-sm", msg.senderId === user?.uid ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                        <p>{msg.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            No messages yet. Say hello!
                        </div>
                    )}
                </ScrollArea>
            </div>
             <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2 bg-muted rounded-full px-2">
                     <Button type="button" variant="ghost" size="icon" className="text-muted-foreground"><Smile/></Button>
                    <Input
                        className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        autoComplete="off"
                        disabled={isSending}
                    />
                    <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()} className="rounded-full">
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Send</span>
                    </Button>
                </form>
            </div>
        </Card>
    );
}

- src/context/auth-context.tsx

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db, rtdb } from '@/lib/firebase';
import { doc, onSnapshot, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';
import { ref, onValue, off, set, onDisconnect, serverTimestamp as rtdbServerTimestamp } from "firebase/database";

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  logout: () => Promise<void>;
  setUserData: React.Dispatch<React.SetStateAction<UserData | null>>;
}

interface EquipmentSettings {
    chess: {
        pieceStyle: string;
        boardTheme: string;
    },
    checkers: {
        pieceStyle: string;
        boardTheme: string;
    }
}

interface UserData {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    binancePayId?: string;
    balance: number;
    commissionBalance?: number;
    marketingBalance?: number;
    role: 'user' | 'admin' | 'marketer';
    equipment?: EquipmentSettings;
    referredBy?: string;
    referralChain?: string[];
    createdAt: any;
    l1Count?: number;
    photoURL?: string;
    friends?: string[];
    status?: 'online' | 'offline';
    lastSeen?: any;
    wins?: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setUserData(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    let unsubscribeFirestore: () => void;
    if (user) {
      setLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      
      unsubscribeFirestore = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setUserData(doc.data() as UserData);
        } else {
          setUserData(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching user data:", error);
        setUserData(null);
        setLoading(false);
      });

      // Presence system
      const userStatusDatabaseRef = ref(rtdb, '/status/' + user.uid);
      const userStatusFirestoreRef = doc(db, '/users/' + user.uid);

      const isOfflineForDatabase = {
        state: 'offline',
        last_changed: rtdbServerTimestamp(),
      };
      
      const isOnlineForDatabase = {
        state: 'online',
        last_changed: rtdbServerTimestamp(),
      };

      const isOfflineForFirestore = {
          status: 'offline',
          lastSeen: serverTimestamp(),
      };

      const isOnlineForFirestore = {
          status: 'online',
          lastSeen: serverTimestamp(),
      };

      onValue(ref(rtdb, '.info/connected'), (snapshot) => {
        if (snapshot.val() === false) {
           getDoc(userStatusFirestoreRef).then(docSnap => {
                if (docSnap.exists() && docSnap.data().status !== 'offline') {
                    updateDoc(userStatusFirestoreRef, isOfflineForFirestore);
                }
            });
          return;
        }

        onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
             getDoc(userStatusFirestoreRef).then(docSnap => {
                if (docSnap.exists()) {
                    set(userStatusDatabaseRef, isOnlineForDatabase);
                    updateDoc(userStatusFirestoreRef, isOnlineForFirestore);
                }
            });
        });
      });

    }

    return () => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, [user]);


  const logout = async () => {
    if(user) {
        const userStatusFirestoreRef = doc(db, '/users/' + user.uid);
         await updateDoc(userStatusFirestoreRef, {
          status: 'offline',
          lastSeen: serverTimestamp(),
        });
    }
    await auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, logout, setUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};