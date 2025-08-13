
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
import { PlusCircle, Edit, Trash2, ClipboardList, Gamepad2, Users, DollarSign, Check, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export interface Task {
    id: string;
    title: string;
    description: string;
    type: 'whatsapp_join' | 'game_play';
    target: string; // WhatsApp link or number of games
    newUserBonus: number;
    referrerCommission: number;
    isActive: boolean;
    createdAt: any;
}

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const [currentTask, setCurrentTask] = useState<Partial<Task>>({
        title: '',
        description: '',
        type: 'whatsapp_join',
        target: '',
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
            type: 'whatsapp_join',
            target: '',
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
                            Define tasks that new users must complete to earn a bonus for themselves and their referrer.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Task Title</Label>
                            <Input id="title" placeholder="e.g., Join Community Group" value={currentTask.title} onChange={e => setCurrentTask({ ...currentTask, title: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Task Description</Label>
                            <Textarea id="description" placeholder="e.g., Join our official WhatsApp group to get updates." value={currentTask.description} onChange={e => setCurrentTask({ ...currentTask, description: e.target.value })} required />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Task Type</Label>
                                <Select value={currentTask.type} onValueChange={(value: Task['type']) => setCurrentTask({ ...currentTask, type: value })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="whatsapp_join"><Users className="mr-2" /> Join WhatsApp Group</SelectItem>
                                        <SelectItem value="game_play"><Gamepad2 className="mr-2" /> Play Multiplayer Games</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="target">
                                    {currentTask.type === 'whatsapp_join' ? 'WhatsApp Group Link' : 'Number of Games to Play'}
                                </Label>
                                <Input id="target" placeholder={currentTask.type === 'whatsapp_join' ? 'https://chat.whatsapp.com/...' : 'e.g., 5'} value={currentTask.target} onChange={e => setCurrentTask({ ...currentTask, target: e.target.value })} required />
                            </div>
                        </div>
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
                                <Label className="text-base">Activate Task</Label>
                                <p className="text-sm text-muted-foreground">
                                    When active, this task will be assigned to new users.
                                </p>
                            </div>
                            <Switch checked={currentTask.isActive} onCheckedChange={checked => setCurrentTask({ ...currentTask, isActive: checked })} />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        {isEditing && <Button type="button" variant="ghost" onClick={resetForm}>Cancel Edit</Button>}
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : (isEditing ? 'Save Changes' : 'Create Task')}</Button>
                    </CardFooter>
                </form>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ClipboardList/> Active &amp; Inactive Tasks</CardTitle>
                    <CardDescription>Manage all created referral tasks.</CardDescription>
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
                                                    <AlertDialogDescription>This action cannot be undone. This will permanently delete the task.</AlertDialogDescription>
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
