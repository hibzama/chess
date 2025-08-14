
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, writeBatch, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, Copy, Share, Users, Clock, Check, X, Loader2, Gamepad2, Target, DollarSign, Info, PowerOff, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { Task, SubTask } from '@/app/admin/tasks/page';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

const subTaskIcons = {
    whatsapp_join: Gift,
    telegram_channel: Gift,
    telegram_group: Gift,
    youtube_subscribe: Gift,
    game_play: Gamepad2,
}

type UserTaskStatus = {
    userId: string;
    userName: string;
    phone: string;
    tasks: { [taskId: string]: { status: 'pending' | 'completed' | 'submitted'; progress?: number; value?: string } };
    claimed: boolean;
    joinedAt: any;
    isCompleted: boolean;
};


const TaskCard = ({ task, onStart, isActive, isDisabled, isCompleted }: { task: Task, onStart: (taskId: string) => void, isActive: boolean, isDisabled: boolean, isCompleted: boolean }) => (
    <Card className={cn("border-2", isActive ? 'border-primary' : 'border-border', isDisabled && !isActive && 'bg-muted/50 opacity-60')}>
        <CardHeader>
            <CardTitle>{task.title}</CardTitle>
            <CardDescription>{task.description}</CardDescription>
        </CardHeader>
        <CardContent>
            <h4 className="font-semibold mb-2">To Get Paid, Your Referrals Must:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
                {task.subTasks.map(st => {
                    const Icon = subTaskIcons[st.type];
                    return (
                        <li key={st.id} className="flex items-center gap-2">
                           <Icon className="w-4 h-4 text-primary" />
                           <span>{st.label} {st.type === 'game_play' && `(${st.target} times)`}</span>
                        </li>
                    )
                })}
            </ul>
        </CardContent>
        <CardFooter className="flex-col items-start gap-4">
            {isActive ? (
                <Badge className="w-full justify-center py-2 text-base">Currently Active</Badge>
            ) : isCompleted ? (
                 <Badge variant="secondary" className="w-full justify-center py-2 text-base">Completed & Claimed</Badge>
            ) : (
                <Button className="w-full" onClick={() => onStart(task.id)} disabled={isDisabled}>Start This Task</Button>
            )}
        </CardFooter>
    </Card>
);


export default function BonusReferralPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [referrals, setReferrals] = useState<UserTaskStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [isClaiming, setIsClaiming] = useState(false);

    const referralLink = useMemo(() => {
        if (typeof window !== 'undefined' && user && userData?.activeReferralTaskId) {
            return `${window.location.origin}/register?aref=${user.uid}&tid=${userData.activeReferralTaskId}`;
        }
        return '';
    }, [user, userData?.activeReferralTaskId]);

    const activeTask = useMemo(() => tasks.find(t => t.id === userData?.activeReferralTaskId), [tasks, userData?.activeReferralTaskId]);
    
    const { validReferrals, pendingReferrals } = useMemo(() => {
        if (!activeTask) return { validReferrals: [], pendingReferrals: [] };
        const valid = referrals.filter(r => r.isCompleted);
        const pending = referrals.filter(r => !r.isCompleted);
        return { validReferrals: valid, pendingReferrals: pending };
    }, [referrals, activeTask]);

    const canClaimTargetBonus = useMemo(() => {
        if (!activeTask || !userData) return false;
        const target = activeTask.referrerTarget || 0;
        const alreadyClaimed = userData.claimedTaskReferralBonus?.includes(activeTask.id);
        return validReferrals.length >= target && !alreadyClaimed;
    }, [activeTask, validReferrals.length, userData]);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const tasksQuery = query(collection(db, 'referral_tasks'));
        const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
            setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
        });

        const referralsQuery = query(collection(db, 'users'), where('taskReferredBy', '==', user.uid));
        const unsubReferrals = onSnapshot(referralsQuery, (snapshot) => {
            const referredUsers = snapshot.docs.map(doc => {
                const data = doc.data();
                const activeTaskId = data.activeReferralTaskId || (userData?.activeReferralTaskId);
                const userTasks = data.taskStatus || {};
                let isCompleted = false;
                
                const currentTaskDetails = tasks.find(t => t.id === activeTaskId);

                if(currentTaskDetails && userTasks[activeTaskId]) {
                    isCompleted = currentTaskDetails.subTasks.every((st: any) => userTasks[activeTaskId][st.id]?.status === 'completed');
                }

                return {
                    userId: doc.id,
                    userName: `${data.firstName} ${data.lastName}`,
                    phone: data.phone || 'Not available',
                    tasks: data.taskStatus || {},
                    claimed: data.taskStatus?.claimed || false,
                    joinedAt: data.createdAt,
                    isCompleted
                }
            });
            setReferrals(referredUsers);
            setLoading(false);
        });

        return () => {
            unsubTasks();
            unsubReferrals();
        };
    }, [user, userData?.activeReferralTaskId, tasks]);

    const copyLink = () => {
        navigator.clipboard.writeText(referralLink);
        toast({ title: 'Copied!', description: 'Referral link copied to clipboard.' });
    };
    
    const handleStartTask = async (taskId: string) => {
        if (!user) return;
        const userRef = doc(db, 'users', user.uid);
        try {
            await updateDoc(userRef, { activeReferralTaskId: taskId });
            toast({ title: 'Task Started!', description: 'Your referral link is now active for this task.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not start the task.' });
        }
    };

     const handleStopTask = async () => {
        if (!user) return;
        const userRef = doc(db, 'users', user.uid);
        try {
            await updateDoc(userRef, { activeReferralTaskId: null });
            toast({ title: 'Task Stopped', description: 'Your active task has been reset.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not stop the task.' });
        }
    };

    const handleClaimTargetBonus = async () => {
        if (!user || !activeTask || !canClaimTargetBonus) return;
        setIsClaiming(true);

        try {
             // Create a bonus claim document for admin approval
            await addDoc(collection(db, 'bonus_claims'), {
                referrerId: user.uid,
                taskId: activeTask.id,
                taskTitle: activeTask.title,
                claimType: 'referrer_target',
                commissionAmount: (activeTask.referrerCommission || 0) * activeTask.referrerTarget,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            
            // Mark this task as claimed to prevent duplicate claims
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                claimedTaskReferralBonus: [...(userData?.claimedTaskReferralBonus || []), activeTask.id],
            });

            toast({ title: "Claim Submitted!", description: `Your claim for LKR ${((activeTask.referrerCommission || 0) * activeTask.referrerTarget).toFixed(2)} is pending admin approval.` });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Error", description: "Failed to submit your claim." });
        } finally {
            setIsClaiming(false);
        }
    };
    
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3"><Gift /> Ref &amp; Earn Bonus</h1>
                <p className="text-muted-foreground">Invite friends to complete tasks and earn rewards for both of you.</p>
            </div>

            {loading ? <Skeleton className="h-48 w-full" /> : activeTask ? (
                 <>
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Your Active Task: {activeTask.title}</CardTitle>
                                    <CardDescription>Share this unique link. When a friend signs up and completes all tasks, you both get a bonus.</CardDescription>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm"><PowerOff className="mr-2"/> Stop Task</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>Stopping this task will reset your referral progress. You can start a new task package afterwards.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleStopTask}>Confirm Stop</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Input readOnly value={referralLink} className="mb-4" />
                            <div className="flex gap-4">
                                <Button onClick={copyLink} className="w-full"><Copy /> Copy</Button>
                                <Button variant="outline" className="w-full" onClick={() => navigator.share({ url: referralLink, title: 'Join me on Nexbattle and earn a bonus!' })}><Share /> Share</Button>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Referrals Must:</CardTitle>
                            <CardDescription>To be counted as a valid referral, new users must complete the following actions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm">
                                {activeTask.subTasks.map(st => {
                                    const Icon = subTaskIcons[st.type];
                                    return (
                                        <li key={st.id} className="flex items-center gap-3 p-2 rounded-md bg-muted">
                                           <Icon className="w-5 h-5 text-primary" />
                                           <span>{st.label} {st.type === 'game_play' && `(${st.target} times)`}</span>
                                        </li>
                                    )
                                })}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Your Referral Target</CardTitle>
                            <CardDescription>Get {activeTask.referrerTarget} users to complete their tasks to claim your commission reward of LKR {(activeTask.referrerCommission * activeTask.referrerTarget).toFixed(2)}.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Progress value={(validReferrals.length / activeTask.referrerTarget) * 100} />
                                <div className="flex justify-between items-center font-semibold">
                                    <span>{validReferrals.length} / {activeTask.referrerTarget} Referrals Completed</span>
                                    {canClaimTargetBonus && (
                                        <div className="text-right">
                                            <p className="text-green-400">Claim LKR {(activeTask.referrerCommission * activeTask.referrerTarget).toFixed(2)}</p>
                                            <Button size="sm" onClick={handleClaimTargetBonus} disabled={isClaiming}>
                                                {isClaiming ? <Loader2 className="animate-spin" /> : "Submit Claim"}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Your Referrals</CardTitle>
                            <CardDescription>Track the progress of users who joined with your link for this task.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="valid">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="valid">Valid Referrals ({validReferrals.length})</TabsTrigger>
                                    <TabsTrigger value="pending">Pending Referrals ({pendingReferrals.length})</TabsTrigger>
                                </TabsList>
                                <TabsContent value="valid">
                                    <ReferralTable referrals={validReferrals} loading={loading} />
                                </TabsContent>
                                <TabsContent value="pending">
                                    <PendingReferralTable referrals={pendingReferrals} activeTask={activeTask} loading={loading} />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                 </>
            ) : (
                <div className="space-y-4">
                     <h2 className="text-2xl font-bold">Choose a Task to Start</h2>
                     <div className="grid md:grid-cols-2 gap-4">
                        {tasks.map(task => (
                             <TaskCard 
                                key={task.id} 
                                task={task} 
                                onStart={handleStartTask} 
                                isActive={false}
                                isCompleted={userData?.claimedTaskReferralBonus?.includes(task.id) ?? false}
                                isDisabled={!!userData?.activeReferralTaskId}
                            />
                        ))}
                     </div>
                </div>
            )}

        </div>
    );
}

const ReferralTable = ({ referrals, loading }: { referrals: UserTaskStatus[], loading: boolean }) => (
    <Table>
        <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Joined</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
            {loading ? <TableRow><TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell></TableRow> : referrals.length > 0 ? (
                referrals.map(ref => (
                     <TableRow key={ref.userId}>
                        <TableCell>{ref.userName}</TableCell>
                        <TableCell>{ref.joinedAt ? format(ref.joinedAt.toDate(), 'PP') : 'N/A'}</TableCell>
                        <TableCell>
                            <Badge variant="default">Completed</Badge>
                        </TableCell>
                    </TableRow>
                ))
            ) : <TableRow><TableCell colSpan={3} className="text-center h-24">No referrals in this list yet.</TableCell></TableRow>}
        </TableBody>
    </Table>
);

const PendingReferralTable = ({ referrals, activeTask, loading }: { referrals: UserTaskStatus[], activeTask: Task, loading: boolean }) => {
    
    const getTaskStatus = (referral: UserTaskStatus, subTask: SubTask) => {
        const taskData = referral.tasks[activeTask.id];
        if (!taskData) return { status: 'pending', Icon: X, color: 'text-red-500' };

        const subTaskData = taskData[subTask.id];
        if (!subTaskData) return { status: 'pending', Icon: X, color: 'text-red-500' };

        if (subTaskData.status === 'completed') {
            return { status: 'Complete', Icon: Check, color: 'text-green-500' };
        }
        if (subTaskData.status === 'submitted') {
             return { status: 'In Review', Icon: Clock, color: 'text-yellow-500' };
        }
        
        return { status: 'Pending', Icon: X, color: 'text-red-500' };
    }
    
    if (loading) {
        return <Skeleton className="h-40 w-full mt-4" />;
    }

    if (referrals.length === 0) {
        return <p className="text-center text-muted-foreground py-8">No pending referrals.</p>
    }
    
    return (
        <Accordion type="single" collapsible className="w-full">
            {referrals.map(ref => (
                 <AccordionItem key={ref.userId} value={ref.userId}>
                    <AccordionTrigger>
                        <div className="flex items-center justify-between w-full pr-4">
                            <div className="text-left">
                                <p className="font-semibold">{ref.userName}</p>
                                <p className="text-sm text-muted-foreground">Joined: {ref.joinedAt ? format(ref.joinedAt.toDate(), 'PP') : 'N/A'}</p>
                            </div>
                            <Badge variant="outline">In Progress</Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="p-4 bg-muted/50 rounded-md space-y-4">
                            <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-4 h-4"/>
                                <span>Contact: {ref.phone}</span>
                            </div>
                            <h4 className="font-semibold text-sm">Incomplete Tasks:</h4>
                            <ul className="space-y-2 text-sm">
                                {activeTask.subTasks.map(st => {
                                    const { status, Icon, color } = getTaskStatus(ref, st);
                                    return (
                                        <li key={st.id} className="flex items-center gap-2">
                                           <Icon className={cn("w-4 h-4", color)} />
                                           <span>{st.label} - <span className={cn("font-semibold", color)}>{status}</span></span>
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    </AccordionContent>
                 </AccordionItem>
            ))}
        </Accordion>
    )
};


