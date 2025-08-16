
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
import { PercentCircle } from 'lucide-react';

export default function DepositBonusPage() {
    const [settings, setSettings] = useState({
        depositBonusEnabled: false,
        depositBonusPercentage: 10,
        depositBonusMaxAmount: 500,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchSettings = async () => {
            const settingsRef = doc(db, 'settings', 'depositBonusConfig');
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
            const settingsRef = doc(db, 'settings', 'depositBonusConfig');
            await setDoc(settingsRef, settings, { merge: true });
            toast({ title: 'Success!', description: 'Deposit bonus settings have been saved.' });
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
                <CardTitle className="flex items-center gap-2"><PercentCircle/> Deposit Bonus Settings</CardTitle>
                <CardDescription>Configure bonuses for user deposits. The bonus will be added to the user's main balance upon deposit approval.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="deposit-bonus-enabled" className="text-base">Enable Deposit Bonus</Label>
                        <p className="text-sm text-muted-foreground">
                           Toggle whether to give users a bonus on their deposits.
                        </p>
                    </div>
                    <Switch
                        id="deposit-bonus-enabled"
                        checked={settings.depositBonusEnabled}
                        onCheckedChange={(checked) => setSettings(s => ({ ...s, depositBonusEnabled: checked }))}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="deposit-bonus-percentage">Bonus Percentage (%)</Label>
                    <Input 
                        id="deposit-bonus-percentage" 
                        type="number"
                        value={settings.depositBonusPercentage}
                        onChange={(e) => setSettings(s => ({ ...s, depositBonusPercentage: Number(e.target.value) }))}
                        disabled={!settings.depositBonusEnabled}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="deposit-bonus-max">Maximum Bonus Amount (LKR)</Label>
                    <Input 
                        id="deposit-bonus-max" 
                        type="number"
                        value={settings.depositBonusMaxAmount}
                        onChange={(e) => setSettings(s => ({ ...s, depositBonusMaxAmount: Number(e.target.value) }))}
                        disabled={!settings.depositBonusEnabled}
                    />
                     <p className="text-xs text-muted-foreground">The maximum bonus amount a user can receive from a single deposit.</p>
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

