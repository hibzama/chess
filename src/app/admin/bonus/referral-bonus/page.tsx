
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift, Users, X, Plus } from 'lucide-react';

interface Tier {
    referrals: number;
    amount: number;
}

export default function ReferralBonusPage() {
    const [tiers, setTiers] = useState<Tier[]>([{ referrals: 10, amount: 50 }]);
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchSettings = async () => {
            const settingsRef = doc(db, 'settings', 'referralBonusConfig');
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
                const data = settingsSnap.data();
                setTiers(data.tiers || [{ referrals: 10, amount: 50 }]);
                setEnabled(data.enabled || false);
            }
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleTierChange = (index: number, field: keyof Tier, value: string) => {
        const newTiers = [...tiers];
        newTiers[index] = { ...newTiers[index], [field]: Number(value) };
        setTiers(newTiers);
    };

    const addTier = () => {
        setTiers([...tiers, { referrals: 0, amount: 0 }]);
    };
    
    const removeTier = (index: number) => {
        const newTiers = tiers.filter((_, i) => i !== index);
        setTiers(newTiers);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const sortedTiers = [...tiers].sort((a,b) => a.referrals - b.referrals);
            const settingsRef = doc(db, 'settings', 'referralBonusConfig');
            await setDoc(settingsRef, { tiers: sortedTiers, enabled }, { merge: true });
            toast({ title: 'Success!', description: 'Referral bonus settings have been saved.' });
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
                <CardTitle className="flex items-center gap-2"><Users/> Referral Bonus Settings</CardTitle>
                <CardDescription>Reward users with a one-time bonus when they reach a certain number of Level 1 referrals.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="referral-bonus-enabled" className="text-base">Enable Referral Bonus</Label>
                        <p className="text-sm text-muted-foreground">
                           Toggle whether users can claim bonuses for inviting friends.
                        </p>
                    </div>
                    <Switch
                        id="referral-bonus-enabled"
                        checked={enabled}
                        onCheckedChange={setEnabled}
                    />
                </div>
                <div className="space-y-4">
                    {tiers.map((tier, index) => (
                        <div key={index} className="flex items-end gap-4 p-4 border rounded-md">
                            <div className="flex-1 grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor={`tier-referrals-${index}`}>Required Referrals</Label>
                                    <Input
                                        id={`tier-referrals-${index}`}
                                        type="number"
                                        value={tier.referrals}
                                        onChange={(e) => handleTierChange(index, 'referrals', e.target.value)}
                                        disabled={!enabled}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`tier-amount-${index}`}>Bonus Amount (LKR)</Label>
                                    <Input
                                        id={`tier-amount-${index}`}
                                        type="number"
                                        value={tier.amount}
                                        onChange={(e) => handleTierChange(index, 'amount', e.target.value)}
                                        disabled={!enabled}
                                    />
                                </div>
                            </div>
                            <Button variant="destructive" size="icon" onClick={() => removeTier(index)} disabled={!enabled}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                     <Button variant="outline" onClick={addTier} disabled={!enabled}>
                        <Plus className="mr-2 h-4 w-4"/> Add Tier
                    </Button>
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
