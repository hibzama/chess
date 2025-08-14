
'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, ClipboardList, Gamepad2, Users, DollarSign, Check, X, Youtube, Send, Link as LinkIcon, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

export type SubTask = {
    id: string;
    type: 'whatsapp_join' | 'telegram_channel' | 'telegram_group' | 'youtube_subscribe' | 'game_play';
    target: string; // URL for social tasks, number for game plays
    label: string;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    subTasks: SubTask[];
    newUserBonus: number;
    referrerCommission: number;
    isActive: boolean;
    createdAt: any;
}

const taskTypeOptions = [
    { value: 'whatsapp_join', label: 'Join WhatsApp Group', icon: MessageSquare },
    { value: 'telegram_channel', label: 'Join Telegram Channel', icon: Send },
    { value: 'telegram_group', label: 'Join Telegram Group', icon: Users },
    { value: 'youtube_subscribe', label: 'Subscribe to YouTube', icon: Youtube },
    { value: 'game_play', label: 'Play Multiplayer Games', icon: Gamepad2 },
]

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const [currentTask, setCurrentTask] = useState<Partial<Task>>({
        title: '',
        description: '',
        subTasks: [],
        newUserBonus: 50,
        referrerCommission: 25,
        isActive: true,
    });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'referral_tasks'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
            setTasks(tasksData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const resetForm = () => {
        setCurrentTask({
            title: '',
            description: '',
            subTasks: [],
            newUserBonus: 50,
            referrerCommission: 25,
            isActive: true,
        });
        setIsEditing(false);
    };

    const handleEdit = (task: Task) => {
        setCurrentTask(task);
        setIsEditing(true);
    };

    const handleDelete = async (taskId: string) => {
        await deleteDoc(doc(db, 'referral_tasks', taskId));
        toast({ title: 'Task Deleted', description: 'The referral task has been successfully deleted.' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentTask.title || !currentTask.description || currentTask.subTasks?.length === 0) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill out the title, description, and add at least one action.' });
            return;
        }

        setIsSubmitting(true);
        const payload: any = { ...currentTask };
        try {
            if (isEditing) {
                const taskRef = doc(db, 'referral_tasks', currentTask.id!);
                await updateDoc(taskRef, payload);
                toast({ title: 'Task Updated', description: 'The task has been successfully updated.' });
            } else {
                payload.createdAt = serverTimestamp();
                await addDoc(collection(db, 'referral_tasks'), payload);
                toast({ title: 'Task Created', description: 'A new referral task has been added.' });
            }
            resetForm();
        } catch (error) {
            console.error('Error submitting task:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit the task.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleAddSubTask = () => {
        const newSubTask: SubTask = {
            id: `subtask_${Date.now()}`,
            type: 'whatsapp_join',
            label: 'Join our main WhatsApp group',
            target: '',
        };
        setCurrentTask(prev => ({...prev, subTasks: [...(prev.subTasks || []), newSubTask]}));
    }

    const handleSubTaskChange = (index: number, field: keyof SubTask, value: any) => {
        if (!currentTask.subTasks) return;
        const newSubTasks = [...currentTask.subTasks];
        (newSubTasks[index] as any)[field] = value;
        setCurrentTask(prev => ({...prev, subTasks: newSubTasks}));
    }
    
    const handleRemoveSubTask = (index: number) => {
        if (!currentTask.subTasks) return;
        const newSubTasks = currentTask.subTasks.filter((_, i) => i !== index);
        setCurrentTask(prev => ({...prev, subTasks: newSubTasks}));
    }

    return (
        <div className="space-y-6">
            <Card>
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {isEditing ? <Edit /> : <PlusCircle />}
                            {isEditing ? 'Edit Referral Task' : 'Create New Referral Task'}
                        </CardTitle>
                        <CardDescription>
                            Define a package of tasks that new users must complete to earn a bonus for themselves and their referrer.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Task Package Title</Label>
                            <Input id="title" placeholder="e.g., Welcome Challenge" value={currentTask.title} onChange={e => setCurrentTask({ ...currentTask, title: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" placeholder="e.g., Complete these simple steps to unlock your bonus!" value={currentTask.description} onChange={e => setCurrentTask({ ...currentTask, description: e.target.value })} required />
                        </div>
                        
                        <Separator />
                        
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <Label>Task Actions</Label>
                                <Button type="button" variant="outline" size="sm" onClick={handleAddSubTask}><PlusCircle className="mr-2"/> Add Action</Button>
                            </div>
                            <div className="space-y-4">
                                {currentTask.subTasks?.map((subTask, index) => (
                                    <Card key={subTask.id} className="p-4 bg-muted/50">
                                        <div className="flex justify-end mb-2">
                                             <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveSubTask(index)}><X className="w-4 h-4"/></Button>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Action Type</Label>
                                                <Select value={subTask.type} onValueChange={(value: SubTask['type']) => handleSubTaskChange(index, 'type', value)}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {taskTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}><opt.icon className="mr-2"/> {opt.label}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{subTask.type === 'game_play' ? 'Number of Games' : 'Target Link/ID'}</Label>
                                                <Input 
                                                    value={subTask.target} 
                                                    onChange={(e) => handleSubTaskChange(index, 'target', e.target.value)} 
                                                    type={subTask.type === 'game_play' ? 'number' : 'text'}
                                                    placeholder={subTask.type === 'game_play' ? 'e.g., 5' : 'https://...'}
                                                    required 
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2 mt-4">
                                             <Label>Display Text</Label>
                                             <Input 
                                                value={subTask.label} 
                                                onChange={(e) => handleSubTaskChange(index, 'label', e.target.value)} 
                                                placeholder="e.g., Join our WhatsApp community"
                                                required 
                                            />
                                        </div>
                                    </Card>
                                ))}
                                {currentTask.subTasks?.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No actions added yet.</p>}
                            </div>
                        </div>

                        <Separator />
                        
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="newUserBonus" className="flex items-center gap-1"><DollarSign /> New User Bonus (LKR)</Label>
                                <Input id="newUserBonus" type="number" value={currentTask.newUserBonus} onChange={e => setCurrentTask({ ...currentTask, newUserBonus: Number(e.target.value) })} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="referrerCommission" className="flex items-center gap-1"><DollarSign /> Referrer Commission (LKR)</Label>
                                <Input id="referrerCommission" type="number" value={currentTask.referrerCommission} onChange={e => setCurrentTask({ ...currentTask, referrerCommission: Number(e.target.value) })} required />
                            </div>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">Activate Task Package</Label>
                                <p className="text-sm text-muted-foreground">
                                    If active, this set of tasks will be assigned to new users.
                                </p>
                            </div>
                            <Switch checked={currentTask.isActive} onCheckedChange={checked => setCurrentTask({ ...currentTask, isActive: checked })} />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        {isEditing && <Button type="button" variant="ghost" onClick={resetForm}>Cancel Edit</Button>}
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : (isEditing ? 'Save Changes' : 'Create Task Package')}</Button>
                    </CardFooter>
                </form>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ClipboardList/> Active &amp; Inactive Tasks</CardTitle>
                    <CardDescription>Manage all created referral task packages.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? <Skeleton className="h-40 w-full" /> : (
                        <div className="space-y-4">
                            {tasks.map(task => (
                                <Card key={task.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div className="flex-1 space-y-1">
                                        <p className="font-semibold">{task.title}</p>
                                        <p className="text-sm text-muted-foreground">{task.description}</p>
                                        <div className="flex items-center gap-4 text-xs pt-2">
                                            <Badge variant={task.isActive ? 'default' : 'secondary'}>{task.isActive ? 'Active' : 'Inactive'}</Badge>
                                            <span className="flex items-center gap-1"><Users className="w-3 h-3"/> New User: LKR {task.newUserBonus}</span>
                                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3"/> Referrer: LKR {task.referrerCommission}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="icon" variant="outline" onClick={() => handleEdit(task)}><Edit className="w-4 h-4" /></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button size="icon" variant="destructive"><Trash2 className="w-4 h-4" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>This action cannot be undone. This will permanently delete the task package.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(task.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </Card>
                            ))}
                            {tasks.length === 0 && <p className="text-center text-muted-foreground py-8">No tasks have been created yet.</p>}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

