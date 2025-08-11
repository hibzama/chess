
'use client';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { Mail, Users, User, AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { sendEmail } from '@/ai/flows/mailer-flow';
import { Skeleton } from '@/components/ui/skeleton';

type User = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
}

export default function MailerPage() {
    const { toast } = useToast();
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [sendTo, setSendTo] = useState<'all' | 'selected'>('all');
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoadingUsers(true);
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const usersData = usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
            setAllUsers(usersData);
            setLoadingUsers(false);
        }
        fetchUsers();
    }, []);

    const handleSelectUser = (userId: string, isChecked: boolean) => {
        setSelectedUsers(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                newSet.add(userId);
            } else {
                newSet.delete(userId);
            }
            return newSet;
        });
    }
    
    const handleSelectAll = (isChecked: boolean) => {
        if (isChecked) {
            setSelectedUsers(new Set(allUsers.map(u => u.id)));
        } else {
            setSelectedUsers(new Set());
        }
    }

    const handleSendEmail = async () => {
        if (!subject || !body) {
            toast({ variant: 'destructive', title: 'Error', description: 'Subject and body cannot be empty.' });
            return;
        }

        let recipients: User[] = [];
        if (sendTo === 'all') {
            recipients = allUsers;
        } else {
            if (selectedUsers.size === 0) {
                toast({ variant: 'destructive', title: 'Error', description: 'Please select at least one user.' });
                return;
            }
            recipients = allUsers.filter(u => selectedUsers.has(u.id));
        }

        setIsSending(true);
        try {
            await sendEmail({
                subject,
                body,
                recipients,
            });
            toast({ title: 'Success!', description: `Email is being sent to ${recipients.length} user(s).` });
            setSubject('');
            setBody('');
            setSelectedUsers(new Set());
        } catch (error: any) {
            console.error("Failed to send email:", error);
            toast({ variant: 'destructive', title: 'Error', description: `Failed to send emails: ${error.message}` });
        } finally {
            setIsSending(false);
        }
    };
    
    const isAllSelected = allUsers.length > 0 && selectedUsers.size === allUsers.length;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail /> Custom Mailer</CardTitle>
                <CardDescription>
                    Send a broadcast email to your user base.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="subject">Email Subject</Label>
                    <Input id="subject" placeholder="A special announcement!" value={subject} onChange={e => setSubject(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="body">Email Body</Label>
                    <Textarea id="body" placeholder="Dear user..." className="min-h-48" value={body} onChange={e => setBody(e.target.value)} />
                </div>
                
                 <div className="space-y-3">
                    <Label>Recipients</Label>
                    <RadioGroup value={sendTo} onValueChange={(value) => setSendTo(value as any)} className="flex gap-4">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="all" /><Label htmlFor="all">All Users ({allUsers.length})</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="selected" id="selected" /><Label htmlFor="selected">Selected Users ({selectedUsers.size})</Label></div>
                    </RadioGroup>
                </div>

                {sendTo === 'selected' && (
                    <Card className="bg-muted/50">
                        <CardHeader>
                            <CardTitle className="text-base">Select Recipients</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingUsers ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-8 w-full" />
                                    <Skeleton className="h-8 w-full" />
                                    <Skeleton className="h-8 w-full" />
                                </div>
                            ) : (
                                <>
                                <div className="flex items-center space-x-2 border-b pb-2 mb-2">
                                    <Checkbox 
                                        id="select-all" 
                                        checked={isAllSelected} 
                                        onCheckedChange={handleSelectAll}
                                    />
                                    <Label htmlFor="select-all" className="font-semibold">Select All</Label>
                                </div>
                                <ScrollArea className="h-64">
                                    <div className="space-y-2 pr-4">
                                    {allUsers.map(user => (
                                        <div key={user.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-background">
                                            <Checkbox 
                                                id={`user-${user.id}`}
                                                checked={selectedUsers.has(user.id)}
                                                onCheckedChange={(checked) => handleSelectUser(user.id, !!checked)}
                                            />
                                            <Label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                                                {user.firstName} {user.lastName} <span className="text-muted-foreground">({user.email})</span>
                                            </Label>
                                        </div>
                                    ))}
                                    </div>
                                </ScrollArea>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

            </CardContent>
            <CardFooter>
                 <Button onClick={handleSendEmail} disabled={isSending} className="w-full">
                    {isSending ? <Loader2 className="animate-spin" /> : 'Send Email'}
                </Button>
            </CardFooter>
        </Card>
    );
}
