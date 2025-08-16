
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift } from 'lucide-react';

export default function BonusSettingsPage() {
    const [settings, setSettings] = useState({
        signupBonusEnabled: true,
        signupBonusAmount: 100,
        signupBonusLimit: 250,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchSettings = async () => {
            const settingsRef = doc(db, 'settings', 'bonusConfig');
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
                setSettings(prev => ({ ...prev, ...settingsSnap.data() }));
            }
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const settingsRef = doc(db, 'settings', 'bonusConfig');
            await setDoc(settingsRef, settings, { merge: true });
            toast({ title: 'Success!', description: 'Bonus settings have been saved.' });
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({ variant: "destructive", title: 'Error', description: 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };
    
    if (loading) {
        return <Skeleton className="w-full h-96" />
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Gift /> Sign-Up Bonus Settings</CardTitle>
                <CardDescription>Configure the registration bonus for new users.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="signup-bonus-enabled" className="text-base">Enable Sign-Up Bonus</Label>
                        <p className="text-sm text-muted-foreground">
                            Toggle whether new users receive a bonus upon registration.
                        </p>
                    </div>
                    <Switch
                        id="signup-bonus-enabled"
                        checked={settings.signupBonusEnabled}
                        onCheckedChange={(checked) => setSettings(s => ({ ...s, signupBonusEnabled: checked }))}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="signup-bonus-amount">Bonus Amount (LKR)</Label>
                    <Input 
                        id="signup-bonus-amount" 
                        type="number"
                        value={settings.signupBonusAmount}
                        onChange={(e) => setSettings(s => ({ ...s, signupBonusAmount: Number(e.target.value) }))}
                        disabled={!settings.signupBonusEnabled}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="signup-bonus-limit">User Limit</Label>
                    <Input 
                        id="signup-bonus-limit" 
                        type="number"
                        value={settings.signupBonusLimit}
                        onChange={(e) => setSettings(s => ({ ...s, signupBonusLimit: Number(e.target.value) }))}
                        disabled={!settings.signupBonusEnabled}
                    />
                     <p className="text-xs text-muted-foreground">The first N users to register will receive this bonus.</p>
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Settings"}
                </Button>
            </CardFooter>
        </Card>
    );
}
