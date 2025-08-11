
'use client';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input';
import { Label } from "@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2 } from 'lucide-react';
import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';

const sendBulkEmail = httpsCallable(functions, 'sendBulkEmail');

export default function MailerPage() {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();

    const handleSendEmail = async () => {
        if (!subject || !body) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please provide both a subject and a body for the email.'
            });
            return;
        }
        setIsSending(true);

        try {
            const result = await sendBulkEmail({ subject, body });
            console.log(result.data);
            toast({
                title: 'Emails Sent!',
                description: `Your message has been queued for delivery to all users.`,
            });
            setSubject('');
            setBody('');
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

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail /> Custom Mailer</CardTitle>
                <CardDescription>
                    Compose and send a custom email to all registered users on the platform.
                    Use with caution, as this will message your entire user base.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="subject">Email Subject</Label>
                    <Input
                        id="subject"
                        placeholder="e.g., A Special Announcement!"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        disabled={isSending}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="body">Email Body</Label>
                    <Textarea
                        id="body"
                        placeholder="Type your message here. You can use HTML for formatting."
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={10}
                        disabled={isSending}
                    />
                </div>
                <Button onClick={handleSendEmail} disabled={isSending} className="w-full">
                    {isSending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending to All Users...
                        </>
                    ) : (
                        'Send Email'
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
