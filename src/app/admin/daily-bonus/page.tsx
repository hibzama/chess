
'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, collection, getDocs, where, query } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Calendar as CalendarIcon, Gift, Users, DollarSign, Clock, Wallet, Percent, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, setHours, setMinutes } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface DailyBonus {
    id: string; // e.g., 'daily_bonus_2024-07-28'
    bonusType: 'percentage' | 'fixed';
    amount: number; // For fixed amount
    percentage: number; // For percentage bonus
    maxUsers: number;
    targetAudience: 'all' | 'zero_balance';
    isActive: boolean;
    startTime: Timestamp;
    durationHours: number;
    createdAt?: any;
    updatedAt?: any;
}

interface ClaimedUser {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
}

export default function DailyBonusPage() {
    const [bonus, setBonus] = useState<Partial<DailyBonus>>({
        id: `daily_bonus_${format(new Date(), 'yyyy-MM-dd')}`,
        bonusType: 'fixed',
        amount: 50,
        percentage: 10,
        maxUsers: 100,
        targetAudience: 'all',
        isActive: false,
        durationHours: 24,
        startTime: Timestamp.now(),
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [claimedUsers, setClaimedUsers] = useState<ClaimedUser[]>([]);
    const { toast } = useToast();

    const fetchClaimedUsers = async (bonusId: string) => {
        if (!bonusId) return;
        const claimsQuery = query(collection(db, 'users'), where(`daily_bonus_claims.${bonusId}`, '==', true));
        const claimsSnapshot = await getDocs(claimsQuery);
        const users = claimsSnapshot.docs.map(doc => doc.data() as ClaimedUser);
        setClaimedUsers(users);
    };

    useEffect(() => {
        const fetchBonus = async () => {
            const bonusRef = doc(db, 'settings', 'dailyBonus');
            const bonusSnap = await getDoc(bonusRef);
            if (bonusSnap.exists()) {
                const bonusData = bonusSnap.data() as DailyBonus;
                setBonus(bonusData);
                fetchClaimedUsers(bonusData.id);
            }
            setLoading(false);
        };
        
        fetchBonus();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const bonusRef = doc(db, 'settings', 'dailyBonus');
            
            const bonusPayload: any = {
                 ...bonus,
                 updatedAt: serverTimestamp(),
                 createdAt: bonus.createdAt || serverTimestamp(),
            };

            await setDoc(bonusRef, bonusPayload, { merge: true });
            
            toast({
                title: 'Success!',
                description: 'Daily bonus settings have been saved.',
            });
        } catch (error) {
            console.error("Error saving bonus:", error);
            toast({ variant: "destructive", title: 'Error', description: 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };
    
    const handleChange = (field: keyof DailyBonus, value: any) => {
        const isNumericField = ['amount', 'maxUsers', 'durationHours', 'percentage'].includes(field);
        setBonus(prev => ({ ...prev, [field]: isNumericField ? Number(value) : value }));
    };

    const handleTimeChange = (type: 'hour' | 'minute', value: string) => {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) return;
        
        const currentDate = bonus.startTime ? bonus.startTime.toDate() : new Date();
        let newDate;
        if (type === 'hour') {
            newDate = setHours(currentDate, numValue);
        } else {
            newDate = setMinutes(currentDate, numValue);
        }
        setBonus(prev => ({ ...prev, startTime: Timestamp.fromDate(newDate) }));
    };

    if (loading) {
        return <Skeleton className="w-full h-96" />
    }

    const startHour = bonus.startTime ? bonus.startTime.toDate().getHours() : 0;
    const startMinute = bonus.startTime ? bonus.startTime.toDate().getMinutes() : 0;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Gift /> Daily Bonus Configuration</CardTitle>
                    <CardDescription>Set up a daily bonus for players. This is separate from the deposit bonus.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <Label htmlFor="isActive" className="text-base font-medium">Bonus Status</Label>
                            <p className="text-sm text-muted-foreground">Turn the daily bonus on or off.</p>
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
                                <RadioGroupItem value="fixed" id="fixed-type" />
                                <Label htmlFor="fixed-type">Fixed Amount</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="percentage" id="percentage-type" />
                                <Label htmlFor="percentage-type">Percentage of Wallet</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {bonus.bonusType === 'fixed' ? (
                            <div className="space-y-2">
                                <Label htmlFor="amount" className="flex items-center gap-2"><DollarSign/> Bonus Amount (LKR)</Label>
                                <Input id="amount" type="number" value={bonus.amount || 0} onChange={(e) => handleChange('amount', e.target.value)} />
                            </div>
                        ) : (
                             <div className="space-y-2">
                                <Label htmlFor="percentage" className="flex items-center gap-2"><Percent/> Bonus Percentage (%)</Label>
                                <Input id="percentage" type="number" value={bonus.percentage || 0} onChange={(e) => handleChange('percentage', e.target.value)} />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="maxUsers" className="flex items-center gap-2"><Users/> Max Users</Label>
                            <Input id="maxUsers" type="number" value={bonus.maxUsers || 0} onChange={(e) => handleChange('maxUsers', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="startTime" className="flex items-center gap-2"><CalendarIcon /> Start Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                        {bonus.startTime ? format(bonus.startTime.toDate(), 'PPP') : 'Pick a date'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={bonus.startTime?.toDate()} onSelect={(date) => date && handleChange('startTime', Timestamp.fromDate(date))} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label>Start Time (24h format)</Label>
                            <div className="flex items-center gap-2">
                                <Input type="number" placeholder="Hour" min="0" max="23" value={startHour} onChange={(e) => handleTimeChange('hour', e.target.value)}/>
                                <span>:</span>
                                <Input type="number" placeholder="Minute" min="0" max="59" value={startMinute} onChange={(e) => handleTimeChange('minute', e.target.value)}/>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="durationHours" className="flex items-center gap-2"><Clock/> Bonus Duration (in hours)</Label>
                            <Input id="durationHours" type="number" value={bonus.durationHours || 0} onChange={(e) => handleChange('durationHours', e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2"><Wallet/> Target Audience</Label>
                        <RadioGroup value={bonus.targetAudience} onValueChange={(value) => handleChange('targetAudience', value)} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="all" />
                                <Label htmlFor="all">All Players</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="zero_balance" id="zero_balance" />
                                <Label htmlFor="zero_balance">Zero Balance Players Only</Label>
                            </div>
                        </RadioGroup>
                    </div>

                </CardContent>
                <CardFooter>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Daily Bonus'}
                    </Button>
                </CardFooter>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User/> Claimed Players ({claimedUsers.length})</CardTitle>
                    <CardDescription>List of players who have claimed this daily bonus.</CardDescription>
                </CardHeader>
                <CardContent>
                    {claimedUsers.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {claimedUsers.map(u => (
                                    <TableRow key={u.uid}>
                                        <TableCell>{u.firstName} {u.lastName}</TableCell>
                                        <TableCell>{u.email}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center p-4">No players have claimed this bonus yet.</p>
                    )}
                </CardContent>
             </Card>
        </div>
    )
}
