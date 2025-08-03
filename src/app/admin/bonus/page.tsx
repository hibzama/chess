
'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Gift, Percent, Users, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export interface DepositBonus {
    id: string;
    percentage: number;
    minDeposit: number;
    maxDeposit: number;
    maxUsers: number;
    claimedBy: string[];
    isActive: boolean;
    createdAt?: any;
    updatedAt?: any;
}

export default function BonusPage() {
    const [bonus, setBonus] = useState<DepositBonus>({
        id: 'main_bonus',
        percentage: 10,
        minDeposit: 1000,
        maxDeposit: 5000,
        maxUsers: 100,
        claimedBy: [],
        isActive: false,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchBonus = async () => {
            const bonusRef = doc(db, 'settings', 'depositBonus');
            const bonusSnap = await getDoc(bonusRef);
            if (bonusSnap.exists()) {
                setBonus(bonusSnap.data() as DepositBonus);
            }
            setLoading(false);
        };
        fetchBonus();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const bonusRef = doc(db, 'settings', 'depositBonus');
            await setDoc(bonusRef, { 
                ...bonus,
                updatedAt: serverTimestamp(),
                createdAt: bonus.createdAt || serverTimestamp() // Set createdAt only if it doesn't exist
            }, { merge: true });

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
        // Ensure numeric fields are stored as numbers
        const isNumericField = ['percentage', 'minDeposit', 'maxDeposit', 'maxUsers'].includes(field);
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
                        checked={bonus.isActive}
                        onCheckedChange={(value) => handleChange('isActive', value)}
                        aria-label="Toggle bonus status"
                    />
                </div>
                
                 <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="percentage" className="flex items-center gap-2"><Percent/> Bonus Percentage</Label>
                        <Input id="percentage" type="number" value={bonus.percentage} onChange={(e) => handleChange('percentage', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="maxUsers" className="flex items-center gap-2"><Users/> Max Users</Label>
                        <Input id="maxUsers" type="number" value={bonus.maxUsers} onChange={(e) => handleChange('maxUsers', e.target.value)} />
                         <p className="text-sm text-muted-foreground">{bonus.claimedBy.length} / {bonus.maxUsers} claimed</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="minDeposit" className="flex items-center gap-2"><DollarSign/> Minimum Deposit (LKR)</Label>
                        <Input id="minDeposit" type="number" value={bonus.minDeposit} onChange={(e) => handleChange('minDeposit', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="maxDeposit" className="flex items-center gap-2"><DollarSign/> Maximum Deposit (LKR)</Label>
                        <Input id="maxDeposit" type="number" value={bonus.maxDeposit} onChange={(e) => handleChange('maxDeposit', e.target.value)} />
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

    