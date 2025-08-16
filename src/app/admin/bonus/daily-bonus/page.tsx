
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
import { CalendarClock } from 'lucide-react';

export default function DailyBonusPage() {
    const [settings, setSettings] = useState({
        dailyBonusEnabled: false,
        dailyBonusAmount: 5,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchSettings = async () => {
            const settingsRef = doc(db, 'settings', 'dailyBonusConfig');
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
            const settingsRef = doc(db, 'settings', 'dailyBonusConfig');
            await setDoc(settingsRef, settings, { merge: true });
            toast({ title: 'Success!', description: 'Daily bonus settings have been saved.' });
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
                <CardTitle className="flex items-center gap-2"><CalendarClock/> Daily Login Bonus</CardTitle>
                <CardDescription>Configure a bonus that users can claim once every 24 hours.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="daily-bonus-enabled" className="text-base">Enable Daily Bonus</Label>
                        <p className="text-sm text-muted-foreground">
                           Toggle whether users can claim a daily login bonus.
                        </p>
                    </div>
                    <Switch
                        id="daily-bonus-enabled"
                        checked={settings.dailyBonusEnabled}
                        onCheckedChange={(checked) => setSettings(s => ({ ...s, dailyBonusEnabled: checked }))}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="daily-bonus-amount">Bonus Amount (LKR)</Label>
                    <Input 
                        id="daily-bonus-amount" 
                        type="number"
                        value={settings.dailyBonusAmount}
                        onChange={(e) => setSettings(s => ({ ...s, dailyBonusAmount: Number(e.target.value) }))}
                        disabled={!settings.dailyBonusEnabled}
                    />
                     <p className="text-xs text-muted-foreground">The amount credited to the user's main balance when they claim.</p>
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
