
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
import { Check, Loader2, Gamepad2, Users, ClipboardCheck, Gift } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

export default function UserTasksPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const [tasks, setTasks] = useState<any[]>([]);
    const [taskStatus, setTaskStatus] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);

    useEffect(() => {
        if (!user || !userData?.taskReferredBy) {
            setLoading(false);
            return;
        }

        const tasksQuery = query(collection(db, 'referral_tasks'), where('isActive', '==', true));
        const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
            setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        const userRef = doc(db, 'users', user.uid);
        const unsubUser = onSnapshot(userRef, (doc) => {
            setTaskStatus(doc.data()?.taskStatus || {});
        });


        return () => {
            unsubTasks();
            unsubUser();
        };
    }, [user, userData]);

    const handleWhatsAppSubmit = async (taskId: string, whatsAppNumber: string) => {
        if (!user || !whatsAppNumber) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter your WhatsApp number.' });
            return;
        }
        setIsSubmitting(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                [`taskStatus.${taskId}.status`]: 'submitted',
                [`taskStatus.${taskId}.value`]: whatsAppNumber,
                phone: userData?.phone || whatsAppNumber, // Update main profile phone if not set
            });
            toast({ title: 'Submitted!', description: 'Your submission is pending admin approval.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not submit your task.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleClaimReward = async () => {
        if (!user || !userData?.taskReferredBy || !tasks.length) return;
        
        setIsClaiming(true);
        try {
            // Create pending transaction for the new user
            const newUserBonus = tasks.reduce((sum, task) => sum + (task.newUserBonus || 0), 0);
            await addDoc(collection(db, 'transactions'), {
                userId: user.uid,
                type: 'task_bonus',
                amount: newUserBonus,
                status: 'pending',
                description: `Bonus for completing referral tasks`,
                fromUserId: userData.taskReferredBy,
                createdAt: serverTimestamp()
            });

            // Create pending transaction for the referrer
            const referrerCommission = tasks.reduce((sum, task) => sum + (task.referrerCommission || 0), 0);
            await addDoc(collection(db, 'transactions'), {
                userId: userData.taskReferredBy,
                type: 'task_commission',
                amount: referrerCommission,
                status: 'pending',
                description: `Commission for ${userData.firstName}'s completed tasks`,
                fromUserId: user.uid,
                createdAt: serverTimestamp()
            });

            // Mark tasks as claimed for the user
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { 'taskStatus.claimed': true });

            toast({ title: 'Rewards Claimed!', description: 'Your bonus is pending admin approval.' });
        } catch (error) {
             console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not claim rewards.' });
        } finally {
            setIsClaiming(false);
        }
    };


    const allTasksCompleted = tasks.length > 0 && tasks.every(task => taskStatus[task.id]?.status === 'completed');
    const isClaimed = taskStatus.claimed === true;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3"><ClipboardCheck /> Your Tasks</h1>
                <p className="text-muted-foreground">Complete these tasks to earn a special welcome bonus!</p>
            </div>

            {loading ? <Skeleton className="h-64 w-full" /> : tasks.length > 0 ? (
                tasks.map(task => {
                    const status = taskStatus[task.id]?.status || 'pending';
                    const progress = taskStatus[task.id]?.progress || 0;
                    const isCompleted = status === 'completed';

                    return (
                        <Card key={task.id} className={isCompleted ? 'border-green-500/50 bg-green-500/10' : ''}>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>{task.title}</span>
                                    {isCompleted && <Badge variant="default" className="bg-green-600"><Check className="mr-1"/> Completed</Badge>}
                                </CardTitle>
                                <CardDescription>{task.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {task.type === 'whatsapp_join' && (
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        handleWhatsAppSubmit(task.id, (e.target as any).elements.whatsapp.value);
                                    }} className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Button asChild variant="secondary">
                                                <a href={task.target} target="_blank" rel="noopener noreferrer"><Users className="mr-2"/> Join Group</a>
                                            </Button>
                                            <p className="text-sm text-muted-foreground">1. Join the group using the button.</p>
                                        </div>
                                         <div className="space-y-2">
                                            <Label>2. Enter your WhatsApp number for verification:</Label>
                                            <Input name="whatsapp" type="tel" placeholder="Your WhatsApp Number" disabled={status !== 'pending'} />
                                        </div>
                                        {status === 'pending' && <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin"/> : 'Submit for Review'}</Button>}
                                        {status === 'submitted' && <p className="text-sm text-yellow-500">Pending admin verification...</p>}
                                    </form>
                                )}
                                {task.type === 'game_play' && (
                                    <div className="space-y-2">
                                        <p className="text-sm">Play {task.target} multiplayer games to complete this task.</p>
                                        <Progress value={isCompleted ? 100 : (progress / Number(task.target)) * 100} />
                                        <p className="text-xs text-muted-foreground">{progress} / {task.target} games played</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })
            ) : (
                <p className="text-center text-muted-foreground py-8">No tasks are currently available.</p>
            )}

            {allTasksCompleted && (
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

