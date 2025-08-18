
'use client';
import { useState, useEffect } from 'react';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, getDocs, serverTimestamp, deleteDoc, doc, updateDoc, query, where, getCountFromServer, onSnapshot, runTransaction, increment, orderBy, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Edit, Loader2, Users, Gift, Check, X, CheckSquare, User } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import Link from 'next/link';

interface SignupBonusCampaign {
    id: string;
    title: string;
    isActive: boolean;
    bonusAmount: number;
    userLimit: number;
    claimsCount?: number;
    createdAt: any;
}

interface BonusClaim {
    id: string;
    userId: string;
    userName?: string;
    amount: number;
    campaignTitle: string;
    createdAt: any;
}


async function enrichClaims(snapshot: any): Promise<BonusClaim[]> {
    const claimsDataPromises = snapshot.docs.map(async (claimDoc: any) => {
        const data = claimDoc.data();
        const userDoc = await getDoc(doc(db, 'users', data.userId));
        
        return { 
            ...data, 
            id: claimDoc.id, 
            userName: userDoc.exists() ? `${userDoc.data().firstName} ${userDoc.data().lastName}` : 'Unknown User',
        };
    });
    return Promise.all(claimsDataPromises);
}


export default function BonusSettingsPage() {
    const [campaigns, setCampaigns] = useState<SignupBonusCampaign[]>([]);
    const [pendingClaims, setPendingClaims] = useState<BonusClaim[]>([]);
    const [loading, setLoading] = useState(true);
    const [claimsLoading, setClaimsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<SignupBonusCampaign | null>(null);
    const { toast } = useToast();

    const [formState, setFormState] = useState({
        title: '',
        isActive: true,
        bonusAmount: 100,
        userLimit: 250,
    });
    
    useEffect(() => {
        setLoading(true);
        const campaignsQuery = query(collection(db, 'signup_bonus_campaigns'), orderBy('createdAt', 'desc'));
        const unsubscribeCampaigns = onSnapshot(campaignsQuery, async (snapshot) => {
            const campaignsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SignupBonusCampaign));
             const campaignsWithCounts = await Promise.all(campaignsData.map(async (campaign) => {
                const claimsQuery = query(collection(db, `bonus_claims`), where('campaignId', '==', campaign.id));
                const claimsSnapshot = await getCountFromServer(claimsQuery);
                return { ...campaign, claimsCount: claimsSnapshot.data().count };
            }));
            setCampaigns(campaignsWithCounts);
            setLoading(false);
        });

        setClaimsLoading(true);
        const claimsQuery = query(collection(db, 'bonus_claims'), where('type', '==', 'signup'), where('status', '==', 'pending'));
        const unsubscribeClaims = onSnapshot(claimsQuery, async (snapshot) => {
            const claims = await enrichClaims(snapshot);
            setPendingClaims(claims);
            setClaimsLoading(false);
        });

        return () => {
            unsubscribeCampaigns();
            unsubscribeClaims();
        };
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
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete campaign.' });
        }
    };
    
    const handleToggleActive = async (campaign: SignupBonusCampaign) => {
        try {
            await updateDoc(doc(db, 'signup_bonus_campaigns', campaign.id), { isActive: !campaign.isActive });
            toast({ title: 'Status Updated', description: `Campaign is now ${!campaign.isActive ? 'active' : 'inactive'}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
        }
    }
    
     const handleClaimAction = async (claim: BonusClaim, newStatus: 'approved' | 'rejected') => {
        const claimRef = doc(db, 'bonus_claims', claim.id);
        
        try {
            if (newStatus === 'approved') {
                const approveBonusClaim = httpsCallable(functions, 'approveBonusClaim');
                await approveBonusClaim({ claimId: claim.id });
                toast({ title: "Claim Approved", description: "Bonus has been added to the user's wallet." });
            } else { // Rejected
                await updateDoc(claimRef, { status: 'rejected' });
                toast({ title: "Claim Rejected", description: "The claim has been rejected. No funds were added." });
            }
        } catch (error: any) {
            console.error("Error processing claim: ", error);
            toast({ variant: 'destructive', title: "Error", description: error.message });
        }
    };


    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1 space-y-8">
                <Card className="sticky top-4">
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
            </div>

            <div className="lg:col-span-2 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><CheckSquare /> Pending Sign-up Claims</CardTitle>
                        <CardDescription>Approve or reject new user bonus claims.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {claimsLoading ? (
                                    <TableRow><TableCell colSpan={4} className="h-24 text-center">Loading claims...</TableCell></TableRow>
                                ) : pendingClaims.length > 0 ? (
                                    pendingClaims.map(claim => (
                                        <TableRow key={claim.id}>
                                            <TableCell>
                                                <Link href={`/admin/users/${claim.userId}`} className="hover:underline text-primary flex items-center gap-2">
                                                    <User className="w-4 h-4" />
                                                    {claim.userName}
                                                </Link>
                                            </TableCell>
                                            <TableCell>LKR {claim.amount.toFixed(2)}</TableCell>
                                            <TableCell>{claim.createdAt ? format(claim.createdAt.toDate(), 'PPp') : 'N/A'}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="sm" variant="outline" onClick={() => handleClaimAction(claim, 'approved')}>Approve</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleClaimAction(claim, 'rejected')}>Reject</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={4} className="h-24 text-center">No pending sign-up claims.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {loading ? [...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
                 : campaigns.length > 0 ? campaigns.map(c => (
                    <Card key={c.id}>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">{c.title} <Badge variant={c.isActive ? 'default' : 'destructive'}>{c.isActive ? 'Active' : 'Inactive'}</Badge></CardTitle>
                            <CardDescription>Reward: LKR {c.bonusAmount.toFixed(2)}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                             <p><strong>Limit:</strong> {c.claimsCount || 0} / {c.userLimit} claimed</p>
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

    