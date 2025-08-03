
'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Gift, Percent, Users, DollarSign, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export interface DepositBonus {
    id: string;
    percentage: number;
    minDeposit: number;
    maxDeposit: number;
    maxUsers: number;
    claimedBy: string[];
    isActive: boolean;
    durationHours: number;
    startTime?: Timestamp;
    createdAt?: any;
    updatedAt?: any;
}

export default function BonusPage() {
    const [bonus, setBonus] = useState<Partial<DepositBonus>>({
        id: 'main_bonus',
        percentage: 10,
        minDeposit: 1000,
        maxDeposit: 5000,
        maxUsers: 100,
        claimedBy: [],
        isActive: false,
        durationHours: 24,
    });
    const [initialIsActive, setInitialIsActive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchBonus = async () => {
            const bonusRef = doc(db, 'settings', 'depositBonus');
            const bonusSnap = await getDoc(bonusRef);
            if (bonusSnap.exists()) {
                const data = bonusSnap.data() as DepositBonus;
                setBonus(data);
                setInitialIsActive(data.isActive);
            }
            setLoading(false);
        };
        fetchBonus();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const bonusRef = doc(db, 'settings', 'depositBonus');
            
            const bonusPayload: Partial<DepositBonus> = {
                 ...bonus,
                 updatedAt: serverTimestamp(),
                 createdAt: bonus.createdAt || serverTimestamp(),
            };
            
            // Only set a new start time if the bonus is being activated (toggled from off to on)
            if(bonus.isActive && !initialIsActive) {
                bonusPayload.startTime = serverTimestamp();
            } else if (!bonus.isActive) {
                bonusPayload.startTime = undefined; // Use undefined to remove field on update
            }


            await setDoc(bonusRef, bonusPayload, { merge: true });
            
            // Update the initial state after a successful save
            if (bonus.isActive !== undefined) {
                setInitialIsActive(bonus.isActive);
            }

            toast({
                title: 'Success!',
                description: 'Deposit bonus settings have been saved.',
            });
        } catch (error) {
            console.error("Error saving bonus:", error);
            toast({ variant: "destructive", title: 'Error', description: 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };
    
    const handleChange = (field: keyof DepositBonus, value: any) => {
        const isNumericField = ['percentage', 'minDeposit', 'maxDeposit', 'maxUsers', 'durationHours'].includes(field);
        setBonus(prev => ({ ...prev, [field]: isNumericField ? Number(value) : value }));
    };

    if (loading) {
        return <Skeleton className="w-full h-96" />
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Gift /> Deposit Bonus Configuration</CardTitle>
                <CardDescription>Set up a promotional deposit bonus for your users. When active, this will be displayed on their dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-4">
                     <div>
                        <Label htmlFor="isActive" className="text-base font-medium">Bonus Status</Label>
                        <p className="text-sm text-muted-foreground">Turn the bonus on or off for all users.</p>
                    </div>
                    <Switch
                        id="isActive"
                        checked={bonus.isActive || false}
                        onCheckedChange={(value) => handleChange('isActive', value)}
                        aria-label="Toggle bonus status"
                    />
                </div>
                
                 <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="percentage" className="flex items-center gap-2"><Percent/> Bonus Percentage</Label>
                        <Input id="percentage" type="number" value={bonus.percentage || 0} onChange={(e) => handleChange('percentage', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="durationHours" className="flex items-center gap-2"><Clock/> Bonus Duration (in hours)</Label>
                        <Input id="durationHours" type="number" value={bonus.durationHours || 0} onChange={(e) => handleChange('durationHours', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="maxUsers" className="flex items-center gap-2"><Users/> Max Users</Label>
                        <Input id="maxUsers" type="number" value={bonus.maxUsers || 0} onChange={(e) => handleChange('maxUsers', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="minDeposit" className="flex items-center gap-2"><DollarSign/> Minimum Deposit (LKR)</Label>
                        <Input id="minDeposit" type="number" value={bonus.minDeposit || 0} onChange={(e) => handleChange('minDeposit', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="maxDeposit" className="flex items-center gap-2"><DollarSign/> Maximum Deposit (LKR)</Label>
                        <Input id="maxDeposit" type="number" value={bonus.maxDeposit || 0} onChange={(e) => handleChange('maxDeposit', e.target.value)} />
                    </div>
                </div>

            </CardContent>
             <CardFooter>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Settings'}
                </Button>
            </CardFooter>
        </Card>
    )
}
