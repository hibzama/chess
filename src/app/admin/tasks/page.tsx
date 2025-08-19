
'use client';
import React, { useState, useEffect } from 'react';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, getDocs, serverTimestamp, deleteDoc, doc, updateDoc, onSnapshot, query, where, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Edit, Loader2, Check, X, ClipboardCheck, DollarSign, Eye } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';


export interface TaskWork {
    id: string;
    description: string;
    verificationQuestion: string;
    link?: string;
    buttonText?: string;
}

export interface BonusTiers {
    tier1: number; // 0-10
    tier2: number; // 10-50
    tier3: number; // 50-100
    tier4: number; // 100-150
    tier5: number; // 150-200
    tier6: number; // 200-250
    tier7: number; // 250+
}

export interface Task {
    id: string;
    title: string;
    works: TaskWork[];
    bonusTiers: BonusTiers;
    startDelayHours: number; // Delay in hours from creation until task is active
    durationHours: number; // Duration in hours task is active
    isActive: boolean;
    createdAt: any;
    startDate?: any;
    endDate?: any;
    claimsCount?: number;
}

interface BonusClaim {
    id: string;
    userId: string;
    userName?: string;
    amount: number;
    campaignTitle: string;
    type: 'task';
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
    answers?: Record<string, string>;
}


async function enrichClaims(snapshot: any): Promise<BonusClaim[]> {
    const claimsDataPromises = snapshot.docs.map(async (claimDoc: any) => {
        const data = claimDoc.data() as BonusClaim;
        const userDoc = await getDoc(doc(db, 'users', data.userId));
        
        return { 
            ...data, 
            id: claimDoc.id, 
            userName: userDoc.exists() ? `${userDoc.data().firstName} ${userDoc.data().lastName}` : 'Unknown User',
        };
    });
    return Promise.all(claimsDataPromises);
}

const ClaimsDialog = ({ task, open, onOpenChange }: { task: Task | null; open: boolean; onOpenChange: (open: boolean) => void }) => {
    const [allClaims, setAllClaims] = useState<BonusClaim[]>([]);
    const [loading, setLoading] = useState(true);
    const [manualBonus, setManualBonus] = useState<Record<string, string>>({});
    const { toast } = useToast();

    useEffect(() => {
        if (!task || !open) return;
        
        setLoading(true);
        const q = query(collection(db, 'bonus_claims'), where('campaignId', '==', task.id));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const claims = await enrichClaims(snapshot);
            setAllClaims(claims.sort((a,b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)));
            setLoading(false);
        });

        return () => unsubscribe();
    }, [task, open, toast]);

    const handleRejectClaim = async (claimId: string) => {
        try {
            await updateDoc(doc(db, 'bonus_claims', claimId), { status: 'rejected' });
            toast({ title: "Claim Rejected", description: "The claim has been rejected. No funds were added." });
        } catch (error: any) {
             toast({ variant: 'destructive', title: "Error", description: "Could not reject claim." });
        }
    }

    const handleManualBonus = async (claim: BonusClaim) => {
        const amount = parseFloat(manualBonus[claim.id] || '0');
        if (amount <= 0) {
            toast({ variant: 'destructive', title: "Invalid Amount", description: "Please enter a valid bonus amount." });
            return;
        }

        try {
            const addManualBonusFunction = httpsCallable(functions, 'addManualBonus');
            await addManualBonusFunction({ 
                claimId: claim.id, 
                amount: amount, 
                userId: claim.userId,
                description: claim.campaignTitle,
            });
            toast({ title: "Bonus Added!", description: `LKR ${amount.toFixed(2)} has been added to the user's wallet.` });
        } catch (error: any) {
            console.error("Error adding manual bonus: ", error);
            toast({ variant: 'destructive', title: "Error", description: error.message });
        }
    }
    
    const pendingClaims = allClaims.filter(c => c.status === 'pending');
    const historyClaims = allClaims.filter(c => c.status !== 'pending');

    const renderTable = (claims: BonusClaim[], type: 'pending' | 'history') => {
        if (loading) {
            return <div className="flex justify-center items-center h-24"><Loader2 className="animate-spin text-primary" /></div>;
        }
        if (claims.length === 0) {
            return <p className="text-center py-8 text-muted-foreground">No {type} claims found.</p>;
        }
        
        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Answers</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {claims.map((claim) => (
                        <TableRow key={claim.id}>
                            <TableCell><Link href={`/admin/users/${claim.userId}`} className="hover:underline text-primary">{claim.userName}</Link></TableCell>
                            <TableCell>
                                <Accordion type="single" collapsible className="w-full max-w-xs"><AccordionItem value="item-1" className="border-b-0"><AccordionTrigger className="py-1 text-xs">View Answers</AccordionTrigger><AccordionContent className="text-xs pt-2 bg-muted p-2 rounded-md space-y-1">{claim.answers ? Object.entries(claim.answers).map(([key, value]) => (<p key={key}><strong>Q:</strong> ...{key.slice(-4)} <strong>A:</strong> {value}</p>)) : <p>No answer.</p>}</AccordionContent></AccordionItem></Accordion>
                            </TableCell>
                            <TableCell>{claim.createdAt ? format(new Date(claim.createdAt.seconds * 1000), 'PPp') : 'N/A'}</TableCell>
                            <TableCell className="text-right">
                                {type === 'pending' ? (
                                    <div className="flex items-center gap-2 justify-end">
                                        <Input
                                            type="number"
                                            placeholder="LKR"
                                            className="w-24 h-8"
                                            value={manualBonus[claim.id] || ''}
                                            onChange={(e) => setManualBonus(prev => ({...prev, [claim.id]: e.target.value}))}
                                        />
                                        <Button size="sm" variant="outline" onClick={() => handleManualBonus(claim)}>Add Balance</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleRejectClaim(claim.id)}>Reject</Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-end">
                                        <Badge variant={claim.status === 'approved' ? 'default' : 'destructive'} className="flex items-center gap-1.5 w-fit ml-auto">
                                            {claim.status === 'approved' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                            <span className="capitalize">{claim.status}</span>
                                        </Badge>
                                        {claim.status === 'approved' && <span className="text-xs text-muted-foreground">LKR {claim.amount.toFixed(2)}</span>}
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        )
    }

    if (!task) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                 <DialogHeader>
                    <DialogTitle>Submissions for: {task.title}</DialogTitle>
                    <DialogDescription>Review and manage all user submissions for this task.</DialogDescription>
                </DialogHeader>
                 <Tabs defaultValue="pending">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="pending">Pending ({loading ? '...' : pendingClaims.length})</TabsTrigger>
                        <TabsTrigger value="history">History ({loading ? '...' : historyClaims.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pending">{renderTable(pendingClaims, 'pending')}</TabsContent>
                    <TabsContent value="history">{renderTable(historyClaims, 'history')}</TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}


export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isClaimsDialogOpen, setIsClaimsDialogOpen] = useState(false);
    const { toast } = useToast();

    const getInitialFormState = () => ({
        title: '',
        works: [{ id: `work_${Date.now()}`, description: '', verificationQuestion: '', link: '', buttonText: '' }] as TaskWork[],
        bonusTiers: {
            tier1: 5, tier2: 0, tier3: 0, tier4: 0, tier5: 0, tier6: 0, tier7: 0
        },
        startDelayHours: 0,
        durationHours: 24,
        isActive: true,
    });

    const [formState, setFormState] = useState(getInitialFormState());

    const fetchTasks = async () => {
        setLoading(true);
        const tasksSnapshot = await getDocs(collection(db, 'tasks'));
        const tasksData = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        setTasks(tasksData.sort((a,b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)));
        setLoading(false);
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };
    
    const handleBonusTierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({
            ...prev,
            bonusTiers: {
                ...prev.bonusTiers,
                [name]: Number(value)
            }
        }));
    };

    const handleWorkChange = (index: number, field: keyof Omit<TaskWork, 'id'>, value: string) => {
        const newWorks = [...formState.works];
        newWorks[index] = { ...newWorks[index], [field]: value };
        setFormState(prev => ({ ...prev, works: newWorks }));
    };

    const addWork = () => {
        setFormState(prev => ({
            ...prev,
            works: [...prev.works, { id: `work_${Date.now()}`, description: '', verificationQuestion: '', link: '', buttonText: '' }]
        }));
    };

    const removeWork = (index: number) => {
        if (formState.works.length <= 1) {
            toast({ variant: "destructive", title: "Cannot remove", description: "A task must have at least one work item." });
            return;
        }
        setFormState(prev => ({ ...prev, works: prev.works.filter((_, i) => i !== index) }));
    };

    const resetForm = () => {
        setFormState(getInitialFormState());
        setEditingTask(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const now = new Date();
        const startDate = new Date(now.getTime() + Number(formState.startDelayHours) * 60 * 60 * 1000);
        const endDate = new Date(startDate.getTime() + Number(formState.durationHours) * 60 * 60 * 1000);

        const taskData = {
            title: formState.title,
            works: formState.works,
            bonusTiers: formState.bonusTiers,
            startDelayHours: Number(formState.startDelayHours),
            durationHours: Number(formState.durationHours),
            isActive: formState.isActive,
            startDate,
            endDate,
        };

        try {
            if (editingTask) {
                await updateDoc(doc(db, 'tasks', editingTask.id), { ...taskData, updatedAt: serverTimestamp() });
                toast({ title: 'Success!', description: 'Task updated successfully.' });
            } else {
                await addDoc(collection(db, 'tasks'), { ...taskData, createdAt: serverTimestamp(), claimsCount: 0 });
                toast({ title: 'Success!', description: 'New task created successfully.' });
            }
            resetForm();
            fetchTasks();
        } catch (error) {
            console.error("Error saving task:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save task.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
     const handleEdit = (task: Task) => {
        setEditingTask(task);
        setFormState({
            title: task.title,
            works: task.works.map(w => ({ ...w, link: w.link || '', buttonText: w.buttonText || '' })),
            bonusTiers: task.bonusTiers,
            startDelayHours: task.startDelayHours,
            durationHours: task.durationHours,
            isActive: task.isActive,
        });
    }

    const handleDelete = async (taskId: string) => {
        try {
            await deleteDoc(doc(db, 'tasks', taskId));
            toast({ title: 'Task Deleted', description: 'The task has been removed.' });
            fetchTasks();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete task.' });
        }
    };
    
    const handleToggleActive = async (task: Task) => {
        try {
            await updateDoc(doc(db, 'tasks', task.id), { isActive: !task.isActive });
            toast({ title: 'Status Updated', description: `Task is now ${!task.isActive ? 'active' : 'inactive'}.` });
            fetchTasks();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
        }
    }
    
     const handleViewClaims = (task: Task) => {
        setSelectedTask(task);
        setIsClaimsDialogOpen(true);
    };

    const bonusTierInputs: { key: keyof BonusTiers, label: string }[] = [
        { key: 'tier1', label: '0 - 10' },
        { key: 'tier2', label: '10 - 50' },
        { key: 'tier3', label: '50 - 100' },
        { key: 'tier4', label: '100 - 150' },
        { key: 'tier5', label: '150 - 200' },
        { key: 'tier6', label: '200 - 250' },
        { key: 'tier7', label: '250+' },
    ];

    return (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <Card className="lg:col-span-1 sticky top-4">
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ClipboardCheck/> {editingTask ? 'Edit Task' : 'Create New Task'}</CardTitle>
                        <CardDescription>Set up a new task for users to complete.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Task Title</Label>
                            <Input id="title" name="title" value={formState.title} onChange={handleInputChange} placeholder="e.g., Social Media Follow" required/>
                        </div>
                        
                        <div className="border p-4 rounded-md space-y-4">
                            <h3 className="font-semibold">Works to Complete</h3>
                            {formState.works.map((work, index) => (
                                <div key={work.id} className="p-3 border rounded-lg space-y-3 relative bg-background/50">
                                    <Label>Work #{index + 1}</Label>
                                    <Textarea value={work.description} onChange={e => handleWorkChange(index, 'description', e.target.value)} placeholder={`e.g., Follow our Facebook page.`} required/>
                                    <Input value={work.link || ''} onChange={e => handleWorkChange(index, 'link', e.target.value)} placeholder={`e.g., https://facebook.com/... (optional)`}/>
                                    <Input value={work.buttonText || ''} onChange={e => handleWorkChange(index, 'buttonText', e.target.value)} placeholder={`Button text, e.g., "Follow Page" (optional)`}/>
                                    <Input value={work.verificationQuestion} onChange={e => handleWorkChange(index, 'verificationQuestion', e.target.value)} placeholder={`e.g., What is your Facebook profile name?`} required/>
                                    {formState.works.length > 1 && <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => removeWork(index)}><X className="h-4 w-4"/></Button>}
                                </div>
                            ))}
                            <Button type="button" variant="outline" onClick={addWork}><PlusCircle className="mr-2"/> Add Work</Button>
                        </div>
                        
                        <div className="space-y-4 border p-4 rounded-md">
                            <h3 className="font-semibold flex items-center gap-2"><DollarSign/> Bonus Tiers</h3>
                            <p className="text-xs text-muted-foreground">Set bonus amounts based on the user's wallet balance at the time of claim.</p>
                            <div className="grid grid-cols-2 gap-4">
                                {bonusTierInputs.map(tier => (
                                    <div key={tier.key} className="space-y-1">
                                        <Label className="text-xs">Balance: {tier.label}</Label>
                                        <Input name={tier.key} type="number" value={formState.bonusTiers[tier.key]} onChange={handleBonusTierChange}/>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Start Delay (Hours)</Label><Input name="startDelayHours" type="number" value={formState.startDelayHours} onChange={handleInputChange}/></div>
                            <div className="space-y-2"><Label>Duration (Hours)</Label><Input name="durationHours" type="number" value={formState.durationHours} onChange={handleInputChange}/></div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch id="isActive" name="isActive" checked={formState.isActive} onCheckedChange={(checked) => setFormState(s => ({...s, isActive: checked}))} />
                            <Label htmlFor="isActive">Task is Active</Label>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin"/> : (editingTask ? 'Save Changes' : 'Create Task')}
                        </Button>
                        {editingTask && <Button variant="ghost" onClick={resetForm}>Cancel</Button>}
                    </CardFooter>
                </form>
            </Card>

            <div className="lg:col-span-2 space-y-4">
                {loading ? [...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
                 : tasks.length > 0 ? tasks.map(t => (
                    <Card key={t.id}>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">{t.title} <Badge variant={t.isActive ? 'default' : 'destructive'}>{t.isActive ? 'Active' : 'Inactive'}</Badge></CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
                            <p><strong>Starts:</strong> {t.startDate ? format(t.startDate.toDate(), 'PPp') : 'N/A'}</p>
                            <p><strong>Ends:</strong> {t.endDate ? format(t.endDate.toDate(), 'PPp') : 'N/A'}</p>
                            <p className="col-span-2"><strong>Bonuses:</strong> Tiered based on balance.</p>
                            <p><strong>Claims:</strong> {t.claimsCount || 0}</p>
                        </CardContent>
                        <CardFooter className="gap-2">
                             <Button size="sm" variant="outline" onClick={() => handleViewClaims(t)}><Eye className="w-4 h-4 mr-2"/> View Claims</Button>
                             <Button size="sm" variant="outline" onClick={() => handleEdit(t)}><Edit className="w-4 h-4 mr-2"/> Edit</Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button size="sm" variant="destructive"><Trash2 className="w-4 h-4 mr-2"/> Delete</Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the task.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(t.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                             <Button size="sm" variant={t.isActive ? 'secondary' : 'default'} onClick={() => handleToggleActive(t)}>
                                {t.isActive ? <><X className="w-4 h-4 mr-2"/> Deactivate</> : <><Check className="w-4 h-4 mr-2"/> Activate</>}
                            </Button>
                        </CardFooter>
                    </Card>
                )) : <p className="text-center text-muted-foreground py-8">No tasks created yet.</p>}
            </div>
        </div>
        <ClaimsDialog task={selectedTask} open={isClaimsDialogOpen} onOpenChange={setIsClaimsDialogOpen} />
        </>
    );
}
