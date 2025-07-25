
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

type Friend = {
    uid: string;
    firstName: string;
    lastName: string;
    photoURL?: string;
    hasUnread?: boolean;
}

export default function ChatInboxPage() {
    const { user, userData } = useAuth();
    const router = useRouter();
    const [friendsWithChatStatus, setFriendsWithChatStatus] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);

    const getChatId = (uid1: string, uid2: string) => {
        return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
    }

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
                });
                await batch.commit();
            }

            router.push(`/dashboard/chat/${chatId}`);
        } catch (error) {
            console.error("Error starting chat:", error);
        }
    };
    
    const sortedFriends = friendsWithChatStatus.sort((a,b) => (b.hasUnread ? 1 : 0) - (a.hasUnread ? 1 : 0))

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
                                    <Avatar>
                                        <AvatarImage src={friend.photoURL} data-ai-hint="user avatar" />
                                        <AvatarFallback>{friend.firstName?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-grow">
                                        <p className="font-semibold">{friend.firstName} {friend.lastName}</p>
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
