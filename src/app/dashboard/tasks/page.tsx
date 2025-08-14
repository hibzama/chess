
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
            // Pre-fill inputs if data already exists
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
        if (!user || !inputValue || inputValue.trim() === '') {
            toast({ variant: 'destructive', title: 'Input Required', description: 'Please provide the required information.' });
            return;
        }
        setIsSubmitting(subTask.id);
        try {
            // First, open the link for the user in a new tab
            window.open(subTask.target, '_blank');

            // Then, mark the task as submitted for admin approval
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                [`taskStatus.${taskId}.${subTask.id}.status`]: 'submitted',
                [`taskStatus.${taskId}.${subTask.id}.value`]: inputValue,
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
            
            // Create a bonus claim document for admin approval
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

             // Mark the task package as claimed locally for the user
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
                             const isSubmitted = status === 'submitted';
                             const Icon = subTaskIcons[subTask.type];
                             const requiresInput = subTask.type !== 'game_play';

                             return (
                                <Card key={subTask.id} className={isCompleted ? 'border-green-500/50 bg-green-500/10' : 'bg-muted/50'}>
                                     <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            <Icon className="w-8 h-8 text-primary flex-shrink-0"/>
                                            <div className="flex-1">
                                                <p className="font-semibold">{subTask.label}</p>
                                                {requiresInput ? (
                                                     <p className="text-xs text-muted-foreground break-all">{subTask.target}</p>
                                                ) : (
                                                    <div className="space-y-1 mt-1">
                                                        <Progress value={isCompleted ? 100 : (progress / Number(subTask.target)) * 100} className="h-2"/>
                                                        <p className="text-xs text-muted-foreground">{progress} / {subTask.target} games played</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="w-full sm:w-auto flex flex-col sm:items-end gap-2">
                                             {requiresInput && !isCompleted && !isSubmitted && (
                                                <div className="flex w-full sm:w-64 gap-2">
                                                    <Input 
                                                        placeholder={getInputPlaceholder(subTask.type)} 
                                                        value={taskInputs[subTask.id] || ''}
                                                        onChange={e => handleInputChange(subTask.id, e.target.value)}
                                                        disabled={isSubmitting === subTask.id}
                                                    />
                                                    <Button size="sm" onClick={() => handleVerificationSubmit(mainTask.id, subTask)} disabled={isSubmitting === subTask.id}>
                                                        {isSubmitting === subTask.id ? <Loader2 className="animate-spin" /> : 'Do It'}
                                                    </Button>
                                                </div>
                                             )}
                                             {isSubmitted && <Badge variant="secondary">Pending Review</Badge>}
                                             {isCompleted && <Badge className="bg-green-600"><Check/> Done</Badge>}
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
                            {isClaiming ? <Loader2 className="animate-spin"/> : (isClaimed ? 'Claim Submitted for Review' : `Submit Claim for LKR ${mainTask?.newUserBonus.toFixed(2)}`)}
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}

