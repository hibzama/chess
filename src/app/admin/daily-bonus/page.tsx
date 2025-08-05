

'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, getDoc, doc, documentId, where, getDocs, writeBatch, Timestamp, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Calendar as CalendarIcon, Gift, Users, DollarSign, Clock, Wallet, Percent, User, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, setHours, setMinutes } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export interface Bonus {
    id: string;
    title: string;
    bonusType: 'percentage' | 'fixed';
    amount: number; 
    percentage: number;
    maxUsers: number;
    targetAudience: 'all' | 'zero_balance';
    isActive: boolean;
    startTime: Timestamp;
    durationHours: number;
    createdAt?: any;
    updatedAt?: any;
    claimsCount?: number;
}

interface ClaimedUser {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
}

export default function DailyBonusPage() {
    const [newBonus, setNewBonus] = useState<Partial<Bonus>>({
        title: 'Daily Bonus',
        bonusType: 'fixed',
        amount: 50,
        percentage: 10,
        maxUsers: 100,
        targetAudience: 'all',
        isActive: false,
        durationHours: 24,
        startTime: Timestamp.now(),
    });
    const [bonuses, setBonuses] = useState<Bonus[]>([]);
    const [claimedUsers, setClaimedUsers] = useState<{ [key: string]: ClaimedUser[] }>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    // State for editing existing bonuses
    const [editingBonus, setEditingBonus] = useState<Partial<Bonus> | null>(null);

    useEffect(() => {
        const bonusesQuery = query(collection(db, 'bonuses'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(bonusesQuery, (snapshot) => {
            const bonusesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Bonus));
            setBonuses(bonusesData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const fetchClaimedUsers = async (bonusId: string) => {
        const claimsRef = doc(db, 'dailyBonusClaims', bonusId);
        const claimsSnap = await getDoc(claimsRef);
        if (claimsSnap.exists()) {
            const uids = claimsSnap.data().claimedByUids || [];
            if (uids.length > 0) {
                const users: ClaimedUser[] = [];
                for (let i = 0; i < uids.length; i += 10) {
                    const batchUids = uids.slice(i, i + 10);
                    const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', batchUids));
                    const userDocs = await getDocs(usersQuery);
                    userDocs.forEach(doc => users.push({ ...doc.data(), uid: doc.id } as ClaimedUser));
                }
                setClaimedUsers(prev => ({ ...prev, [bonusId]: users }));
            } else {
                 setClaimedUsers(prev => ({ ...prev, [bonusId]: [] }));
            }
        }
    };
    
    const handleUpdateBonus = async (bonusId: string, updatedData: Partial<Bonus>) => {
        setSaving(true);
        const bonusRef = doc(db, 'bonuses', bonusId);
        try {
            await updateDoc(bonusRef, {...updatedData, updatedAt: Timestamp.now()});
            toast({ title: "Success!", description: "Bonus has been updated." });
        } catch(e) {
            console.error(e);
            toast({ variant: 'destructive', title: "Error", description: "Failed to update bonus."});
        } finally {
            setSaving(false);
        }
    }


    const handleCreateBonus = async () => {
        setSaving(true);
        try {
            const batch = writeBatch(db);
            const bonusRef = doc(collection(db, 'bonuses'));

            const bonusPayload: Omit<Bonus, 'id'> = {
                ...newBonus,
                isActive: true, // Let's assume creating it makes it active.
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            } as Omit<Bonus, 'id'>;

            batch.set(bonusRef, bonusPayload);

            const counterRef = doc(db, 'dailyBonusClaims', bonusRef.id);
            batch.set(counterRef, { count: 0, claimedByUids: [] });

            await batch.commit();
            
            toast({
                title: 'Success!',
                description: 'New daily bonus has been created.',
            });
        } catch (error) {
            console.error("Error creating bonus:", error);
            toast({ variant: "destructive", title: 'Error', description: 'Failed to create bonus.' });
        } finally {
            setSaving(false);
        }
    };
    
    const handleChange = (field: keyof Bonus, value: any) => {
        const isNumericField = ['amount', 'maxUsers', 'durationHours', 'percentage'].includes(field);
        setNewBonus(prev => ({ ...prev, [field]: isNumericField ? Number(value) : value }));
    };
    
     const handleEditingChange = (field: keyof Bonus, value: any) => {
        const isNumericField = ['maxUsers'].includes(field);
        setEditingBonus(prev => ({ ...prev, [field]: isNumericField ? Number(value) : value }));
    };

    const handleTimeChange = (type: 'hour' | 'minute', value: string) => {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) return;
        
        const currentDate = newBonus.startTime ? newBonus.startTime.toDate() : new Date();
        let newDate;
        if (type === 'hour') newDate = setHours(currentDate, numValue);
        else newDate = setMinutes(currentDate, numValue);
        
        setNewBonus(prev => ({ ...prev, startTime: Timestamp.fromDate(newDate) }));
    };
    
    const getBonusStatus = (bonus: Bonus) => {
        if (!bonus.isActive) return { text: "Inactive", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" };
        const now = new Date();
        const start = bonus.startTime.toDate();
        const end = new Date(start.getTime() + bonus.durationHours * 60 * 60 * 1000);
        if (now < start) return { text: "Scheduled", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
        if (now > end) return { text: "Expired", color: "bg-red-500/20 text-red-400 border-red-500/30" };
        return { text: "Active", color: "bg-green-500/20 text-green-400 border-green-500/30" };
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PlusCircle /> Create a New Daily Bonus</CardTitle>
                    <CardDescription>Set up a new daily bonus promotion for your players.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">Bonus Title</Label>
                        <Input id="title" value={newBonus.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="e.g., Weekend Special"/>
                    </div>
                    
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2 font-medium">Bonus Type</Label>
                        <RadioGroup value={newBonus.bonusType} onValueChange={(value) => handleChange('bonusType', value)} className="flex gap-4">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="fixed" id="fixed-type" /><Label htmlFor="fixed-type">Fixed Amount</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="percentage" id="percentage-type" /><Label htmlFor="percentage-type">Percentage of Wallet</Label></div>
                        </RadioGroup>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {newBonus.bonusType === 'fixed' ? (
                            <div className="space-y-2">
                                <Label htmlFor="amount"><DollarSign/> Bonus Amount (LKR)</Label>
                                <Input id="amount" type="number" value={newBonus.amount || 0} onChange={(e) => handleChange('amount', e.target.value)} />
                            </div>
                        ) : (
                             <div className="space-y-2">
                                <Label htmlFor="percentage"><Percent/> Bonus Percentage (%)</Label>
                                <Input id="percentage" type="number" value={newBonus.percentage || 0} onChange={(e) => handleChange('percentage', e.target.value)} />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="maxUsers"><Users/> Max Users</Label>
                            <Input id="maxUsers" type="number" value={newBonus.maxUsers || 0} onChange={(e) => handleChange('maxUsers', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="startTime"><CalendarIcon /> Start Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                        {newBonus.startTime ? format(newBonus.startTime.toDate(), 'PPP') : 'Pick a date'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newBonus.startTime?.toDate()} onSelect={(date) => date && handleChange('startTime', Timestamp.fromDate(date))} initialFocus /></PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label>Start Time (24h format)</Label>
                            <div className="flex items-center gap-2">
                                <Input type="number" placeholder="Hour" min="0" max="23" value={newBonus.startTime?.toDate().getHours()} onChange={(e) => handleTimeChange('hour', e.target.value)}/>
                                <span>:</span>
                                <Input type="number" placeholder="Minute" min="0" max="59" value={newBonus.startTime?.toDate().getMinutes()} onChange={(e) => handleTimeChange('minute', e.target.value)}/>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="durationHours"><Clock/> Duration (hours)</Label>
                            <Input id="durationHours" type="number" value={newBonus.durationHours || 0} onChange={(e) => handleChange('durationHours', e.target.value)} />
                        </div>
                         <div className="space-y-3">
                            <Label className="flex items-center gap-2"><Wallet/> Target Audience</Label>
                            <RadioGroup value={newBonus.targetAudience} onValueChange={(value) => handleChange('targetAudience', value)} className="flex gap-4">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="all" /><Label htmlFor="all">All Players</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="zero_balance" id="zero_balance" /><Label htmlFor="zero_balance">Zero Balance Only</Label></div>
                            </RadioGroup>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleCreateBonus} disabled={saving}>{saving ? 'Creating...' : 'Create Bonus'}</Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Bonus History & Management</CardTitle>
                    <CardDescription>View and manage all created daily bonuses.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? <Skeleton className="h-48 w-full"/> : (
                         <Accordion type="single" collapsible className="w-full" onValueChange={(id) => id && fetchClaimedUsers(id)}>
                            {bonuses.map(b => (
                                <AccordionItem key={b.id} value={b.id}>
                                    <AccordionTrigger>
                                        <div className="flex items-center justify-between w-full pr-4">
                                            <div className="text-left">
                                                <p className="font-semibold">{b.title}</p>
                                                <p className="text-sm text-muted-foreground">{format(b.startTime.toDate(), 'PPP p')}</p>
                                            </div>
                                            <Badge variant="outline" className={cn(getBonusStatus(b).color)}>{getBonusStatus(b).text}</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="p-4 bg-muted/50 rounded-md space-y-4">
                                            <div className="space-y-4">
                                                <h4 className="font-semibold">Manage Bonus</h4>
                                                <div className="flex items-center justify-between rounded-lg border p-3">
                                                    <div>
                                                        <Label htmlFor={`isActive-${b.id}`} className="font-medium">Bonus Active</Label>
                                                        <p className="text-xs text-muted-foreground">Turn this bonus on or off.</p>
                                                    </div>
                                                    <Switch
                                                        id={`isActive-${b.id}`}
                                                        checked={editingBonus?.id === b.id ? editingBonus.isActive : b.isActive}
                                                        onCheckedChange={(value) => handleUpdateBonus(b.id, { isActive: value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor={`maxUsers-${b.id}`}>Max Users</Label>
                                                    <Input 
                                                        id={`maxUsers-${b.id}`}
                                                        type="number" 
                                                        defaultValue={b.maxUsers}
                                                        onChange={(e) => handleEditingChange('maxUsers', e.target.value)}
                                                    />
                                                </div>
                                                <Button size="sm" onClick={() => editingBonus && handleUpdateBonus(b.id, {maxUsers: editingBonus.maxUsers})} disabled={saving}>
                                                    {saving ? 'Saving...' : 'Save Max Users'}
                                                </Button>
                                            </div>
                                            <Separator/>
                                             <h4 className="font-semibold mb-2">Claimed Players ({claimedUsers[b.id]?.length || 0} / {b.maxUsers})</h4>
                                             {claimedUsers[b.id] ? (
                                                claimedUsers[b.id].length > 0 ? (
                                                    <Table>
                                                        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead></TableRow></TableHeader>
                                                        <TableBody>
                                                            {claimedUsers[b.id].map(u => (
                                                                <TableRow key={u.uid}><TableCell>{u.firstName} {u.lastName}</TableCell><TableCell>{u.email}</TableCell></TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                ) : <p className="text-sm text-center text-muted-foreground p-4">No claims yet for this bonus.</p>
                                             ) : <Skeleton className="h-24 w-full" />}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                         </Accordion>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

