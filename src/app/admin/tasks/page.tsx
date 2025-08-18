'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Edit, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, setHours, setMinutes, setSeconds } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

export interface Task {
    id: string;
    title: string;
    description: string;
    bonusAmount: number;
    verificationQuestion: string;
    isActive: boolean;
    startDate: Timestamp;
    endDate: Timestamp;
    claimsCount?: number;
    createdAt: any;
}

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const { toast } = useToast();

    const getInitialFormState = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);

        return {
            title: '', description: '', bonusAmount: 10, verificationQuestion: '', isActive: true,
            startDate: now, startHour: now.getHours(), startMinute: now.getMinutes(),
            endDate: tomorrow, endHour: tomorrow.getHours(), endMinute: tomorrow.getMinutes(),
        };
    };

    const [formState, setFormState] = useState(getInitialFormState());

    const fetchTasks = async () => {
        setLoading(true);
        const snapshot = await getDocs(collection(db, 'tasks'));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        setTasks(data.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds));
        setLoading(false);
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormState(getInitialFormState());
        setEditingTask(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        let startDate = setSeconds(setMinutes(setHours(formState.startDate, formState.startHour), formState.startMinute), 0);
        let endDate = setSeconds(setMinutes(setHours(formState.endDate, formState.endHour), formState.endMinute), 0);
        
        const taskData = {
            title: formState.title,
            description: formState.description,
            bonusAmount: Number(formState.bonusAmount),
            verificationQuestion: formState.verificationQuestion,
            isActive: formState.isActive,
            startDate: Timestamp.fromDate(startDate),
            endDate: Timestamp.fromDate(endDate),
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
        const startDate = task.startDate.toDate();
        const endDate = task.endDate.toDate();

        setFormState({
            title: task.title,
            description: task.description,
            bonusAmount: task.bonusAmount,
            verificationQuestion: task.verificationQuestion,
            isActive: task.isActive,
            startDate: startDate,
            startHour: startDate.getHours(),
            startMinute: startDate.getMinutes(),
            endDate: endDate,
            endHour: endDate.getHours(),
            endMinute: endDate.getMinutes(),
        });
    };

    const handleDelete = async (taskId: string) => {
        try {
            await deleteDoc(doc(db, 'tasks', taskId));
            toast({ title: 'Task Deleted', description: 'The task has been removed.' });
            fetchTasks();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete task.' });
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <Card className="lg:col-span-1 sticky top-4">
                <CardHeader>
                    <CardTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</CardTitle>
                    <CardDescription>Set up tasks for users to complete for a reward.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2"><Label htmlFor="title">Task Title</Label><Input id="title" name="title" value={formState.title} onChange={handleInputChange} placeholder="e.g., Share on Facebook" required /></div>
                        <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" value={formState.description} onChange={handleInputChange} placeholder="Detailed instructions for the user." required /></div>
                        <div className="space-y-2"><Label htmlFor="bonusAmount">Bonus Amount (LKR)</Label><Input id="bonusAmount" name="bonusAmount" type="number" value={formState.bonusAmount} onChange={handleInputChange} required /></div>
                        <div className="space-y-2"><Label htmlFor="verificationQuestion">Verification Question</Label><Textarea id="verificationQuestion" name="verificationQuestion" value={formState.verificationQuestion} onChange={handleInputChange} placeholder="e.g., Paste the link to your shared post." required /></div>
                        
                        <div className="space-y-2">
                            <Label>Start Date &amp; Time</Label>
                            <div className="flex gap-2">
                                <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formState.startDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{formState.startDate ? format(formState.startDate, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent><Calendar mode="single" selected={formState.startDate} onSelect={(d) => d && setFormState(s=&gt;({...s, startDate:d}))} initialFocus/></PopoverContent></Popover>
                                <Input type="number" min="0" max="23" placeholder="HH" value={formState.startHour} onChange={e => setFormState(s=&gt;({...s, startHour: Number(e.target.value)}))} className="w-20" />
                                <Input type="number" min="0" max="59" placeholder="MM" value={formState.startMinute} onChange={e => setFormState(s=&gt;({...s, startMinute: Number(e.target.value)}))} className="w-20" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>End Date &amp; Time</Label>
                             <div className="flex gap-2">
                                <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formState.endDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{formState.endDate ? format(formState.endDate, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent><Calendar mode="single" selected={formState.endDate} onSelect={(d) => d && setFormState(s=&gt;({...s, endDate:d}))} initialFocus/></PopoverContent></Popover>
                                <Input type="number" min="0" max="23" placeholder="HH" value={formState.endHour} onChange={e => setFormState(s=&gt;({...s, endHour: Number(e.target.value)}))} className="w-20" />
                                <Input type="number" min="0" max="59" placeholder="MM" value={formState.endMinute} onChange={e => setFormState(s=&gt;({...s, endMinute: Number(e.target.value)}))} className="w-20" />
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-2"><Switch id="isActive" name="isActive" checked={formState.isActive} onCheckedChange={(checked) => setFormState(s => ({...s, isActive: checked}))} /><Label htmlFor="isActive">Task is Active</Label></div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : (editingTask ? 'Save Changes' : 'Create Task')}</Button>
                        {editingTask && <Button variant="ghost" onClick={resetForm}>Cancel</Button>}
                    </CardFooter>
                </form>
            </Card>

            <div className="lg:col-span-2 space-y-4">
                {loading ? [...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
                 : tasks.length &gt; 0 ? tasks.map(t => (
                    <Card key={t.id}>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">{t.title} <Badge variant={t.isActive ? 'default' : 'destructive'}>{t.isActive ? 'Active' : 'Inactive'}</Badge></CardTitle>
                            <CardDescription>Reward: LKR {t.bonusAmount.toFixed(2)}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
                             <p><strong>Claims:</strong> {t.claimsCount || 0}</p>
                             <p><strong>Starts:</strong> {format(t.startDate.toDate(), 'PPp')}</p>
                             <p><strong>Ends:</strong> {format(t.endDate.toDate(), 'PPp')}</p>
                        </CardContent>
                        <CardFooter className="gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(t)}><Edit className="w-4 h-4 mr-2"/> Edit</Button>
                            <AlertDialog><AlertDialogTrigger asChild><Button size="sm" variant="destructive"><Trash2 className="w-4 h-4 mr-2"/> Delete</Button></AlertDialogTrigger>
                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(t.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    </Card>
                )) : <p className="text-center text-muted-foreground py-8">No tasks created yet.</p>}
            </div>
        </div>
    );
}
