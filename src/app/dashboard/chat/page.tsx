
'use client'
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare } from 'lucide-react';

type ChatRoom = {
    id: string;
    users: { [uid: string]: { name: string, avatar?: string, exists: boolean }};
    lastMessage?: { text: string, senderId: string, timestamp: any };
}

export default function ChatInboxPage() {
    const { user } = useAuth();
    const [chats, setChats] = useState<ChatRoom[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'chats'),
            where(`users.${user.uid}.exists`, '==', true)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatRoom));
            
            // Sort chats by last message timestamp client-side
            chatData.sort((a, b) => {
                const aTimestamp = a.lastMessage?.timestamp?.seconds || 0;
                const bTimestamp = b.lastMessage?.timestamp?.seconds || 0;
                return bTimestamp - aTimestamp;
            });

            setChats(chatData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const getOtherUser = (chat: ChatRoom) => {
        if(!user) return { name: '?', avatar: '' };
        const otherUserId = Object.keys(chat.users).find(uid => uid !== user.uid);
        return otherUserId ? chat.users[otherUserId] : { name: 'Unknown User', avatar: '' };
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3"><MessageSquare/> Direct Messages</h1>
                <p className="text-muted-foreground">Your private conversations with other players.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Your Chats</CardTitle>
                    <CardDescription>Select a conversation to continue messaging.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p>Loading your chats...</p>
                    ) : chats.length > 0 ? (
                        <div className="space-y-2">
                           {chats.map(chat => {
                                const otherUser = getOtherUser(chat);
                                return (
                                <Link href={`/dashboard/chat/${chat.id}`} key={chat.id} className="block">
                                    <div className="p-4 rounded-lg hover:bg-muted transition-colors flex items-center gap-4">
                                        <Avatar>
                                            <AvatarImage src={otherUser.avatar} data-ai-hint="user avatar" />
                                            <AvatarFallback>{otherUser.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-grow">
                                            <p className="font-semibold">{otherUser.name}</p>
                                            <p className="text-sm text-muted-foreground truncate">{chat.lastMessage?.text || 'No messages yet...'}</p>
                                        </div>
                                    </div>
                                </Link>
                               )
                           })}
                        </div>
                    ) : (
                        <div className="text-center p-8 text-muted-foreground">
                            <p>You have no active chats.</p>
                            <p>Find friends to start a conversation!</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
