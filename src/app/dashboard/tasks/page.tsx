
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck, Loader2, Check } from 'lucide-react';
import { Task } from '@/app/admin/tasks/page';
import { formatDistanceToNowStrict } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const TaskCard = ({ task, onClaimed, alreadyClaimed }: { task: Task, onClaimed: (taskId: string) => void, alreadyClaimed: boolean }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [answer, setAnswer] = useState('');

    const handleSubmit = async () => {
        if (!user || !answer.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please provide an answer.'});
            return;
        }
        setIsSubmitting(true);
        try {
            const claimRef = doc(collection(db, 'bonus_claims'));
            await setDoc(claimRef, {
                userId: user.uid,
                type: 'task',
                amount: task.bonusAmount,
                status: 'pending',
                campaignId: task.id, // Using campaignId field for task ID
                campaignTitle: `Task: ${task.title}`,
                answer: answer,
                createdAt: serverTimestamp(),
            });

            toast({ title: 'Task Submitted!', description: 'Your submission is pending admin approval.'});
            onClaimed(task.id);
        } catch (error) {
            console.error("Error submitting task:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not submit your task.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{task.title}</CardTitle>
                <CardDescription>{task.description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-sm font-semibold text-green-400">
                    Reward: LKR {task.bonusAmount.toFixed(2)}
                </div>
                 <div className="text-xs text-muted-foreground mt-2">
                    Ends in {formatDistanceToNowStrict(task.endDate.toDate())}
                </div>
            </CardContent>
            <CardFooter>
                 <Dialog>
                    <DialogTrigger asChild>
                        <Button className="w-full" disabled={alreadyClaimed}>
                            {alreadyClaimed ? <><Check className="mr-2"/> Submitted</> : "Complete Task"}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{task.title}</DialogTitle>
                            <DialogDescription>{task.description}</DialogDescription>
                        </DialogHeader>
                         <div className="py-4 space-y-2">
                            <Label htmlFor="answer" className="font-semibold">{task.verificationQuestion}</Label>
                            <Textarea id="answer" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Your answer here..." />
                         </div>
                        <DialogFooter>
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit for Review"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardFooter>
        </Card>
    )
}

export default function TasksPage() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [claimedTaskIds, setClaimedTaskIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTasks = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            setLoading(true);

            // Fetch active tasks
            const now = new Date();
            const tasksQuery = query(collection(db, 'tasks'), where('isActive', '==', true));
            const tasksSnapshot = await getDocs(tasksQuery);
            // Client-side filtering for endDate
            const activeTasks = tasksSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Task))
                .filter(task => task.endDate.toDate() > now);
            
            // Fetch user's claims for these tasks
            const claimsQuery = query(collection(db, 'bonus_claims'), where('userId', '==', user.uid), where('type', '==', 'task'));
            const claimsSnapshot = await getDocs(claimsQuery);
            const claimedIds = new Set(claimsSnapshot.docs.map(doc => doc.data().campaignId));
            
            setTasks(activeTasks);
            setClaimedTaskIds(claimedIds);
            setLoading(false);
        };
        fetchTasks();
    }, [user]);

    const handleClaimed = (taskId: string) => {
        setClaimedTaskIds(prev => new Set(prev).add(taskId));
    }

    const availableTasks = tasks.filter(t => !claimedTaskIds.has(t.id));

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-1/2" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight">Task &amp; Earn</h1>
                <p className="text-muted-foreground mt-2">Complete simple tasks to earn bonus rewards.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ClipboardCheck/> Available Tasks</CardTitle>
                    <CardDescription>Complete these tasks before they expire to claim your bonus.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {availableTasks.length > 0 ? (
                        availableTasks.map(task => (
                            <TaskCard key={task.id} task={task} onClaimed={handleClaimed} alreadyClaimed={claimedTaskIds.has(task.id)} />
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-8 col-span-full">No new tasks available right now. Check back later!</p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
