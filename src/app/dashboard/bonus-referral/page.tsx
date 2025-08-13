
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, Copy, Share, Users, Clock, Check, X, Loader2, Gamepad2 } from 'lucide-react';
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
};

export default function BonusReferralPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const [tasks, setTasks] = useState<any[]>([]);
    const [referrals, setReferrals] = useState<UserTaskStatus[]>([]);
    const [loading, setLoading] = useState(true);

    const referralLink = useMemo(() => {
        if (typeof window !== 'undefined' && user) {
            return `${window.location.origin}/register?aref=${user.uid}`;
        }
        return '';
    }, [user]);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        // Fetch active tasks
        const tasksQuery = query(collection(db, 'referral_tasks'), where('isActive', '==', true));
        const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
            setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch user's task-based referrals
        const referralsQuery = query(collection(db, 'users'), where('taskReferredBy', '==', user.uid));
        const unsubReferrals = onSnapshot(referralsQuery, (snapshot) => {
            const referredUsers = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    userId: doc.id,
                    userName: `${data.firstName} ${data.lastName}`,
                    tasks: data.taskStatus || {},
                    claimed: data.taskStatus?.claimed || false,
                    joinedAt: data.createdAt
                }
            });
            setReferrals(referredUsers);
            setLoading(false);
        });

        return () => {
            unsubTasks();
            unsubReferrals();
        };
    }, [user]);

    const copyLink = () => {
        navigator.clipboard.writeText(referralLink);
        toast({ title: 'Copied!', description: 'Referral link copied to clipboard.' });
    };
    
    const getOverallProgress = (userTasks: UserTaskStatus['tasks']) => {
        const totalTasks = tasks.length;
        if (totalTasks === 0) return 0;
        const completedTasks = tasks.filter(task => userTasks[task.id]?.status === 'completed').length;
        return (completedTasks / totalTasks) * 100;
    }

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
                    <CardTitle>Tasks for Your Referrals</CardTitle>
                    <CardDescription>New users who join with your link will need to complete these tasks.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading ? <Skeleton className="h-24 w-full" /> : tasks.length > 0 ? (
                        tasks.map(task => (
                            <div key={task.id} className="p-4 border rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{task.title}</p>
                                    <p className="text-sm text-muted-foreground">{task.description}</p>
                                </div>
                                <div className="text-right">
                                     <p className="text-sm font-semibold text-green-400">You Get: LKR {task.referrerCommission.toFixed(2)}</p>
                                    <p className="text-sm font-semibold text-primary">They Get: LKR {task.newUserBonus.toFixed(2)}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-4">No active tasks configured by the admin yet.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Your Referral Progress</CardTitle>
                    <CardDescription>Track the progress of users who joined with your link.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead>Task Progress</TableHead>
                                <TableHead>Reward Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? <TableRow><TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell></TableRow> : referrals.length > 0 ? (
                                referrals.map(ref => (
                                    <TableRow key={ref.userId}>
                                        <TableCell>{ref.userName}</TableCell>
                                        <TableCell>{ref.joinedAt ? format(ref.joinedAt.toDate(), 'PP') : 'N/A'}</TableCell>
                                        <TableCell>
                                            <Progress value={getOverallProgress(ref.tasks)} className="w-[60%]" />
                                        </TableCell>
                                        <TableCell>
                                            {getOverallProgress(ref.tasks) === 100 ? 
                                                (ref.claimed ? <Badge variant="default">Claimed</Badge> : <Badge variant="secondary">Pending Claim</Badge>)
                                                : <Badge variant="outline">In Progress</Badge>}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={4} className="text-center h-24">No one has joined with your task referral link yet.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

