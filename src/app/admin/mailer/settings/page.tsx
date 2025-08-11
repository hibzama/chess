
'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Server, Key, User, Loader2, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

export default function MailerSettingsPage() {
    const [config, setConfig] = useState({
        host: '',
        port: '587',
        user: '',
        pass: '',
        fromName: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchConfig = async () => {
            const configRef = doc(db, 'settings', 'mailerConfig');
            const configSnap = await getDoc(configRef);
            if (configSnap.exists()) {
                setConfig(prev => ({ ...prev, ...configSnap.data() }));
            }
            setLoading(false);
        };
        fetchConfig();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const configRef = doc(db, 'settings', 'mailerConfig');
            await setDoc(configRef, { ...config, updatedAt: serverTimestamp() }, { merge: true });
            toast({ title: 'Success!', description: 'Mailer settings have been saved.' });
        } catch (error) {
            console.error("Error saving mailer config:", error);
            toast({ variant: "destructive", title: 'Error', description: 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };
    
    const handleChange = (field: keyof typeof config, value: string) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return <Skeleton className="w-full h-96" />
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail /> Mailer Configuration</CardTitle>
                <CardDescription>Set up the SMTP server settings for sending emails. These credentials are stored securely.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <Alert>
                    <Server className="h-4 w-4" />
                    <AlertTitle>SMTP Provider</AlertTitle>
                    <AlertDescription>
                        You can use services like Brevo (Sendinblue), Mailgun, etc. If you are using Gmail, please follow the special instructions below.
                    </AlertDescription>
                </Alert>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="host" className="flex items-center gap-2">SMTP Host</Label>
                        <Input id="host" placeholder="smtp.example.com" value={config.host} onChange={(e) => handleChange('host', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="port" className="flex items-center gap-2">SMTP Port</Label>
                        <Input id="port" type="number" placeholder="587" value={config.port} onChange={(e) => handleChange('port', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="user" className="flex items-center gap-2"><User/> Username/Email</Label>
                        <Input id="user" placeholder="your-email@example.com" value={config.user} onChange={(e) => handleChange('user', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pass" className="flex items-center gap-2"><Key/> Password/App Password</Label>
                         <Alert variant="destructive" className="mb-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Important: Using Gmail?</AlertTitle>
                            <AlertDescription>
                                If you use Gmail with 2-Factor Authentication, you MUST generate and use an <Link href="https://myaccount.google.com/apppasswords" target="_blank" className="font-bold underline">App Password</Link>. Your regular password will not work.
                            </AlertDescription>
                        </Alert>
                        <Input id="pass" type="password" placeholder="••••••••••••" value={config.pass} onChange={(e) => handleChange('pass', e.target.value)} />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="fromName" className="flex items-center gap-2">"From" Name</Label>
                    <Input id="fromName" placeholder="Nexbattle Support" value={config.fromName} onChange={(e) => handleChange('fromName', e.target.value)} />
                    <p className="text-xs text-muted-foreground">The name recipients will see as the sender.</p>
                </div>
            </CardContent>
             <CardFooter>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? <><Loader2 className="animate-spin mr-2"/> Saving...</> : 'Save Settings'}
                </Button>
            </CardFooter>
        </Card>
    )
}
