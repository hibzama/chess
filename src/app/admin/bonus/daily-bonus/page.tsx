
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, deleteDoc, doc, updateDoc, Timestamp, where, query, getCountFromServer, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Edit, Loader2, Calendar, Check, X, Users, Eye } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface DailyBonusCampaign {
    id: string;
    title: string;
    isActive: boolean;
    eligibility: 'all' | 'below' | 'above';
    balanceThreshold: number;
    bonusType: 'fixed' | 'percentage';
    bonusValue: number;
    startDate: Timestamp;
    endDate: Timestamp;
    userLimit: number;
    claimsCount?: number;
    createdAt: any;
}

interface Claim {
    id: string;
    userId: string;
    userName: string;
    claimedAt: Timestamp;
}

export default function DailyBonusCampaignsPage() {
    const [campaigns, setCampaigns] = useState<DailyBonusCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<DailyBonusCampaign | null>(null);
    const { toast } = useToast();

    const [formState, setFormState] = useState({
        title: '', isActive: true, eligibility: 'all', balanceThreshold: 10,
        bonusType: 'fixed', bonusValue: 5, startDate: new Date(),
        endDate: new Date(new Date().setDate(new Date().getDate() + 7)), userLimit: 100,
    });
    
    const [isClaimsDialogOpen, setIsClaimsDialogOpen] = useState(false);
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loadingClaims, setLoadingClaims] = useState(false);

    const fetchCampaigns = async () => {
        setLoading(true);
        const campaignsSnapshot = await getDocs(collection(db, 'daily_bonus_campaigns'));
        const campaignsData = campaignsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyBonusCampaign));
        
        const campaignsWithCounts = await Promise.all(campaignsData.map(async (campaign) => {
             const claimsQuery = query(collection(db, `daily_bonus_campaigns/${campaign.id}/claims`));
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
        setFormState({
            title: '', isActive: true, eligibility: 'all', balanceThreshold: 10,
            bonusType: 'fixed', bonusValue: 5, startDate: new Date(),
            endDate: new Date(new Date().setDate(new Date().getDate() + 7)), userLimit: 100
        });
        setEditingCampaign(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const campaignData = {
            ...formState,
            balanceThreshold: Number(formState.balanceThreshold),
            bonusValue: Number(formState.bonusValue),
            userLimit: Number(formState.userLimit),
            startDate: Timestamp.fromDate(formState.startDate),
            endDate: Timestamp.fromDate(formState.endDate),
        };

        try {
            if (editingCampaign) {
                await updateDoc(doc(db, 'daily_bonus_campaigns', editingCampaign.id), { ...campaignData, updatedAt: serverTimestamp() });
                toast({ title: 'Success!', description: 'Campaign updated successfully.' });
            } else {
                await addDoc(collection(db, 'daily_bonus_campaigns'), { ...campaignData, createdAt: serverTimestamp() });
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

    const handleEdit = (campaign: DailyBonusCampaign) => {
        setEditingCampaign(campaign);
        setFormState({
            title: campaign.title,
            isActive: campaign.isActive,
            eligibility: campaign.eligibility,
            balanceThreshold: campaign.balanceThreshold,
            bonusType: campaign.bonusType,
            bonusValue: campaign.bonusValue,
            startDate: campaign.startDate.toDate(),
            endDate: campaign.endDate.toDate(),
            userLimit: campaign.userLimit,
        });
    };

    const handleDelete = async (campaignId: string) => {
        try {
            await deleteDoc(doc(db, 'daily_bonus_campaigns', campaignId));
            toast({ title: 'Campaign Deleted', description: 'The campaign has been removed.' });
            fetchCampaigns();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete campaign.' });
        }
    };
    
    const viewClaims = async (campaignId: string) => {
        setIsClaimsDialogOpen(true);
        setLoadingClaims(true);
        const claimsQuery = query(collection(db, `daily_bonus_campaigns/${campaignId}/claims`));
        const claimsSnapshot = await getDocs(claimsQuery);
        const claimsData = await Promise.all(claimsSnapshot.docs.map(async (claimDoc) => {
            const data = claimDoc.data();
            const userDoc = await getDoc(doc(db, 'users', data.userId));
            return {
                id: claimDoc.id,
                ...data,
                userName: userDoc.exists() ? `${userDoc.data().firstName} ${userDoc.data().lastName}` : 'Unknown User'
            } as Claim
        }));
        setClaims(claimsData);
        setLoadingClaims(false);
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <Card className="lg:col-span-1 sticky top-4">
                <CardHeader>
                    <CardTitle>{editingCampaign ? 'Edit Bonus' : 'Create New Daily Bonus'}</CardTitle>
                    <CardDescription>Set up rules for a daily bonus campaign.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2"><Label htmlFor="title">Campaign Title</Label><Input id="title" name="title" value={formState.title} onChange={handleInputChange} placeholder="e.g., Weekend Bonus" required /></div>
                        
                        <div className="space-y-3"><Label>Eligibility</Label>
                            <Select value={formState.eligibility} onValueChange={(v) => setFormState(s => ({...s, eligibility: v as any}))}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Players</SelectItem>
                                    <SelectItem value="below">Balance Below</SelectItem>
                                    <SelectItem value="above">Balance Above</SelectItem>
                                </SelectContent>
                            </Select>
                            {formState.eligibility !== 'all' && <Input type="number" name="balanceThreshold" value={formState.balanceThreshold} onChange={handleInputChange} />}
                        </div>

                        <div className="space-y-3"><Label>Bonus Type</Label>
                             <RadioGroup value={formState.bonusType} onValueChange={(v) => setFormState(s => ({...s, bonusType: v as any}))} className="flex gap-4">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="fixed" id="fixed" /><Label htmlFor="fixed">Fixed</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="percentage" id="percentage" /><Label htmlFor="percentage">Percentage</Label></div>
                            </RadioGroup>
                            <Input name="bonusValue" type="number" value={formState.bonusValue} onChange={handleInputChange} placeholder={formState.bonusType === 'fixed' ? "e.g. 5" : "e.g. 10"}/>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Start Date</Label>
                                <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formState.startDate && "text-muted-foreground")}><Calendar className="mr-2 h-4 w-4" />{formState.startDate ? format(formState.startDate, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent><Calendar mode="single" selected={formState.startDate} onSelect={(d) => d && setFormState(s=>({...s, startDate:d}))} initialFocus/></PopoverContent></Popover>
                            </div>
                            <div className="space-y-2"><Label>End Date</Label>
                                <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formState.endDate && "text-muted-foreground")}><Calendar className="mr-2 h-4 w-4" />{formState.endDate ? format(formState.endDate, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent><Calendar mode="single" selected={formState.endDate} onSelect={(d) => d && setFormState(s=>({...s, endDate:d}))} initialFocus/></PopoverContent></Popover>
                            </div>
                        </div>

                        <div className="space-y-2"><Label>User Limit</Label><Input name="userLimit" type="number" value={formState.userLimit} onChange={handleInputChange}/></div>
                        <div className="flex items-center space-x-2"><Switch id="isActive" name="isActive" checked={formState.isActive} onCheckedChange={(checked) => setFormState(s => ({...s, isActive: checked}))} /><Label htmlFor="isActive">Campaign is Active</Label></div>
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
                            <CardDescription>Reward: {c.bonusType === 'fixed' ? `LKR ${c.bonusValue}` : `${c.bonusValue}%`}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
                             <p><strong>Eligibility:</strong> <span className="capitalize">{c.eligibility} {c.eligibility !== 'all' && c.balanceThreshold}</span></p>
                             <p><strong>Limit:</strong> {c.claimsCount} / {c.userLimit} claimed</p>
                             <p><strong>Starts:</strong> {format(c.startDate.toDate(), 'PPp')}</p>
                             <p><strong>Ends:</strong> {format(c.endDate.toDate(), 'PPp')}</p>
                        </CardContent>
                        <CardFooter className="gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(c)}><Edit className="w-4 h-4 mr-2"/> Edit</Button>
                            <AlertDialog><AlertDialogTrigger asChild><Button size="sm" variant="destructive"><Trash2 className="w-4 h-4 mr-2"/> Delete</Button></AlertDialogTrigger>
                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(c.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                             <Button size="sm" variant="secondary" onClick={() => viewClaims(c.id)}><Eye className="w-4 h-4 mr-2"/> View Claims</Button>
                        </CardFooter>
                    </Card>
                )) : <p className="text-center text-muted-foreground py-8">No campaigns created yet.</p>}
            </div>

            <Dialog open={isClaimsDialogOpen} onOpenChange={setIsClaimsDialogOpen}>
                <DialogContent className="max-w-lg">
                     <DialogHeader><DialogTitle>Claim History</DialogTitle></DialogHeader>
                     <ScrollArea className="h-96">
                         <Table>
                             <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Claimed At</TableHead></TableRow></TableHeader>
                             <TableBody>
                                 {loadingClaims ? <TableRow><TableCell colSpan={2} className="text-center">Loading...</TableCell></TableRow> :
                                  claims.length > 0 ? claims.map(claim => (
                                     <TableRow key={claim.id}><TableCell>{claim.userName}</TableCell><TableCell>{format(claim.claimedAt.toDate(), 'PPp')}</TableCell></TableRow>
                                  )) : <TableRow><TableCell colSpan={2} className="text-center">No claims yet.</TableCell></TableRow>
                                 }
                             </TableBody>
                         </Table>
                     </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}

    