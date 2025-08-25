
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck, Loader2, Check, Clock, ExternalLink } from 'lucide-react';
import { Task, BonusTiers } from '@/app/admin/tasks/page';
import { formatDistanceToNowStrict } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const CountdownTimer = ({ targetDate, onEnd }: { targetDate: Date, onEnd?: () => void }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const diff = targetDate.getTime() - now.getTime();
            if (diff <= 0) {
                setTimeLeft('00:00:00');
                clearInterval(interval);
                onEnd?.();
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [targetDate, onEnd]);

    return <span className="font-mono">{timeLeft}</span>;
}

const getBonusForBalance = (tiers: BonusTiers, balance: number): number => {
    if (balance <= 10) return tiers.tier1;
    if (balance <= 50) return tiers.tier2;
    if (balance <= 100) return tiers.tier3;
    if (balance <= 150) return tiers.tier4;
    if (balance <= 200) return tiers.tier5;
    if (balance <= 250) return tiers.tier6;
    return tiers.tier7;
};

const TaskCard = ({ task, onClaimed, alreadyClaimed, balance }: { task: Task, onClaimed: (taskId: string) => void, alreadyClaimed: boolean, balance: number }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [currentWorkIndex, setCurrentWorkIndex] = useState(0);

    const bonus = getBonusForBalance(task.bonusTiers, balance);

    const handleNextWork = () => {
        if (!answers[task.works[currentWorkIndex].id]?.trim()) {
            toast({ variant: 'destructive', title: 'Answer Required', description: 'Please provide an answer for the current work.'});
            return;
        }
        if (currentWorkIndex < task.works.length - 1) {
            setCurrentWorkIndex(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        if (!user || Object.keys(answers).length !== task.works.length) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please complete all work items.'});
            return;
        }
        setIsSubmitting(true);
        try {
            const claimRef = doc(collection(db, 'bonus_claims'));
            await setDoc(claimRef, {
                userId: user.uid,
                type: 'task',
                amount: bonus,
                status: 'pending',
                campaignId: task.id,
                campaignTitle: `Task: ${task.title}`,
                answers,
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
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>{task.title}</CardTitle>
                <CardDescription>Ends in: <CountdownTimer targetDate={task.endDate.toDate()} /></CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="text-sm font-semibold text-green-400">
                    Reward: LKR {bonus.toFixed(2)}
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
                             <DialogDescription>
                                Work {currentWorkIndex + 1} of {task.works.length}. Complete all to claim your reward.
                            </DialogDescription>
                        </DialogHeader>
                         <div className="py-4 space-y-4">
                            <div className="p-4 bg-muted rounded-md space-y-2">
                                <p className="font-semibold">{task.works[currentWorkIndex].description}</p>
                            </div>
                            {task.works[currentWorkIndex].link && (
                                <Button asChild className="w-full">
                                    <a href={task.works[currentWorkIndex].link} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="mr-2"/>
                                        {task.works[currentWorkIndex].buttonText || 'Open Link'}
                                    </a>
                                </Button>
                            )}
                            <div className="space-y-1">
                                <Label htmlFor="answer" className="font-semibold">{task.works[currentWorkIndex].verificationQuestion}</Label>
                                <Textarea 
                                    id="answer" 
                                    value={answers[task.works[currentWorkIndex].id] || ''}
                                    onChange={e => setAnswers(prev => ({...prev, [task.works[currentWorkIndex].id]: e.target.value}))} 
                                    placeholder='Your answer here...'
                                />
                            </div>
                         </div>
                        <DialogFooter>
                            <Button onClick={handleNextWork} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : 
                                 currentWorkIndex < task.works.length - 1 ? 'Next Work' : 'Submit for Review'
                                }
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardFooter>
        </Card>
    )
}

export default function TasksPage() {
    const { user, userData } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [claimedTaskIds, setClaimedTaskIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    const fetchTasks = async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);

        const tasksQuery = query(collection(db, 'tasks'), where('isActive', '==', true));
        const tasksSnapshot = await getDocs(tasksQuery);

        const now = new Date();
        const activeTasks = tasksSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Task))
            .filter(task => task.endDate.toDate() > now);
        
        const claimsQuery = query(collection(db, 'bonus_claims'), where('userId', '==', user.uid), where('type', '==', 'task'));
        const claimsSnapshot = await getDocs(claimsQuery);
        const claimedIds = new Set(claimsSnapshot.docs.map(doc => doc.data().campaignId));
        
        setTasks(activeTasks);
        setClaimedTaskIds(claimedIds);
        setLoading(false);
    };

    useEffect(() => {
        fetchTasks();
    }, [user]);

    const handleClaimed = (taskId: string) => {
        setClaimedTaskIds(prev => new Set(prev).add(taskId));
        fetchTasks();
    }

    const now = new Date();
    const availableTasks = tasks.filter(t => !claimedTaskIds.has(t.id) && t.startDate.toDate() <= now);
    const upcomingTasks = tasks.filter(t => !claimedTaskIds.has(t.id) && t.startDate.toDate() > now);

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
                <h1 className="text-4xl font-bold tracking-tight">Task & Earn</h1>
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
                            <TaskCard key={task.id} task={task} onClaimed={handleClaimed} alreadyClaimed={claimedTaskIds.has(task.id)} balance={userData?.balance || 0} />
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-8 col-span-full">No new tasks available right now. Check back later!</p>
                    )}
                </CardContent>
            </Card>

            {upcomingTasks.length > 0 && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Clock/> Upcoming Tasks</CardTitle>
                        <CardDescription>These tasks are not yet active. Check back soon!</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {upcomingTasks.map(task => (
                             <Card key={task.id} className="opacity-60">
                                <CardHeader>
                                    <CardTitle>{task.title}</CardTitle>
                                    <CardDescription>Starts in: <CountdownTimer targetDate={task.startDate.toDate()} onEnd={fetchTasks} /></CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm font-semibold text-green-400/70">
                                        Tiered Bonus
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full" disabled>Not Active</Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
