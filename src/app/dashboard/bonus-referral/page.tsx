
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, Copy, Share, Users, Clock, Check, X, Loader2, Gamepad2, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';

type UserTaskStatus = {
    userId: string;
    userName: string;
    tasks: { [taskId: string]: { status: 'pending' | 'completed' | 'submitted'; progress?: number; value?: string } };
    claimed: boolean;
    joinedAt: any;
    isCompleted: boolean;
};

export default function BonusReferralPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const [tasks, setTasks] = useState<any[]>([]);
    const [referrals, setReferrals] = useState<UserTaskStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [isClaiming, setIsClaiming] = useState(false);

    const referralLink = useMemo(() => {
        if (typeof window !== 'undefined' && user) {
            return `${window.location.origin}/register?aref=${user.uid}`;
        }
        return '';
    }, [user]);

    const activeTask = useMemo(() => tasks.find(t => t.isActive), [tasks]);
    
    const { validReferrals, pendingReferrals } = useMemo(() => {
        const valid = referrals.filter(r => r.isCompleted);
        const pending = referrals.filter(r => !r.isCompleted);
        return { validReferrals: valid, pendingReferrals: pending };
    }, [referrals]);
    
    const canClaimTargetBonus = useMemo(() => {
        if (!activeTask || !userData) return false;
        const target = activeTask.referrerTarget || 0;
        const alreadyClaimed = userData.claimedTaskReferralBonus || false;
        return validReferrals.length >= target && !alreadyClaimed;
    }, [activeTask, validReferrals.length, userData]);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        // Fetch active tasks
        const tasksQuery = query(collection(db, 'referral_tasks'));
        const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
            setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch user's task-based referrals
        const referralsQuery = query(collection(db, 'users'), where('taskReferredBy', '==', user.uid));
        const unsubReferrals = onSnapshot(referralsQuery, (snapshot) => {
            const referredUsers = snapshot.docs.map(doc => {
                const data = doc.data();
                const userTasks = data.taskStatus || {};
                let isCompleted = false;
                if(activeTask && userTasks[activeTask.id]) {
                    isCompleted = activeTask.subTasks.every((st: any) => userTasks[activeTask.id][st.id]?.status === 'completed');
                }

                return {
                    userId: doc.id,
                    userName: `${data.firstName} ${data.lastName}`,
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
    }, [user, activeTask]);

    const copyLink = () => {
        navigator.clipboard.writeText(referralLink);
        toast({ title: 'Copied!', description: 'Referral link copied to clipboard.' });
    };

    const handleClaimTargetBonus = async () => {
        if(!user || !activeTask || !canClaimTargetBonus) return;
        setIsClaiming(true);

        const batch = writeBatch(db);
        const userRef = doc(db, 'users', user.uid);
        
        // Add commission for each valid referral
        validReferrals.forEach(ref => {
            const commission = activeTask.referrerCommission || 0;
            if (commission > 0) {
                 const commissionRef = doc(collection(db, "transactions"));
                 batch.set(commissionRef, {
                    userId: user.uid,
                    type: 'task_commission',
                    amount: commission,
                    status: 'completed',
                    description: `Commission for ${ref.userName}'s task completion.`,
                    fromUserId: ref.userId,
                 });
                 batch.update(userRef, { balance: increment(commission) });
            }
        });

        // Mark bonus as claimed to prevent re-claiming
        batch.update(userRef, { claimedTaskReferralBonus: true });
        
        try {
            await batch.commit();
            toast({ title: "Success!", description: "Referral commissions have been added to your wallet."});
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Error", description: "Failed to claim commissions."});
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

            <Card>
                <CardHeader>
                    <CardTitle>Your Task Referral Link</CardTitle>
                    <CardDescription>Share this unique link. When a friend signs up and completes all tasks, you both get a bonus.</CardDescription>
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
                    <CardTitle>Your Referral Target</CardTitle>
                     <CardDescription>Get this many users to complete their tasks to claim your commissions.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading || !activeTask ? <Skeleton className="h-24 w-full" /> : (
                        <div className="space-y-4">
                            <Progress value={(validReferrals.length / activeTask.referrerTarget) * 100} />
                            <div className="flex justify-between items-center font-semibold">
                                <span>{validReferrals.length} / {activeTask.referrerTarget} Referrals Completed</span>
                                {canClaimTargetBonus && (
                                    <Button onClick={handleClaimTargetBonus} disabled={isClaiming}>
                                        {isClaiming ? <Loader2 className="animate-spin" /> : "Claim Commissions"}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Your Referrals</CardTitle>
                    <CardDescription>Track the progress of users who joined with your link.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="valid">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="valid">Valid Referrals ({validReferrals.length})</TabsTrigger>
                            <TabsTrigger value="pending">Pending Referrals ({pendingReferrals.length})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="valid">
                            <Table>
                                <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Joined</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {loading ? <TableRow><TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell></TableRow> : validReferrals.length > 0 ? (
                                        validReferrals.map(ref => <ReferralRow key={ref.userId} referral={ref} />)
                                    ) : <TableRow><TableCell colSpan={3} className="text-center h-24">No valid referrals yet.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </TabsContent>
                        <TabsContent value="pending">
                            <Table>
                                <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Joined</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {loading ? <TableRow><TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell></TableRow> : pendingReferrals.length > 0 ? (
                                        pendingReferrals.map(ref => <ReferralRow key={ref.userId} referral={ref} />)
                                    ) : <TableRow><TableCell colSpan={3} className="text-center h-24">No pending referrals.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}

const ReferralRow = ({ referral }: { referral: UserTaskStatus }) => (
    <TableRow>
        <TableCell>{referral.userName}</TableCell>
        <TableCell>{referral.joinedAt ? format(referral.joinedAt.toDate(), 'PP') : 'N/A'}</TableCell>
        <TableCell>
            {referral.isCompleted ? <Badge variant="default">Completed</Badge> : <Badge variant="outline">In Progress</Badge>}
        </TableCell>
    </TableRow>
);
