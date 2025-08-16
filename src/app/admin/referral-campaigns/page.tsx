
'use client';
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Edit, Loader2, Check, X, Globe, MessageSquare, Send, Link as LinkIcon, Facebook, Eye } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-2.43.03-4.83-.65-6.49-2.31-1.31-1.31-2.12-3.1-2.12-4.99 0-1.89.81-3.69 2.12-4.99 1.66-1.66 4.06-2.34 6.49-2.31.02 1.55.02 3.1-.01 4.65-.54-.03-1.08-.02-1.62-.02-1.09 0-2.19-.17-3.23-.48-.6-.19-1.18-.44-1.73-.78-.26-.16-.52-.33-.78-.51 0-1.02.01-2.03.01-3.04.27.19.52.38.77.57 1.03.78 2.24 1.18 3.54 1.18.57 0 1.14-.03 1.71-.09.08-1.57.03-3.14.03-4.71z" />
    </svg>
);


export interface CampaignTask {
    id: string;
    description: string;
    type: 'generic' | 'link' | 'whatsapp' | 'telegram' | 'facebook' | 'tiktok';
    link?: string;
    buttonText?: string;
    verificationQuestion: string;
    refereeBonus: number;
}

export interface Campaign {
    id: string;
    title: string;
    tasks: CampaignTask[];
    referralGoal: number;
    referrerBonus: number;
    isActive: boolean;
    createdAt: any;
}

interface Participant {
    id: string;
    firstName: string;
    lastName: string;
    referrals: {
        id: string;
        firstName: string;
        lastName: string;
        completedTasks: string[];
    }[];
}

const CampaignDetailsDialog = ({ campaign, open, onOpenChange }: { campaign: Campaign | null, open: boolean, onOpenChange: (open: boolean) => void}) => {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!campaign) return;

        const fetchParticipants = async () => {
            setLoading(true);
            // 1. Find all users who have started this campaign (referrers)
            const activeCampaignsQuery = query(collection(db, `users`), where('campaignInfo.campaignId', '==', null)); // Placeholder, Firestore doesn't support not-equals on subfields well. We must fetch all users with `campaignInfo`
            const usersSnapshot = await getDocs(query(collection(db, 'users')));
            
            const potentialReferrers = usersSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((user: any) => user.active_campaigns?.current?.campaignId === campaign.id);
            
            const participantPromises = usersSnapshot.docs.map(async (userDoc) => {
                const userData = userDoc.data();
                const activeCampaignsRef = collection(db, `users/${userDoc.id}/active_campaigns`);
                const activeCampaignsSnapshot = await getDocs(query(activeCampaignsRef, where("campaignId", "==", campaign.id)));
                
                if (activeCampaignsSnapshot.empty) return null;

                // 2. For each referrer, find their referees for this campaign
                const refereesQuery = query(collection(db, 'users'), where('campaignInfo.referrerId', '==', userDoc.id), where('campaignInfo.campaignId', '==', campaign.id));
                const refereesSnapshot = await getDocs(refereesQuery);
                const referrals = refereesSnapshot.docs.map(refDoc => {
                    const refData = refDoc.data();
                    return {
                        id: refDoc.id,
                        firstName: refData.firstName,
                        lastName: refData.lastName,
                        completedTasks: refData.campaignInfo.completedTasks || []
                    }
                });
                
                return {
                    id: userDoc.id,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    referrals,
                };
            });

            const allParticipants = (await Promise.all(participantPromises)).filter(p => p !== null) as Participant[];
            setParticipants(allParticipants);
            setLoading(false);
        }
        fetchParticipants();
    }, [campaign]);

    if (!campaign) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Campaign Details: {campaign.title}</DialogTitle>
                    <DialogDescription>
                        Tracking participants and their referral progress.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] mt-4">
                    {loading ? <Skeleton className="h-48 w-full"/> : 
                     participants.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {participants.map(p => (
                                <AccordionItem key={p.id} value={p.id}>
                                    <AccordionTrigger>
                                        <div>
                                            <p>{p.firstName} {p.lastName}</p>
                                            <p className="text-sm text-muted-foreground">{p.referrals.length} / {campaign.referralGoal} referrals</p>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        {p.referrals.length > 0 ? (
                                            <div className="space-y-2">
                                                {p.referrals.map(ref => {
                                                    const pendingTasks = campaign.tasks.filter(t => !ref.completedTasks.includes(t.id));
                                                    return (
                                                        <Card key={ref.id} className="p-3 bg-muted/50">
                                                            <p className="font-semibold">{ref.firstName} {ref.lastName}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {pendingTasks.length > 0 
                                                                    ? `Pending: ${pendingTasks.map(t => t.description).join(', ')}`
                                                                    : 'All tasks complete!'
                                                                }
                                                            </p>
                                                        </Card>
                                                    )
                                                })}
                                            </div>
                                        ) : <p className="text-muted-foreground text-sm p-4 text-center">No referrals for this user yet.</p>}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                     ) : <p className="text-muted-foreground text-center p-8">No one has started this campaign yet.</p>
                    }
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}

export default function ReferralCampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const { toast } = useToast();

    const [formState, setFormState] = useState({
        title: '',
        referralGoal: '10',
        referrerBonus: '100',
        isActive: true,
        tasks: [{ id: `task_${Date.now()}`, description: '', type: 'generic', link: '', buttonText: 'Open Link', verificationQuestion: '', refereeBonus: 10 }] as CampaignTask[]
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };
    
    const handleTaskChange = (index: number, field: keyof Omit<CampaignTask, 'id'>, value: string | number) => {
        const newTasks = [...formState.tasks];
        newTasks[index] = { ...newTasks[index], [field]: value };
        setFormState(prev => ({ ...prev, tasks: newTasks }));
    }

    const addTask = () => {
        setFormState(prev => ({
            ...prev,
            tasks: [...prev.tasks, { id: `task_${Date.now()}`, description: '', type: 'generic', link: '', buttonText: 'Open Link', verificationQuestion: '', refereeBonus: 10 }]
        }));
    }

    const removeTask = (index: number) => {
        if(formState.tasks.length <= 1) {
            toast({ variant: "destructive", title: "Cannot remove", description: "A campaign must have at least one task."});
            return;
        }
        setFormState(prev => ({ ...prev, tasks: prev.tasks.filter((_, i) => i !== index) }));
    }


    const resetForm = () => {
        setFormState({
            title: '',
            referralGoal: '10',
            referrerBonus: '100',
            isActive: true,
            tasks: [{ id: `task_${Date.now()}`, description: '', type: 'generic', link: '', buttonText: 'Open Link', verificationQuestion: '', refereeBonus: 10 }]
        });
        setEditingCampaign(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const isLinkRequired = (type: CampaignTask['type']) => !['generic'].includes(type);

        const campaignData = {
            title: formState.title,
            tasks: formState.tasks.map(task => ({
                ...task, 
                refereeBonus: Number(task.refereeBonus),
                link: isLinkRequired(task.type) ? task.link : '',
                buttonText: isLinkRequired(task.type) ? (task.buttonText || 'Open Link') : ''
            })),
            referralGoal: Number(formState.referralGoal),
            referrerBonus: Number(formState.referrerBonus),
            isActive: formState.isActive,
        };

        try {
            if (editingCampaign) {
                await updateDoc(doc(db, 'referral_campaigns', editingCampaign.id), { ...campaignData, updatedAt: serverTimestamp() });
                toast({ title: 'Success!', description: 'Campaign updated successfully.' });
            } else {
                await addDoc(collection(db, 'referral_campaigns'), { ...campaignData, createdAt: serverTimestamp() });
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
            tasks: campaign.tasks.map(t => ({...t, link: t.link || '', buttonText: t.buttonText || 'Open Link' })), // ensure fields are not undefined
            referralGoal: String(campaign.referralGoal),
            referrerBonus: String(campaign.referrerBonus),
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
    
    const viewDetails = (campaign: Campaign) => {
        setSelectedCampaign(campaign);
        setDetailsOpen(true);
    }
    
    const totalRefereeBonus = formState.tasks.reduce((acc, task) => acc + Number(task.refereeBonus || 0), 0);
    const isLinkRequired = (type: CampaignTask['type']) => !['generic'].includes(type);

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
                            <Input id="title" name="title" value={formState.title} onChange={handleInputChange} placeholder="e.g., Complete Onboarding" required/>
                        </div>
                        <div className="border p-4 rounded-md space-y-4">
                            <h3 className="font-semibold">Tasks for New User</h3>
                            {formState.tasks.map((task, index) => (
                                <div key={task.id} className="p-3 border rounded-lg space-y-3 relative bg-background/50">
                                    <Label>Task {index + 1}</Label>
                                    <Select value={task.type} onValueChange={(v) => handleTaskChange(index, 'type', v as any)}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="generic"><Globe className="w-4 h-4 inline-block mr-2"/> Generic Task</SelectItem>
                                            <SelectItem value="link"><LinkIcon className="w-4 h-4 inline-block mr-2"/> Custom Link</SelectItem>
                                            <SelectItem value="whatsapp"><MessageSquare className="w-4 h-4 inline-block mr-2"/> Join WhatsApp</SelectItem>
                                            <SelectItem value="telegram"><Send className="w-4 h-4 inline-block mr-2"/> Join Telegram</SelectItem>
                                            <SelectItem value="facebook"><Facebook className="w-4 h-4 inline-block mr-2"/> Follow on Facebook</SelectItem>
                                            <SelectItem value="tiktok"><TikTokIcon className="w-4 h-4 inline-block mr-2"/> Follow on TikTok</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Textarea value={task.description} onChange={e => handleTaskChange(index, 'description', e.target.value)} placeholder={`e.g., Join our official group.`} required/>
                                    {isLinkRequired(task.type) && (
                                        <>
                                        <Input value={task.link} onChange={e => handleTaskChange(index, 'link', e.target.value)} placeholder={`e.g., https://chat.whatsapp.com/...`} required/>
                                        <Input value={task.buttonText} onChange={e => handleTaskChange(index, 'buttonText', e.target.value)} placeholder={`e.g., Join Group`} required/>
                                        </>
                                    )}
                                    <Input value={task.verificationQuestion} onChange={e => handleTaskChange(index, 'verificationQuestion', e.target.value)} placeholder={`e.g., What is your WhatsApp number?`} required/>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Bonus for this task (LKR)</Label>
                                        <Input type="number" value={task.refereeBonus} onChange={e => handleTaskChange(index, 'refereeBonus', Number(e.target.value))} required/>
                                    </div>
                                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => removeTask(index)}><X className="h-4 w-4"/></Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" onClick={addTask}><PlusCircle className="mr-2"/> Add Task</Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="referralGoal">Referral Goal</Label>
                                <Input id="referralGoal" name="referralGoal" type="number" value={formState.referralGoal} onChange={handleInputChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Total Referee Bonus</Label>
                                <Input value={`LKR ${totalRefereeBonus.toFixed(2)}`} readOnly disabled />
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
                                            <p className="text-sm">Total Referee Bonus: LKR {c.tasks.reduce((a,b) => a + b.refereeBonus, 0)}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-2">
                                                 <Button size="icon" variant="secondary" onClick={() => viewDetails(c)}><Eye className="w-4 h-4"/></Button>
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
            <CampaignDetailsDialog campaign={selectedCampaign} open={detailsOpen} onOpenChange={setDetailsOpen} />
        </div>
    );
}

