
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Edit, Loader2, Check, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

export interface Campaign {
    id: string;
    title: string;
    taskDescription: string;
    verificationQuestion: string;
    referralGoal: number;
    referrerBonus: number;
    refereeBonus: number;
    isActive: boolean;
    createdAt: any;
}

export default function ReferralCampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
    const { toast } = useToast();

    const [formState, setFormState] = useState({
        title: '',
        taskDescription: '',
        verificationQuestion: '',
        referralGoal: '10',
        referrerBonus: '100',
        refereeBonus: '10',
        isActive: true
    });

    const fetchCampaigns = async () => {
        setLoading(true);
        const campaignsSnapshot = await getDocs(collection(db, 'referral_campaigns'));
        const campaignsData = campaignsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));
        setCampaigns(campaignsData.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds));
        setLoading(false);
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormState({
            title: '', taskDescription: '', verificationQuestion: '',
            referralGoal: '10', referrerBonus: '100', refereeBonus: '10', isActive: true
        });
        setEditingCampaign(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const campaignData = {
            title: formState.title,
            taskDescription: formState.taskDescription,
            verificationQuestion: formState.verificationQuestion,
            referralGoal: Number(formState.referralGoal),
            referrerBonus: Number(formState.referrerBonus),
            refereeBonus: Number(formState.refereeBonus),
            isActive: formState.isActive,
            createdAt: serverTimestamp()
        };

        try {
            if (editingCampaign) {
                await updateDoc(doc(db, 'referral_campaigns', editingCampaign.id), { ...campaignData, updatedAt: serverTimestamp() });
                toast({ title: 'Success!', description: 'Campaign updated successfully.' });
            } else {
                await addDoc(collection(db, 'referral_campaigns'), campaignData);
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
    
    const handleEdit = (campaign: Campaign) => {
        setEditingCampaign(campaign);
        setFormState({
            title: campaign.title,
            taskDescription: campaign.taskDescription,
            verificationQuestion: campaign.verificationQuestion,
            referralGoal: String(campaign.referralGoal),
            referrerBonus: String(campaign.referrerBonus),
            refereeBonus: String(campaign.refereeBonus),
            isActive: campaign.isActive,
        });
    }

    const handleDelete = async (campaignId: string) => {
        try {
            await deleteDoc(doc(db, 'referral_campaigns', campaignId));
            toast({ title: 'Campaign Deleted', description: 'The campaign has been removed.' });
            fetchCampaigns();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete campaign.' });
        }
    };
    
    const handleToggleActive = async (campaign: Campaign) => {
        try {
            await updateDoc(doc(db, 'referral_campaigns', campaign.id), { isActive: !campaign.isActive });
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
                    <CardTitle>{editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}</CardTitle>
                    <CardDescription>Set up the rules and rewards for a referral campaign.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Campaign Title</Label>
                            <Input id="title" name="title" value={formState.title} onChange={handleInputChange} placeholder="e.g., Join WhatsApp Group" required/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="taskDescription">Task Description for New User</Label>
                            <Textarea id="taskDescription" name="taskDescription" value={formState.taskDescription} onChange={handleInputChange} placeholder="e.g., Click the button in your dashboard to join our official WhatsApp group." required/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="verificationQuestion">Verification Question</Label>
                            <Input id="verificationQuestion" name="verificationQuestion" value={formState.verificationQuestion} onChange={handleInputChange} placeholder="e.g., What is your WhatsApp number?" required/>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="referralGoal">Referral Goal</Label>
                                <Input id="referralGoal" name="referralGoal" type="number" value={formState.referralGoal} onChange={handleInputChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="refereeBonus">Bonus for Referee (LKR)</Label>
                                <Input id="refereeBonus" name="refereeBonus" type="number" value={formState.refereeBonus} onChange={handleInputChange} required />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="referrerBonus">Bonus for Referrer (LKR)</Label>
                            <Input id="referrerBonus" name="referrerBonus" type="number" value={formState.referrerBonus} onChange={handleInputChange} required />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch id="isActive" name="isActive" checked={formState.isActive} onCheckedChange={(checked) => setFormState(s => ({...s, isActive: checked}))} />
                            <Label htmlFor="isActive">Campaign is Active</Label>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin"/> : (editingCampaign ? 'Save Changes' : 'Create Campaign')}
                        </Button>
                        {editingCampaign && <Button variant="ghost" onClick={resetForm}>Cancel Edit</Button>}
                    </CardFooter>
                </form>
            </Card>

            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Existing Campaigns</CardTitle>
                        <CardDescription>Manage all created referral campaigns.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                            [...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
                        ) : campaigns.length > 0 ? (
                            campaigns.map(c => (
                                <Card key={c.id} className="p-4">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <CardTitle className="text-lg">{c.title}</CardTitle>
                                            <p className="text-sm text-muted-foreground">Goal: {c.referralGoal} referrals</p>
                                            <p className="text-sm">Referrer Bonus: LKR {c.referrerBonus}</p>
                                            <p className="text-sm">Referee Bonus: LKR {c.refereeBonus}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-2">
                                                <Button size="icon" variant="outline" onClick={() => handleEdit(c)}><Edit className="w-4 h-4"/></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild><Button size="icon" variant="destructive"><Trash2 className="w-4 h-4"/></Button></AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the campaign. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(c.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Switch checked={c.isActive} onCheckedChange={() => handleToggleActive(c)} />
                                                <Label>{c.isActive ? 'Active' : 'Inactive'}</Label>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-8">No campaigns created yet.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

