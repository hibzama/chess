

'use client'

import { useState, useEffect, useRef } from 'react';
import { useGame } from '@/context/game-context';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';
import { Send, Smile, X } from 'lucide-react';

type Message = {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    createdAt: Timestamp;
};

type GameChatProps = {
    onClose: () => void;
};

export default function GameChat({ onClose }: GameChatProps) {
    const { room, roomOpponentId } = useGame();
    const { user, userData } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const [opponentName, setOpponentName] = useState('Opponent');

     useEffect(() => {
        if (room) {
             const opponentIsCreator = room.createdBy.uid === roomOpponentId;
             if (opponentIsCreator) {
                setOpponentName(room.createdBy.name);
             } else if (room.player2) {
                 setOpponentName(room.player2.name);
             }
        }
    }, [room, roomOpponentId]);

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
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !room) return;

        setIsSending(true);
        const messagesRef = collection(db, 'game_rooms', room.id, 'messages');
        try {
            await addDoc(messagesRef, {
                text: newMessage,
                senderId: user.uid,
                senderName: userData?.firstName || 'Player',
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
        <div className="flex flex-col h-full w-full">
             <div className="p-4 border-b flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">Chat with {opponentName}</h3>
                    <p className="text-sm text-muted-foreground">Messages are only visible during the game.</p>
                </div>
                 <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                 </button>
            </div>
             <div className="flex-1 min-h-0 p-4">
                <ScrollArea className="h-full pr-4" viewportRef={scrollViewportRef}>
                    {messages.length > 0 ? (
                        <div className="space-y-4">
                            {messages.map((msg) => (
                                <div key={msg.id} className={cn("flex items-end gap-3", msg.senderId === user?.uid ? "justify-end" : "justify-start")}>
                                    {msg.senderId !== user?.uid && (
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src="https://placehold.co/40x40.png" data-ai-hint="player avatar"/>
                                            <AvatarFallback>{opponentName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className={cn("max-w-xs rounded-lg px-3 py-2 text-sm", msg.senderId === user?.uid ? "bg-primary text-primary-foreground" : "bg-muted")}>
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
        </div>
    );
}
