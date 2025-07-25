
'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, doc, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, getDoc, updateDoc } from 'firebase/firestore';
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
    const { user } = useAuth();
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

        // Mark messages as read when component mounts
        updateDoc(chatRef, { [`users.${user.uid}.hasUnread`]: false }).catch(e => console.log("Failed to mark as read initially:", e));

        const unsubscribeChat = onSnapshot(chatRef, (docSnap) => {
            if (docSnap.exists()) {
                const chatData = docSnap.data();
                const otherUserId = Object.keys(chatData.users).find(uid => uid !== user.uid);

                if (!otherUserId || !chatData.users[otherUserId].exists) {
                    router.push('/dashboard/chat'); // Not a member of this chat
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
        if (!newMessage.trim() || !user || !chatId || !otherUserIdRef.current) return;

        setIsSending(true);
        const messagesRef = collection(db, 'chats', chatId as string, 'messages');
        const chatRef = doc(db, 'chats', chatId as string);

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
                [`users.${otherUserIdRef.current}.hasUnread`]: true,
            })
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
                        <AvatarImage src={otherUser?.avatar} data-ai-hint="user avatar"/>
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
                                            <AvatarImage src={otherUser?.avatar} data-ai-hint="user avatar"/>
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
