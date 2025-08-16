
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, writeBatch, collection, serverTimestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Loader2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { Campaign, CampaignTask } from '@/app/admin/referral-campaigns/page';
import { Badge } from '@/components/ui/badge';

export default function YourTaskPage() {
    const { user, userData, setUserData } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [tasks, setTasks] = useState<CampaignTask[]>([]);
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
            const campaignDoc = await getDoc(doc(db, 'referral_campaigns', userData.campaignInfo.campaignId));
            if (campaignDoc.exists()) {
                const campaignData = { id: campaignDoc.id, ...campaignDoc.data() } as Campaign;
                setCampaign(campaignData);
                const completedTasks = userData.campaignInfo.completedTasks || [];
                const pendingTasks = campaignData.tasks.filter(task => !completedTasks.includes(task.id));
                setTasks(pendingTasks);

                if(pendingTasks.length === 0) {
                     router.push('/dashboard');
                }

            } else {
                // Campaign likely deleted, redirect
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
            
            batch.update(userRef, {
                'campaignInfo.completedTasks': newCompletedTasks,
                'campaignInfo.answers': {
                    ...(userData.campaignInfo.answers || {}),
                    [task.id]: answer
                },
            });
            
            if(task.refereeBonus > 0) {
                 const claimRef = doc(collection(db, 'bonus_claims'));
                 batch.set(claimRef, {
                    userId: user.uid,
                    amount: task.refereeBonus,
                    campaignTitle: `Task: ${task.description.substring(0, 30)}...`,
                    type: 'referee',
                    status: 'pending',
                    createdAt: serverTimestamp(),
                    refereeId: user.uid,
                    campaignId: campaign.id,
                    referrerId: userData.campaignInfo.referrerId
                 });
            }

            await batch.commit();

            toast({ title: "Task Submitted!", description: `Your task completion has been submitted for review.`});
            
            setUserData(prev => prev ? ({
                ...prev,
                campaignInfo: { ...prev.campaignInfo!, completedTasks: newCompletedTasks }
            }) : null);

        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: "Could not submit your task."});
        } finally {
            setIsSubmitting(false);
        }
    };

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
             <div className="text-center space-y-4">
                <Award className="w-16 h-16 text-green-500 mx-auto" />
                <h1 className="text-3xl font-bold">All Tasks Completed!</h1>
                <p className="text-muted-foreground">Thank you! Your submissions are under review. Bonuses will be added to your account upon approval.</p>
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
                                    Open Link
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
                            {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit for Review"}
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}
