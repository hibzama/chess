
'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { collection, onSnapshot, doc, setDoc, getDoc, writeBatch, serverTimestamp, Timestamp, query, where, increment } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, CheckCircle, Loader2, Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

interface Event {
    id: string;
    title: string;
    description: string;
    enrollmentFee: number;
    targetType: 'totalEarnings' | 'winningMatches';
    targetAmount: number;
    minWager?: number;
    rewardAmount: number;
    durationHours: number;
    isActive: boolean;
}

interface Enrollment {
    id: string; // eventId
    userId: string;
    status: 'enrolled' | 'completed' | 'claimed';
    progress: number;
    enrolledAt: Timestamp;
    expiresAt: Timestamp;
}

const USDT_RATE = 310;

const EventCard = ({ event }: { event: Event }) => {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
    const [loadingEnrollment, setLoadingEnrollment] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!user) {
            setLoadingEnrollment(false);
            return;
        }
        const enrollmentRef = doc(db, 'users', user.uid, 'event_enrollments', event.id);
        const unsubscribe = onSnapshot(enrollmentRef, (doc) => {
            if (doc.exists()) {
                setEnrollment(doc.data() as Enrollment);
            } else {
                setEnrollment(null);
            }
            setLoadingEnrollment(false);
        });
        return () => unsubscribe();
    }, [user, event.id]);
    
    // Progress Tracking Effect
    useEffect(() => {
        if (!enrollment || enrollment.status !== 'enrolled' || !user) return;

        const now = Timestamp.now();
        if(now > enrollment.expiresAt) return; // Event expired

        let unsubscribe;
        if (event.targetType === 'totalEarnings') {
            const q = query(
                collection(db, 'transactions'),
                where('userId', '==', user.uid)
            );
            unsubscribe = onSnapshot(q, async (snapshot) => {
                let totalEarnings = 0;
                snapshot.forEach(doc => {
                    const tx = doc.data();
                    // Filter by date on the client
                    if (tx.createdAt.seconds >= enrollment.enrolledAt.seconds) {
                        if(tx.type === 'payout') totalEarnings += tx.amount;
                        if(tx.type === 'wager') totalEarnings -= tx.amount;
                    }
                });
                
                const enrollmentRef = doc(db, 'users', user.uid, 'event_enrollments', event.id);
                const currentProgress = (await getDoc(enrollmentRef)).data()?.progress || 0;
                if (totalEarnings > currentProgress) {
                     await setDoc(enrollmentRef, { progress: totalEarnings }, { merge: true });
                }
            });
        } else if (event.targetType === 'winningMatches') {
             const q = query(
                collection(db, 'game_rooms'),
                where('status', '==', 'completed'),
                where('players', 'array-contains', user.uid),
                where('createdAt', '>=', enrollment.enrolledAt),
                where('winner.uid', '==', user.uid),
                where('wager', '>=', event.minWager || 0)
            );
             unsubscribe = onSnapshot(q, async (snapshot) => {
                const winsCount = snapshot.size;
                const enrollmentRef = doc(db, 'users', user.uid, 'event_enrollments', event.id);
                await setDoc(enrollmentRef, { progress: winsCount }, { merge: true });
            });
        }
        
        return () => {
            if (unsubscribe) unsubscribe();
        };

    }, [enrollment, user, event]);


    const handleEnroll = async () => {
        if (!user || !userData) return;
        if (userData.balance < event.enrollmentFee) {
            toast({ variant: 'destructive', title: 'Error', description: 'Insufficient balance to enroll.' });
            return;
        }
        setIsProcessing(true);
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', user.uid);
        const enrollmentRef = doc(db, 'users', user.uid, 'event_enrollments', event.id);
        const now = Timestamp.now();
        
        try {
            // 1. Deduct fee
            batch.update(userRef, { balance: increment(-event.enrollmentFee) });
            // 2. Create enrollment record
            batch.set(enrollmentRef, {
                id: event.id,
                userId: user.uid,
                status: 'enrolled',
                progress: 0,
                enrolledAt: now,
                expiresAt: Timestamp.fromMillis(now.toMillis() + event.durationHours * 3600 * 1000)
            });
            // 3. Log transaction
            const txRef = doc(collection(db, 'transactions'));
            batch.set(txRef, {
                userId: user.uid, type: 'event_enrollment', amount: event.enrollmentFee, status: 'completed',
                description: `Enrollment fee for event: ${event.title}`, createdAt: serverTimestamp()
            });

            await batch.commit();
            toast({ title: 'Enrolled!', description: `You have successfully enrolled in ${event.title}.` });
        } catch (error) {
            console.error("Enrollment failed:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to enroll in the event.' });
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleClaim = async () => {
        if (!user || !enrollment || enrollment.status !== 'completed' || !userData) return;
        
        setIsProcessing(true);
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', user.uid);
        const enrollmentRef = doc(db, 'users', user.uid, 'event_enrollments', event.id);
        
        try {
            batch.update(userRef, { balance: increment(event.rewardAmount) });
            batch.update(enrollmentRef, { status: 'claimed' });
            
            const txRef = doc(collection(db, 'transactions'));
            batch.set(txRef, {
                userId: user.uid, type: 'event_reward', amount: event.rewardAmount, status: 'completed',
                description: `Reward for completing event: ${event.title}`, createdAt: serverTimestamp()
            });
            
            await batch.commit();
            toast({ title: 'Reward Claimed!', description: `LKR ${event.rewardAmount} has been added to your wallet.` });
        } catch (error) {
            console.error("Claim failed:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to claim reward.' });
        } finally {
            setIsProcessing(false);
        }
    }
    
    const now = new Date().getTime();
    const progressPercentage = enrollment ? Math.min(100, (enrollment.progress / event.targetAmount) * 100) : 0;
    const isExpired = enrollment && now > enrollment.expiresAt.toDate().getTime();

    // Automatically mark as completed
    useEffect(() => {
        if (enrollment?.status === 'enrolled' && progressPercentage >= 100) {
            const enrollmentRef = doc(db, 'users', user!.uid, 'event_enrollments', event.id);
            setDoc(enrollmentRef, { status: 'completed' }, { merge: true });
        }
    }, [progressPercentage, enrollment, user, event.id]);

    const getTargetDescription = () => {
        if (event.targetType === 'winningMatches') {
            return `Win ${event.targetAmount} games (min. wager LKR ${event.minWager || 0})`;
        }
        return `Earn LKR ${event.targetAmount.toFixed(2)}`;
    }

    const getProgressText = () => {
        if (!enrollment) return '';
        if (event.targetType === 'winningMatches') {
            return `${enrollment.progress} / ${event.targetAmount} wins`;
        }
        return `LKR ${enrollment.progress.toFixed(2)} / ${event.targetAmount.toFixed(2)}`;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{event.title}</CardTitle>
                <CardDescription>{event.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between text-sm p-3 bg-muted rounded-md">
                    <div>
                        <p className="font-semibold">Target: {getTargetDescription()}</p>
                        <p className="text-muted-foreground">in {event.durationHours} hours</p>
                    </div>
                    <div>
                        <p className="font-semibold text-right">Reward: LKR {event.rewardAmount.toFixed(2)}</p>
                        <p className="text-muted-foreground text-right">~{(event.rewardAmount / USDT_RATE).toFixed(2)} USDT</p>
                        <p className="text-muted-foreground text-right">Enrollment Fee: LKR {event.enrollmentFee.toFixed(2)}</p>
                    </div>
                </div>

                {loadingEnrollment ? (
                    <Skeleton className="h-10 w-full" />
                ) : enrollment ? (
                     <div className="space-y-2">
                        {isExpired && enrollment.status === 'enrolled' && (
                            <Alert variant="destructive">
                                <AlertTitle>Event Expired</AlertTitle>
                                <AlertDescription>You did not complete this event in time.</AlertDescription>
                            </Alert>
                        )}
                        <Label>Your Progress</Label>
                        <Progress value={progressPercentage} />
                        <p className="text-xs text-muted-foreground text-right">{getProgressText()}</p>
                    </div>
                ) : null}
            </CardContent>
            <CardFooter>
                 {loadingEnrollment ? (
                    <Skeleton className="h-10 w-24" />
                ) : enrollment ? (
                    enrollment.status === 'completed' ? (
                        <Button className="w-full" onClick={handleClaim} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="animate-spin" /> : <><Trophy className="mr-2"/>Claim Reward</>}
                        </Button>
                    ) : enrollment.status === 'claimed' ? (
                        <Button className="w-full" disabled variant="secondary"><CheckCircle className="mr-2"/> Reward Claimed</Button>
                    ) : (
                        <Button className="w-full" disabled>Enrolled</Button>
                    )
                ) : (
                    <Button className="w-full" onClick={handleEnroll} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="animate-spin"/> : `Enroll for LKR ${event.enrollmentFee.toFixed(2)}`}
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}


export default function EventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'events'), where('isActive', '==', true));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => doc.data() as Event);
            setEvents(eventsData.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3"><Calendar/> Active Events</h1>
                <p className="text-muted-foreground">Join special events to earn exclusive rewards.</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
                {loading ? (
                    [...Array(2)].map((_, i) => <Skeleton key={i} className="h-64"/>)
                ) : events.length > 0 ? (
                    events.map(event => <EventCard key={event.id} event={event} />)
                ) : (
                    <p className="col-span-2 text-center text-muted-foreground">There are no active events at this time.</p>
                )}
            </div>
        </div>
    );
}
