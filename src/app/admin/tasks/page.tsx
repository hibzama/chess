
'use client';
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Edit, Loader2, Check, X, ClipboardCheck } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export interface TaskWork {
    id: string;
    description: string;
    verificationQuestion: string;
}

export interface Task {
    id: string;
    title: string;
    works: TaskWork[];
    bonusAmountLow: number; // For users with balance <= 10
    bonusAmountHigh: number; // For users with balance > 10
    startDelayHours: number; // Delay in hours from creation until task is active
    durationHours: number; // Duration in hours task is active
    isActive: boolean;
    createdAt: any;
    startDate?: any;
    endDate?: any;
    claimsCount?: number;
}


export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const { toast } = useToast();

    const getInitialFormState = () => ({
        title: '',
        works: [{ id: `work_${Date.now()}`, description: '', verificationQuestion: '' }] as TaskWork[],
        bonusAmountLow: 5,
        bonusAmountHigh: 2,
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

    const handleWorkChange = (index: number, field: keyof Omit<TaskWork, 'id'>, value: string) => {
        const newWorks = [...formState.works];
        newWorks[index] = { ...newWorks[index], [field]: value };
        setFormState(prev => ({ ...prev, works: newWorks }));
    };

    const addWork = () => {
        setFormState(prev => ({
            ...prev,
            works: [...prev.works, { id: `work_${Date.now()}`, description: '', verificationQuestion: '' }]
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
            bonusAmountLow: Number(formState.bonusAmountLow),
            bonusAmountHigh: Number(formState.bonusAmountHigh),
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
            works: task.works,
            bonusAmountLow: task.bonusAmountLow,
            bonusAmountHigh: task.bonusAmountHigh,
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

    return (
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
                                    <Input value={work.verificationQuestion} onChange={e => handleWorkChange(index, 'verificationQuestion', e.target.value)} placeholder={`e.g., What is your Facebook profile name?`} required/>
                                    {formState.works.length > 1 && <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => removeWork(index)}><X className="h-4 w-4"/></Button>}
                                </div>
                            ))}
                            <Button type="button" variant="outline" onClick={addWork}><PlusCircle className="mr-2"/> Add Work</Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Bonus (Balance &lt;= 10)</Label><Input name="bonusAmountLow" type="number" value={formState.bonusAmountLow} onChange={handleInputChange}/></div>
                            <div className="space-y-2"><Label>Bonus (Balance &gt; 10)</Label><Input name="bonusAmountHigh" type="number" value={formState.bonusAmountHigh} onChange={handleInputChange}/></div>
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
                            <p><strong>Bonus (Low Bal):</strong> LKR {t.bonusAmountLow}</p>
                            <p><strong>Bonus (High Bal):</strong> LKR {t.bonusAmountHigh}</p>
                            <p><strong>Claims:</strong> {t.claimsCount || 0}</p>
                        </CardContent>
                        <CardFooter className="gap-2">
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
    );
}
