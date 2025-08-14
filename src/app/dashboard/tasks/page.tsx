
'use client'
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, setDoc, addDoc, increment } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Check, Loader2, Gamepad2, Users, ClipboardCheck, Gift, Youtube, Send, MessageSquare, ExternalLink, AlertTriangle, BadgeInfo } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import type { Task, SubTask } from '@/app/admin/tasks/page';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const subTaskIcons = {
    whatsapp_join: MessageSquare,
    telegram_channel: Send,
    telegram_group: Users,
    youtube_subscribe: Youtube,
    game_play: Gamepad2,
}

const getInputPlaceholder = (type: SubTask['type']) => {
    switch(type) {
        case 'whatsapp_join': return "Enter your WhatsApp Number";
        case 'telegram_channel':
        case 'telegram_group':
            return "Enter your Telegram Username";
        case 'youtube_subscribe':
            return "Enter your YouTube Channel Name/Handle";
        default:
            return "Enter required info";
    }
}

export default function UserTasksPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [taskStatus, setTaskStatus] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
    const [isClaiming, setIsClaiming] = useState(false);
    const [taskInputs, setTaskInputs] = useState<{[key: string]: string}>({});

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
            const data = doc.data();
            setTaskStatus(data?.taskStatus || {});
            if (data?.taskStatus) {
                const prefilledInputs: {[key: string]: string} = {};
                Object.values(data.taskStatus).forEach((task: any) => {
                    Object.keys(task).forEach(subTaskId => {
                        if (task[subTaskId]?.value) {
                             prefilledInputs[subTaskId] = task[subTaskId].value;
                        }
                    })
                })
                setTaskInputs(prev => ({...prev, ...prefilledInputs}));
            }
        });


        return () => {
            unsubTasks();
            unsubUser();
        };
    }, [user, userData]);

     const handleInputChange = (subTaskId: string, value: string) => {
        setTaskInputs(prev => ({ ...prev, [subTaskId]: value }));
    };

    const handleVerificationSubmit = async (taskId: string, subTask: SubTask) => {
        const inputValue = taskInputs[subTask.id];
        if (!user || (subTask.type !== 'game_play' && (!inputValue || inputValue.trim() === ''))) {
            toast({ variant: 'destructive', title: 'Input Required', description: 'Please provide the required information.' });
            return;
        }
        setIsSubmitting(subTask.id);
        try {
            if(subTask.type !== 'game_play') {
                window.open(subTask.target, '_blank');
            }
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                [`taskStatus.${taskId}.${subTask.id}.status`]: 'submitted',
                [`taskStatus.${taskId}.${subTask.id}.value`]: inputValue || '',
                [`taskStatus.${taskId}.${subTask.id}.label`]: subTask.label,
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
            const taskPackage = tasks[0]; 
            
            await addDoc(collection(db, 'bonus_claims'), {
                newUserId: user.uid,
                referrerId: userData.taskReferredBy,
                taskId: taskPackage.id,
                taskTitle: taskPackage.title,
                claimType: 'new_user_task',
                bonusAmount: taskPackage.newUserBonus || 0,
                status: 'pending',
                createdAt: serverTimestamp()
            });

            await updateDoc(doc(db, 'users', user.uid), {
                [`taskStatus.${taskPackage.id}.claimed`]: true,
            });

            toast({ title: 'Reward Claim Submitted!', description: `Your claim for LKR ${taskPackage.newUserBonus.toFixed(2)} is now pending admin approval.` });
        } catch (error) {
             console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not submit your claim.' });
        } finally {
            setIsClaiming(false);
        }
    };

    const mainTask = tasks[0];
    const allSubTasksCompleted = mainTask?.subTasks?.every(sub => taskStatus[mainTask.id]?.[sub.id]?.status === 'completed');
    const isClaimed = taskStatus[mainTask?.id]?.claimed === true;


    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3"><ClipboardCheck /> Your Tasks</h1>
                <p className="text-muted-foreground">Complete these tasks to unlock your special welcome bonus!</p>
            </div>
            
            {loading ? <Skeleton className="h-64 w-full" /> : mainTask ? (
                <>
                <Card className="bg-primary/10 border-primary">
                    <CardHeader className="text-center items-center">
                        <Gift className="w-12 h-12 text-primary" />
                        <CardTitle className="text-2xl text-primary">Welcome Bonus</CardTitle>
                        <CardDescription>Complete the tasks below to earn this reward.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-5xl font-bold">LKR {mainTask.newUserBonus.toFixed(2)}</p>
                    </CardContent>
                </Card>

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
                             const isSubmitted = status === 'submitted';
                             const Icon = subTaskIcons[subTask.type];
                             const requiresInput = subTask.type !== 'game_play';

                             return (
                                <Card key={subTask.id} className={cn("overflow-hidden", isCompleted ? 'border-green-500/50 bg-green-500/10' : 'bg-muted/50')}>
                                     <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            <Icon className="w-8 h-8 text-primary flex-shrink-0"/>
                                            <div className="flex-1">
                                                <p className="font-semibold">{subTask.label}</p>
                                                <p className="text-xs text-muted-foreground break-all">{!requiresInput ? `Play ${subTask.target} multiplayer games.` : `Target: ${subTask.target}`}</p>
                                            </div>
                                        </div>
                                         <div className="w-full sm:w-auto flex flex-col items-stretch sm:items-end gap-2">
                                             {requiresInput ? (
                                                <div className="flex w-full sm:w-64 gap-2">
                                                    <Input 
                                                        placeholder={getInputPlaceholder(subTask.type)} 
                                                        value={taskInputs[subTask.id] || ''}
                                                        onChange={e => handleInputChange(subTask.id, e.target.value)}
                                                        disabled={isSubmitting === subTask.id || isSubmitted || isCompleted}
                                                    />
                                                     <Button size="sm" onClick={() => handleVerificationSubmit(mainTask.id, subTask)} disabled={isSubmitting === subTask.id || isSubmitted || isCompleted}>
                                                        {isSubmitting === subTask.id ? <Loader2 className="animate-spin h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                             ): (
                                                 <div className="w-full sm:w-48 text-right">
                                                    <p className="text-sm font-semibold">{progress} / {subTask.target}</p>
                                                 </div>
                                             )}
                                        </div>
                                     </div>
                                      <div className="bg-background/30 px-4 py-2 flex items-center justify-end">
                                            {isCompleted ? <Badge className="bg-green-600"><Check className="mr-1"/> Completed</Badge> :
                                             isSubmitted ? <Badge variant="secondary">Pending Review</Badge> :
                                             <Badge variant="destructive">Pending</Badge>
                                            }
                                        </div>
                                     {subTask.type === 'game_play' && (
                                         <Progress value={(progress / Number(subTask.target)) * 100} className="h-1 rounded-none"/>
                                     )}
                                </Card>
                             )
                        })}
                    </CardContent>
                </Card>
                </>
            ) : (
                 <Alert>
                    <Gift className="h-4 w-4" />
                    <AlertTitle>No Tasks Assigned</AlertTitle>
                    <AlertDescription>
                       You were not referred through a task-based link, so there are no special tasks for you to complete. Enjoy the platform!
                    </AlertDescription>
                </Alert>
            )}

            {allSubTasksCompleted && (
                 <Card className="bg-primary/10 border-primary">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary"><Gift/> All Tasks Completed!</CardTitle>
                        <CardDescription>You've finished all the required tasks. You can now claim your rewards.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                         <Button onClick={handleClaimReward} disabled={isClaiming || isClaimed}>
                            {isClaiming ? <Loader2 className="animate-spin"/> : (isClaimed ? 'Claim Submitted for Review' : `Submit Claim for LKR ${mainTask?.newUserBonus.toFixed(2)}`)}
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
