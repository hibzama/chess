
'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, deleteField } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Gift, Percent, Users, DollarSign, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export interface DepositBonus {
    id: string;
    bonusType: 'percentage' | 'fixed';
    percentage: number;
    fixedAmount: number;
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
        bonusType: 'percentage',
        percentage: 10,
        fixedAmount: 500,
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
                setBonus(prev => ({...prev, ...data}));
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
            
            const bonusPayload: any = {
                 ...bonus,
                 updatedAt: serverTimestamp(),
                 createdAt: bonus.createdAt || serverTimestamp(),
            };
            
            if(bonus.isActive && !initialIsActive) {
                bonusPayload.startTime = serverTimestamp();
            } else if (!bonus.isActive) {
                bonusPayload.startTime = deleteField();
            }


            await setDoc(bonusRef, bonusPayload, { merge: true });
            
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
        const isNumericField = ['percentage', 'minDeposit', 'maxDeposit', 'maxUsers', 'durationHours', 'fixedAmount'].includes(field);
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

                <div className="space-y-3">
                    <Label className="flex items-center gap-2 font-medium">Bonus Type</Label>
                     <RadioGroup value={bonus.bonusType} onValueChange={(value) => handleChange('bonusType', value)} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="percentage" id="percentage-type" />
                            <Label htmlFor="percentage-type">Percentage Bonus</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="fixed" id="fixed-type" />
                            <Label htmlFor="fixed-type">Fixed Amount Bonus</Label>
                        </div>
                    </RadioGroup>
                </div>
                
                 <div className="grid md:grid-cols-2 gap-6">
                    {bonus.bonusType === 'percentage' && (
                        <div className="space-y-2">
                            <Label htmlFor="percentage" className="flex items-center gap-2"><Percent/> Bonus Percentage</Label>
                            <Input id="percentage" type="number" value={bonus.percentage || 0} onChange={(e) => handleChange('percentage', e.target.value)} />
                        </div>
                    )}
                    {bonus.bonusType === 'fixed' && (
                        <div className="space-y-2">
                            <Label htmlFor="fixedAmount" className="flex items-center gap-2"><DollarSign/> Fixed Bonus Amount (LKR)</Label>
                            <Input id="fixedAmount" type="number" value={bonus.fixedAmount || 0} onChange={(e) => handleChange('fixedAmount', e.target.value)} />
                        </div>
                    )}
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
