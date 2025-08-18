
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, writeBatch, collection, serverTimestamp, addDoc, updateDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Loader2, Check, CheckCircle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { Campaign, CampaignTask } from '@/app/admin/referral-campaigns/page';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function YourTaskPage() {
    const { user, userData, setUserData } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [tasks, setTasks] = useState<CampaignTask[]>([]);
    const [completedTasks, setCompletedTasks] = useState<CampaignTask[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!userData) return;

        if (!userData.campaignInfo) {
            router.push('/dashboard');
            return;
        }

        const fetchCampaignData = async () => {
            setLoading(true);
            const campaignDoc = await getDoc(doc(db, 'referral_campaigns', userData.campaignInfo!.campaignId));
            if (campaignDoc.exists()) {
                const campaignData = { id: campaignDoc.id, ...campaignDoc.data() } as Campaign;
                setCampaign(campaignData);

                const completedTaskIds = new Set(userData.campaignInfo!.completedTasks || []);
                const pending = campaignData.tasks.filter(task => !completedTaskIds.has(task.id));
                const completed = campaignData.tasks.filter(task => completedTaskIds.has(task.id));
                
                setTasks(pending);
                setCompletedTasks(completed);

            } else {
                router.push('/dashboard');
            }
            setLoading(false);
        };
        fetchCampaignData();
    }, [userData, router]);

    const handleAnswerChange = (taskId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [taskId]: value }));
    };

    const handleSubmit = async (task: CampaignTask) => {
        const answer = answers[task.id];
        if (!answer?.trim() || !user || !userData?.campaignInfo || !campaign) return;
        
        setIsSubmitting(true);
        
        try {
            const batch = writeBatch(db);
            const userRef = doc(db, 'users', user.uid);
            const newCompletedTasks = [...(userData.campaignInfo.completedTasks || []), task.id];
            
            // 1. Update the user's document to show they've completed the task.
            batch.update(userRef, {
                'campaignInfo.completedTasks': newCompletedTasks,
                'campaignInfo.answers': {
                    ...(userData.campaignInfo.answers || {}),
                    [task.id]: answer
                },
            });
            
            // 2. Create a pending bonus claim for admin review.
            if (task.refereeBonus > 0) {
                 const claimRef = doc(collection(db, 'bonus_claims'));
                 batch.set(claimRef, {
                    userId: user.uid,
                    type: 'referee',
                    amount: task.refereeBonus,
                    status: 'pending',
                    campaignId: campaign.id,
                    campaignTitle: `Task Completion: ${task.description}`,
                    answer: answer,
                    createdAt: serverTimestamp(),
                });
            }

            await batch.commit();

            toast({ title: "Task Submitted!", description: `Your answer has been submitted for review. Any bonus will be added upon approval.`});
            
            // Manually update local state to reflect change immediately
            setUserData(prev => {
                if (!prev || !prev.campaignInfo) return prev;
                return {
                    ...prev,
                    campaignInfo: {
                        ...prev.campaignInfo,
                        completedTasks: newCompletedTasks
                    }
                };
            });

        } catch (e) {
            console.error(e);
            toast({ variant: "destructive", title: "Error", description: "Could not submit your task."});
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const totalPendingBonus = useMemo(() => {
        return completedTasks.reduce((acc, task) => acc + task.refereeBonus, 0);
    }, [completedTasks]);


    if (loading || !campaign) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }
    
    if (tasks.length === 0 && !loading) {
         return (
             <div className="text-center space-y-6 max-w-2xl mx-auto">
                <Award className="w-16 h-16 text-green-500 mx-auto" />
                <h1 className="text-3xl font-bold">All Tasks Completed!</h1>
                <p className="text-muted-foreground">Thank you! Your referred friend will now see you as a valid referral. Your bonus claims are now pending admin approval.</p>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Bonus Claims</CardTitle>
                        <CardDescription>Total pending bonus of <span className="font-bold text-primary">LKR {totalPendingBonus.toFixed(2)}</span>.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Task</TableHead>
                                    <TableHead>Bonus</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {completedTasks.map(task => (
                                <TableRow key={task.id}>
                                    <TableCell>{task.description}</TableCell>
                                    <TableCell>LKR {task.refereeBonus.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="gap-1.5"><Clock className="w-3 h-3"/> Pending Approval</Badge>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
            </div>
         )
    }

    return (
        <div className="space-y-8 max-w-2xl mx-auto">
            <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight">Your Tasks</h1>
                <p className="text-muted-foreground mt-2">Complete these tasks to become a valid referral and earn bonuses!</p>
            </div>

            {tasks.map(task => (
                <Card key={task.id}>
                    <CardHeader>
                        <CardTitle>Task: {task.description}</CardTitle>
                        <CardDescription>Complete this action and answer the question below.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <Badge className="bg-green-500/20 text-green-300">Reward: LKR {task.refereeBonus.toFixed(2)}</Badge>
                         {['whatsapp', 'telegram', 'facebook', 'tiktok', 'link'].includes(task.type) && task.link && (
                            <Button asChild className="w-full">
                                <a href={task.link} target="_blank" rel="noopener noreferrer">
                                    {task.buttonText || 'Open Link'}
                                </a>
                            </Button>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor={`task-answer-${task.id}`} className="font-semibold">{task.verificationQuestion}</Label>
                            <Input 
                                id={`task-answer-${task.id}`}
                                value={answers[task.id] || ''}
                                onChange={e => handleAnswerChange(task.id, e.target.value)}
                                placeholder="Your answer..."
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={() => handleSubmit(task)} disabled={isSubmitting || !answers[task.id]?.trim()}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit Answer"}
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}
