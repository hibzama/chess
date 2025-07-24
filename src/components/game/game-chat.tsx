
'use client'

import { useState, useEffect, useRef } from 'react';
import { useGame } from '@/context/game-context';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { formatDistanceToNowStrict } from 'date-fns';
import { cn } from '@/lib/utils';
import { Send } from 'lucide-react';

type Message = {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    createdAt: Timestamp;
};

type GameChatProps = {
    isOpen: boolean;
    onClose: () => void;
};

export default function GameChat({ isOpen, onClose }: GameChatProps) {
    const { room } = useGame();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollViewportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!room) return;
        const messagesRef = collection(db, 'game_rooms', room.id, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Message));
            setMessages(fetchedMessages);
        });

        return () => unsubscribe();
    }, [room]);

    useEffect(() => {
        if (scrollViewportRef.current) {
            const { scrollHeight } = scrollViewportRef.current;
            scrollViewportRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !room) return;

        setIsSending(true);
        const messagesRef = collection(db, 'game_rooms', room.id, 'messages');
        try {
            await addDoc(messagesRef, {
                text: newMessage,
                senderId: user.uid,
                senderName: user.displayName || 'Player',
                createdAt: serverTimestamp(),
            });
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="flex flex-col">
                <SheetHeader>
                    <SheetTitle>In-Game Chat</SheetTitle>
                </SheetHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full pr-4" viewportRef={scrollViewportRef}>
                        <div className="space-y-4">
                            {messages.map((msg) => (
                                <div key={msg.id} className={cn("flex items-start gap-3", msg.senderId === user?.uid ? "justify-end" : "justify-start")}>
                                    {msg.senderId !== user?.uid && (
                                         <Avatar className="w-8 h-8">
                                            <AvatarImage src="https://placehold.co/40x40.png" data-ai-hint="player avatar"/>
                                            <AvatarFallback>OP</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className={cn("max-w-xs rounded-lg px-3 py-2 text-sm", msg.senderId === user?.uid ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                        <p className="font-bold mb-0.5">{msg.senderId === user?.uid ? "You" : "Opponent"}</p>
                                        <p>{msg.text}</p>
                                        <p className="text-xs opacity-70 mt-1 text-right">{msg.createdAt ? formatDistanceToNowStrict(msg.createdAt.toDate(), { addSuffix: true }) : 'sending...'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
                <SheetFooter>
                    <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            autoComplete="off"
                            disabled={isSending}
                        />
                        <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
                            <Send className="h-4 w-4" />
                            <span className="sr-only">Send</span>
                        </Button>
                    </form>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
