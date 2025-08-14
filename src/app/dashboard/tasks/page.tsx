
'use client'
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, setDoc, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Check, Loader2, Gamepad2, Users, ClipboardCheck, Gift, Youtube, Send, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import type { Task, SubTask } from '@/app/admin/tasks/page';

const subTaskIcons = {
    whatsapp_join: MessageSquare,
    telegram_channel: Send,
    telegram_group: Users,
    youtube_subscribe: Youtube,
    game_play: Gamepad2,
}

export default function UserTasksPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [taskStatus, setTaskStatus] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
    const [isClaiming, setIsClaiming] = useState(false);
    const [whatsAppNumber, setWhatsAppNumber] = useState('');

    useEffect(() => {
        if (!user || !userData?.taskReferredBy) {
            setLoading(false);
            return;
        }

        const tasksQuery = query(collection(db, 'referral_tasks'), where('isActive', '==', true));
        const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
            setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
            setLoading(false);
        });

        const userRef = doc(db, 'users', user.uid);
        const unsubUser = onSnapshot(userRef, (doc) => {
            setTaskStatus(doc.data()?.taskStatus || {});
            setWhatsAppNumber(doc.data()?.phone || '');
        });


        return () => {
            unsubTasks();
            unsubUser();
        };
    }, [user, userData]);

    const handleLinkTaskSubmit = async (taskId: string, subTaskId: string, link: string) => {
        if (!user) return;
        setIsSubmitting(subTaskId);
        try {
            // First, open the link for the user
            window.open(link, '_blank');

            // Then, mark the task as submitted for admin approval
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                [`taskStatus.${taskId}.${subTaskId}.status`]: 'submitted',
                [`taskStatus.${taskId}.${subTaskId}.value`]: 'Clicked', // We can track that they clicked it
            });
            toast({ title: 'Submitted!', description: 'Your task is pending admin verification.' });
        } catch (error) {
             console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not submit your task.' });
        } finally {
             setIsSubmitting(null);
        }
    };
    
    const handleClaimReward = async () => {
        if (!user || !userData?.taskReferredBy || !tasks.length) return;
        
        setIsClaiming(true);
        try {
            const taskPackage = tasks[0]; // Assuming one active task package for now
            // Create pending transaction for the new user
            const newUserBonus = taskPackage.newUserBonus || 0;
            await addDoc(collection(db, 'transactions'), {
                userId: user.uid,
                type: 'task_bonus',
                amount: newUserBonus,
                status: 'pending',
                description: `Bonus for completing: ${taskPackage.title}`,
                fromUserId: userData.taskReferredBy,
                createdAt: serverTimestamp()
            });

            // Create pending transaction for the referrer
            const referrerCommission = taskPackage.referrerCommission || 0;
            await addDoc(collection(db, 'transactions'), {
                userId: userData.taskReferredBy,
                type: 'task_commission',
                amount: referrerCommission,
                status: 'pending',
                description: `Commission for ${userData.firstName}'s task: ${taskPackage.title}`,
                fromUserId: user.uid,
                createdAt: serverTimestamp()
            });

            // Mark tasks as claimed for the user
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { [`taskStatus.${taskPackage.id}.claimed`]: true });

            toast({ title: 'Rewards Claimed!', description: 'Your bonus is pending admin approval.' });
        } catch (error) {
             console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not claim rewards.' });
        } finally {
            setIsClaiming(false);
        }
    };

    const mainTask = tasks[0]; // Assuming only one task package is active at a time
    const allSubTasksCompleted = mainTask?.subTasks?.every(sub => taskStatus[mainTask.id]?.[sub.id]?.status === 'completed');
    const isClaimed = taskStatus[mainTask?.id]?.claimed === true;


    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3"><ClipboardCheck /> Your Tasks</h1>
                <p className="text-muted-foreground">Complete these tasks to earn a special welcome bonus!</p>
            </div>

            {loading ? <Skeleton className="h-64 w-full" /> : mainTask ? (
                <Card>
                    <CardHeader>
                        <CardTitle>{mainTask.title}</CardTitle>
                        <CardDescription>{mainTask.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {mainTask.subTasks.map(subTask => {
                             const status = taskStatus[mainTask.id]?.[subTask.id]?.status || 'pending';
                             const progress = taskStatus[mainTask.id]?.[subTask.id]?.progress || 0;
                             const isCompleted = status === 'completed';
                             const Icon = subTaskIcons[subTask.type];

                             return (
                                <Card key={subTask.id} className={isCompleted ? 'border-green-500/50 bg-green-500/10' : 'bg-muted/50'}>
                                     <CardContent className="p-4 flex items-center gap-4">
                                        <Icon className="w-6 h-6 text-primary flex-shrink-0"/>
                                        <div className="flex-1">
                                            <p className="font-semibold">{subTask.label}</p>
                                            {subTask.type === 'game_play' ? (
                                                <div className="space-y-1 mt-1">
                                                    <Progress value={isCompleted ? 100 : (progress / Number(subTask.target)) * 100} className="h-2"/>
                                                    <p className="text-xs text-muted-foreground">{progress} / {subTask.target} games played</p>
                                                </div>
                                            ) : (
                                                 <p className="text-xs text-muted-foreground break-all">{subTask.target}</p>
                                            )}
                                        </div>
                                        <div className="w-24 text-right">
                                             {status === 'pending' && subTask.type !== 'game_play' && (
                                                <Button size="sm" onClick={() => handleLinkTaskSubmit(mainTask.id, subTask.id, subTask.target)} disabled={isSubmitting === subTask.id}>
                                                    {isSubmitting === subTask.id ? <Loader2 className="animate-spin" /> : 'Do It'}
                                                </Button>
                                             )}
                                             {status === 'submitted' && <Badge variant="secondary">Pending</Badge>}
                                             {status === 'completed' && <Badge className="bg-green-600"><Check/> Done</Badge>}
                                        </div>
                                     </CardContent>
                                </Card>
                             )
                        })}
                    </CardContent>
                </Card>
            ) : (
                <p className="text-center text-muted-foreground py-8">No tasks are currently available.</p>
            )}

            {allSubTasksCompleted && (
                 <Card className="bg-primary/10 border-primary">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary"><Gift/> All Tasks Completed!</CardTitle>
                        <CardDescription>You've finished all the required tasks. You can now claim your rewards.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                         <Button onClick={handleClaimReward} disabled={isClaiming || isClaimed}>
                            {isClaiming ? <Loader2 className="animate-spin"/> : (isClaimed ? 'Reward Claimed (Pending Approval)' : 'Claim My Bonus &amp; Referrer Commission')}
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}

