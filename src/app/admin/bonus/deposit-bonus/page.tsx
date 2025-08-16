
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, deleteDoc, doc, updateDoc, Timestamp, where, query, getCountFromServer, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Edit, Loader2, Calendar, Check, X, Users, Eye, Clock, PercentCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export interface DepositBonusCampaign {
    id: string;
    title: string;
    isActive: boolean;
    percentage: number;
    minDeposit: number;
    maxDeposit: number;
    durationHours: number;
    userLimit: number;
    claimsCount?: number;
    createdAt: any;
    expiresAt?: Timestamp;
}


export default function DepositBonusCampaignsPage() {
    const [campaigns, setCampaigns] = useState<DepositBonusCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<DepositBonusCampaign | null>(null);
    const { toast } = useToast();

    const getInitialFormState = () => ({
        title: '',
        isActive: true,
        percentage: 10,
        minDeposit: 100,
        maxDeposit: 10000,
        durationHours: 24,
        userLimit: 100,
    });

    const [formState, setFormState] = useState(getInitialFormState());

    const fetchCampaigns = async () => {
        setLoading(true);
        const campaignsSnapshot = await getDocs(collection(db, 'deposit_bonus_campaigns'));
        const campaignsData = campaignsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DepositBonusCampaign));
        
        const campaignsWithCounts = await Promise.all(campaignsData.map(async (campaign) => {
             const claimsQuery = query(collection(db, `deposit_bonus_campaigns/${campaign.id}/claims`));
             const claimsSnapshot = await getCountFromServer(claimsQuery);
             return { ...campaign, claimsCount: claimsSnapshot.data().count };
        }));

        setCampaigns(campaignsWithCounts.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds));
        setLoading(false);
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormState(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const resetForm = () => {
        setFormState(getInitialFormState());
        setEditingCampaign(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const campaignData = {
            title: formState.title,
            isActive: formState.isActive,
            percentage: Number(formState.percentage),
            minDeposit: Number(formState.minDeposit),
            maxDeposit: Number(formState.maxDeposit),
            durationHours: Number(formState.durationHours),
            userLimit: Number(formState.userLimit),
        };
        
        let finalData: any = { ...campaignData };
        
        if (campaignData.isActive && !editingCampaign) {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + campaignData.durationHours);
            finalData.expiresAt = Timestamp.fromDate(expiresAt);
        }

        try {
            if (editingCampaign) {
                await updateDoc(doc(db, 'deposit_bonus_campaigns', editingCampaign.id), { ...campaignData, updatedAt: serverTimestamp() });
                toast({ title: 'Success!', description: 'Campaign updated successfully.' });
            } else {
                await addDoc(collection(db, 'deposit_bonus_campaigns'), { ...finalData, createdAt: serverTimestamp() });
                toast({ title: 'Success!', description: 'New campaign created successfully.' });
            }
            resetForm();
            fetchCampaigns();
        } catch (error) {
            console.error("Error saving campaign:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save campaign.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async (campaignId: string) => {
        try {
            await deleteDoc(doc(db, 'deposit_bonus_campaigns', campaignId));
            toast({ title: 'Campaign Deleted', description: 'The campaign has been removed.' });
            fetchCampaigns();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete campaign.' });
        }
    };
    

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <Card className="lg:col-span-1 sticky top-4">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PercentCircle/> {editingCampaign ? 'Edit Bonus' : 'Create Deposit Bonus'}</CardTitle>
                    <CardDescription>Set up rules for a deposit bonus campaign.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2"><Label htmlFor="title">Campaign Title</Label><Input id="title" name="title" value={formState.title} onChange={handleInputChange} placeholder="e.g., Weekend Bonus" required /></div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Bonus Percentage</Label><Input name="percentage" type="number" value={formState.percentage} onChange={handleInputChange}/></div>
                            <div className="space-y-2"><Label>Duration (hours)</Label><Input name="durationHours" type="number" value={formState.durationHours} onChange={handleInputChange}/></div>
                        </div>
                        
                         <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2"><Label>Min Deposit (LKR)</Label><Input name="minDeposit" type="number" value={formState.minDeposit} onChange={handleInputChange}/></div>
                             <div className="space-y-2"><Label>Max Deposit (LKR)</Label><Input name="maxDeposit" type="number" value={formState.maxDeposit} onChange={handleInputChange}/></div>
                        </div>

                        <div className="space-y-2"><Label>User Limit</Label><Input name="userLimit" type="number" value={formState.userLimit} onChange={handleInputChange}/></div>
                        <div className="flex items-center space-x-2"><Switch id="isActive" name="isActive" checked={formState.isActive} onCheckedChange={(checked) => setFormState(s => ({...s, isActive: checked}))} /><Label htmlFor="isActive">Activate Campaign on Creation</Label></div>
                         <p className="text-xs text-muted-foreground">Note: Activating an existing campaign from here does not reset its timer.</p>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : (editingCampaign ? 'Save Changes' : 'Create Campaign')}</Button>
                        {editingCampaign && <Button variant="ghost" onClick={resetForm}>Cancel</Button>}
                    </CardFooter>
                </form>
            </Card>

            <div className="lg:col-span-2 space-y-4">
                {loading ? [...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
                 : campaigns.length > 0 ? campaigns.map(c => (
                    <Card key={c.id}>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">{c.title} <Badge variant={c.isActive ? 'default' : 'destructive'}>{c.isActive ? 'Active' : 'Inactive'}</Badge></CardTitle>
                            <CardDescription>Reward: {c.percentage}% bonus on deposits from LKR {c.minDeposit} to {c.maxDeposit}.</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
                             <p><strong>Limit:</strong> {c.claimsCount || 0} / {c.userLimit} claimed</p>
                             <p><strong>Duration:</strong> {c.durationHours} hours</p>
                             {c.expiresAt && <p><strong>Expires:</strong> {format(c.expiresAt.toDate(), 'PPp')}</p>}
                        </CardContent>
                        <CardFooter className="gap-2">
                            <AlertDialog><AlertDialogTrigger asChild><Button size="sm" variant="destructive"><Trash2 className="w-4 h-4 mr-2"/> Delete</Button></AlertDialogTrigger>
                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(c.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    </Card>
                )) : <p className="text-center text-muted-foreground py-8">No campaigns created yet.</p>}
            </div>
        </div>
    );
}
