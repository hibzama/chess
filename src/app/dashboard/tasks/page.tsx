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
import { Task } from '@/app/admin/tasks/page.tsx';
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
                            {alreadyClaimed ? &lt;&gt;&lt;Check className="mr-2"/&gt; Submitted&lt;/&gt; : "Complete Task"}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{task.title}</DialogTitle>
                            <DialogDescription>{task.description}</DialogDescription>
                        </DialogHeader>
                         &lt;div className="py-4 space-y-2"&gt;
                            &lt;Label htmlFor="answer" className="font-semibold"&gt;{task.verificationQuestion}&lt;/Label&gt;
                            &lt;Textarea id="answer" value={answer} onChange={e =&gt; setAnswer(e.target.value)} placeholder="Your answer here..." /&gt;
                         &lt;/div&gt;
                        &lt;DialogFooter&gt;
                            &lt;Button onClick={handleSubmit} disabled={isSubmitting}&gt;
                                {isSubmitting ? &lt;Loader2 className="animate-spin" /&gt; : "Submit for Review"}
                            &lt;/Button&gt;
                        &lt;/DialogFooter&gt;
                    &lt;/DialogContent&gt;
                &lt;/Dialog&gt;
            </CardFooter>
        &lt;/Card&gt;
    )
}

export default function TasksPage() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState&lt;Task[]&gt;([]);
    const [claimedTaskIds, setClaimedTaskIds] = useState&lt;Set&lt;string&gt;&gt;(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() =&gt; {
        const fetchTasks = async () =&gt; {
            if (!user) {
                setLoading(false);
                return;
            }
            setLoading(true);

            // Fetch active tasks
            const now = Timestamp.now();
            const tasksQuery = query(collection(db, 'tasks'), where('isActive', '==', true), where('endDate', '&gt;', now));
            const tasksSnapshot = await getDocs(tasksQuery);
            const activeTasks = tasksSnapshot.docs.map(doc =&gt; ({ id: doc.id, ...doc.data() } as Task));
            
            // Fetch user's claims for these tasks
            const claimsQuery = query(collection(db, 'bonus_claims'), where('userId', '==', user.uid), where('type', '==', 'task'));
            const claimsSnapshot = await getDocs(claimsQuery);
            const claimedIds = new Set(claimsSnapshot.docs.map(doc =&gt; doc.data().campaignId));
            
            setTasks(activeTasks);
            setClaimedTaskIds(claimedIds);
            setLoading(false);
        };
        fetchTasks();
    }, [user]);

    const handleClaimed = (taskId: string) =&gt; {
        setClaimedTaskIds(prev =&gt; new Set(prev).add(taskId));
    }

    const availableTasks = tasks.filter(t =&gt; !claimedTaskIds.has(t.id));

    if (loading) {
        return (
            &lt;div className="space-y-6"&gt;
                &lt;Skeleton className="h-8 w-1/2" /&gt;
                &lt;div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"&gt;
                    &lt;Skeleton className="h-48 w-full" /&gt;
                    &lt;Skeleton className="h-48 w-full" /&gt;
                    &lt;Skeleton className="h-48 w-full" /&gt;
                &lt;/div&gt;
            &lt;/div&gt;
        )
    }

    return (
        &lt;div className="space-y-8"&gt;
            &lt;div className="text-center"&gt;
                &lt;h1 className="text-4xl font-bold tracking-tight"&gt;Task &amp; Earn&lt;/h1&gt;
                &lt;p className="text-muted-foreground mt-2"&gt;Complete simple tasks to earn bonus rewards.&lt;/p&gt;
            &lt;/div&gt;
            
            &lt;Card&gt;
                &lt;CardHeader&gt;
                    &lt;CardTitle className="flex items-center gap-2"&gt;&lt;ClipboardCheck/&gt; Available Tasks&lt;/CardTitle&gt;
                    &lt;CardDescription&gt;Complete these tasks before they expire to claim your bonus.&lt;/CardDescription&gt;
                &lt;/CardHeader&gt;
                &lt;CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"&gt;
                    {availableTasks.length &gt; 0 ? (
                        availableTasks.map(task =&gt; (
                            &lt;TaskCard key={task.id} task={task} onClaimed={handleClaimed} alreadyClaimed={claimedTaskIds.has(task.id)} /&gt;
                        ))
                    ) : (
                        &lt;p className="text-center text-muted-foreground py-8 col-span-full"&gt;No new tasks available right now. Check back later!&lt;/p&gt;
                    )}
                &lt;/CardContent&gt;
            &lt;/Card&gt;
        &lt;/div&gt;
    )
}
