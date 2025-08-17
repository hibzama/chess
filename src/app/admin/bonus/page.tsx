
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, deleteDoc, doc, updateDoc, query, where, getCountFromServer } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Edit, Loader2, Users, Gift, Check, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface SignupBonusCampaign {
    id: string;
    title: string;
    isActive: boolean;
    bonusAmount: number;
    userLimit: number;
    claimsCount?: number;
    createdAt: any;
}


export default function BonusSettingsPage() {
    const [campaigns, setCampaigns] = useState<SignupBonusCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<SignupBonusCampaign | null>(null);
    const { toast } = useToast();

    const [formState, setFormState] = useState({
        title: '',
        isActive: true,
        bonusAmount: 100,
        userLimit: 250,
    });
    
    const fetchCampaigns = async () => {
        setLoading(true);
        const campaignsSnapshot = await getDocs(collection(db, 'signup_bonus_campaigns'));
        const campaignsData = campaignsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SignupBonusCampaign));
        
        const campaignsWithCounts = await Promise.all(campaignsData.map(async (campaign) => {
             const claimsQuery = query(collection(db, `signup_bonus_campaigns/${campaign.id}/claims`));
             const claimsSnapshot = await getCountFromServer(claimsQuery);
             return { ...campaign, claimsCount: claimsSnapshot.data().count };
        }));

        setCampaigns(campaignsWithCounts.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds));
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
        setFormState({ title: '', isActive: true, bonusAmount: 100, userLimit: 250 });
        setEditingCampaign(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const campaignData = {
            title: formState.title,
            isActive: formState.isActive,
            bonusAmount: Number(formState.bonusAmount),
            userLimit: Number(formState.userLimit),
        };

        try {
            if (editingCampaign) {
                await updateDoc(doc(db, 'signup_bonus_campaigns', editingCampaign.id), { ...campaignData, updatedAt: serverTimestamp() });
                toast({ title: 'Success!', description: 'Campaign updated successfully.' });
            } else {
                await addDoc(collection(db, 'signup_bonus_campaigns'), { ...campaignData, createdAt: serverTimestamp() });
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
    
    const handleEdit = (campaign: SignupBonusCampaign) => {
        setEditingCampaign(campaign);
        setFormState({
            title: campaign.title,
            isActive: campaign.isActive,
            bonusAmount: campaign.bonusAmount,
            userLimit: campaign.userLimit,
        });
    }

    const handleDelete = async (campaignId: string) => {
        try {
            await deleteDoc(doc(db, 'signup_bonus_campaigns', campaignId));
            toast({ title: 'Campaign Deleted', description: 'The campaign has been removed.' });
            fetchCampaigns();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete campaign.' });
        }
    };
    
    const handleToggleActive = async (campaign: SignupBonusCampaign) => {
        try {
            await updateDoc(doc(db, 'signup_bonus_campaigns', campaign.id), { isActive: !campaign.isActive });
            toast({ title: 'Status Updated', description: `Campaign is now ${!campaign.isActive ? 'active' : 'inactive'}.` });
            fetchCampaigns();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
        }
    }


    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <Card className="lg:col-span-1 sticky top-4">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Gift/> {editingCampaign ? 'Edit Bonus' : 'Create Sign-up Bonus'}</CardTitle>
                    <CardDescription>Set up rules for a sign-up bonus campaign.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Campaign Title</Label>
                            <Input id="title" name="title" value={formState.title} onChange={handleInputChange} placeholder="e.g., Launch Promotion" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bonusAmount">Bonus Amount (LKR)</Label>
                            <Input id="bonusAmount" name="bonusAmount" type="number" value={formState.bonusAmount} onChange={handleInputChange}/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="userLimit">User Limit</Label>
                            <Input id="userLimit" name="userLimit" type="number" value={formState.userLimit} onChange={handleInputChange}/>
                             <p className="text-xs text-muted-foreground">The first N users to register during this campaign will receive this bonus.</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch id="isActive" name="isActive" checked={formState.isActive} onCheckedChange={(checked) => setFormState(s => ({...s, isActive: checked}))} />
                            <Label htmlFor="isActive">Campaign is Active</Label>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : (editingCampaign ? 'Save Changes' : 'Create Campaign')}
                        </Button>
                         {editingCampaign && <Button variant="ghost" onClick={resetForm}>Cancel Edit</Button>}
                    </CardFooter>
                </form>
            </Card>

            <div className="lg:col-span-2 space-y-4">
                {loading ? [...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
                 : campaigns.length > 0 ? campaigns.map(c => (
                    <Card key={c.id}>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">{c.title} <Badge variant={c.isActive ? 'default' : 'destructive'}>{c.isActive ? 'Active' : 'Inactive'}</Badge></CardTitle>
                            <CardDescription>Reward: LKR {c.bonusAmount.toFixed(2)}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                             <p><strong>Limit:</strong> {c.claimsCount} / {c.userLimit} claimed</p>
                        </CardContent>
                        <CardFooter className="gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(c)}><Edit className="w-4 h-4 mr-2"/> Edit</Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button size="sm" variant="destructive"><Trash2 className="w-4 h-4 mr-2"/> Delete</Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone and will remove the campaign permanently.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(c.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                             <Button size="sm" variant={c.isActive ? 'secondary' : 'default'} onClick={() => handleToggleActive(c)}>
                                {c.isActive ? <><X className="w-4 h-4 mr-2"/> Deactivate</> : <><Check className="w-4 h-4 mr-2"/> Activate</>}
                            </Button>
                        </CardFooter>
                    </Card>
                )) : <p className="text-center text-muted-foreground py-8">No sign-up bonus campaigns created yet.</p>}
            </div>
        </div>
    );
}
