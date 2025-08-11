
'use client';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2, Users } from 'lucide-react';
import { functions, db } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs } from 'firebase/firestore';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const sendBulkEmail = httpsCallable(functions, 'sendBulkEmail');

interface User {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
}

export default function MailerPage() {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();

    const [sendTo, setSendTo] = useState<'all' | 'specific'>('all');
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (sendTo === 'specific') {
            setLoadingUsers(true);
            getDocs(collection(db, 'users'))
                .then(snapshot => {
                    const usersData = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
                    setAllUsers(usersData);
                })
                .catch(error => {
                    console.error("Error fetching users:", error);
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not load users.' });
                })
                .finally(() => setLoadingUsers(false));
        }
    }, [sendTo, toast]);

    const handleSelectUser = (email: string) => {
        setSelectedUsers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(email)) {
                newSet.delete(email);
            } else {
                newSet.add(email);
            }
            return newSet;
        });
    };

    const handleSendEmail = async () => {
        if (!subject || !body) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please provide both a subject and a body.' });
            return;
        }
        if (sendTo === 'specific' && selectedUsers.size === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select at least one recipient.' });
            return;
        }

        setIsSending(true);

        const recipients = sendTo === 'specific' ? Array.from(selectedUsers) : undefined;
        const recipientCount = recipients ? recipients.length : 'all';

        try {
            await sendBulkEmail({ subject, body, recipients });
            toast({
                title: 'Emails Sent!',
                description: `Your message has been queued for delivery to ${recipientCount} users.`,
            });
            setSubject('');
            setBody('');
            setSelectedUsers(new Set());
        } catch (error: any) {
            console.error("Error sending bulk email:", error);
            toast({
                variant: 'destructive',
                title: 'Sending Failed',
                description: error.message || 'An unexpected error occurred.',
            });
        } finally {
            setIsSending(false);
        }
    };
    
    const filteredUsers = allUsers.filter(user => 
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail /> Custom Mailer</CardTitle>
                <CardDescription>
                    Compose and send a custom email to your user base.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="subject">Email Subject</Label>
                    <Input id="subject" placeholder="e.g., A Special Announcement!" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={isSending}/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="body">Email Body</Label>
                    <Textarea id="body" placeholder="Type your message here. You can use HTML for formatting." value={body} onChange={(e) => setBody(e.target.value)} rows={10} disabled={isSending}/>
                </div>

                <Separator />

                <div className="space-y-4">
                    <Label className="font-semibold">Recipients</Label>
                    <RadioGroup value={sendTo} onValueChange={(value) => setSendTo(value as any)} className="flex gap-4">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="all" /><Label htmlFor="all">All Users</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="specific" id="specific" /><Label htmlFor="specific">Specific Users ({selectedUsers.size})</Label></div>
                    </RadioGroup>

                    {sendTo === 'specific' && (
                        <Card className="border p-4">
                             <Input placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="mb-4" />
                             <ScrollArea className="h-64">
                                <div className="space-y-4 pr-4">
                                {loadingUsers ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-8 w-full"/>
                                        <Skeleton className="h-8 w-full"/>
                                        <Skeleton className="h-8 w-full"/>
                                    </div>
                                ) : filteredUsers.map(user => (
                                    <div key={user.uid} className="flex items-center space-x-3">
                                        <Checkbox 
                                            id={`user-${user.uid}`} 
                                            checked={selectedUsers.has(user.email)} 
                                            onCheckedChange={() => handleSelectUser(user.email)}
                                        />
                                        <Label htmlFor={`user-${user.uid}`} className="font-normal flex-1 cursor-pointer">
                                            <p>{user.firstName} {user.lastName}</p>
                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                        </Label>
                                    </div>
                                ))}
                                </div>
                             </ScrollArea>
                        </Card>
                    )}
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSendEmail} disabled={isSending} className="w-full">
                    {isSending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                        </>
                    ) : (
                        `Send to ${sendTo === 'all' ? 'All Users' : `${selectedUsers.size} User(s)`}`
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}

