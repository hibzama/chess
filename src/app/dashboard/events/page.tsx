
'use client'
import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { collection, onSnapshot, doc, setDoc, getDoc, writeBatch, serverTimestamp, Timestamp, query, where, increment, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, CheckCircle, Loader2, Trophy, Clock, History, AlertCircle, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';


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
    createdAt?: any;
}

interface Enrollment {
    id: string; // eventId
    eventId: string;
    userId: string;
    status: 'enrolled' | 'completed' | 'claimed' | 'expired';
    progress: number;
    enrolledAt: Timestamp;
    expiresAt: Timestamp;
}

const USDT_RATE = 310;

const EventCard = ({ event, enrollment, onAction, isProcessing }: { event: Event, enrollment: Enrollment | null, onAction: (type: 'enroll' | 'claim', event: Event) => void, isProcessing: boolean }) => {
    const [countdown, setCountdown] = useState('');
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Countdown Timer Effect
    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        if (!enrollment || enrollment.status !== 'enrolled') {
            setCountdown('');
            return;
        }

        const calculateCountdown = () => {
            const now = new Date().getTime();
            const expiryTime = enrollment.expiresAt.toDate().getTime();
            const distance = expiryTime - now;

            if (distance < 0) {
                if (intervalRef.current) clearInterval(intervalRef.current);
                setCountdown("EXPIRED");
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }
        
        calculateCountdown(); // Run immediately
        intervalRef.current = setInterval(calculateCountdown, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [enrollment]);

    const getTargetDescription = () => {
        if (event.targetType === 'winningMatches') {
            return `Win ${event.targetAmount} games ${event.minWager ? `(min. wager LKR ${event.minWager})` : ''}`;
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
    
    const progressPercentage = enrollment ? Math.min(100, (enrollment.progress / event.targetAmount) * 100) : 0;
    const isExpired = enrollment && enrollment.status === 'expired';

    const renderActionButton = () => {
        if (isProcessing) {
            return <Button className="w-full" disabled><Loader2 className="animate-spin" /></Button>
        }
        if (!enrollment) {
            return <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => onAction('enroll', event)}>Enroll for LKR {event.enrollmentFee.toFixed(2)}</Button>
        }
        switch (enrollment.status) {
            case 'enrolled':
                return isExpired
                    ? <Button className="w-full" variant="destructive" disabled>Expired</Button>
                    : <Button className="w-full" disabled>Enrolled</Button>;
            case 'completed':
                return <Button className="w-full bg-green-500 hover:bg-green-600" onClick={() => onAction('claim', event)}><Trophy className="mr-2"/>Claim Reward</Button>;
            case 'claimed':
                return <Button className="w-full" variant="secondary" disabled><CheckCircle className="mr-2"/> Reward Claimed</Button>;
            case 'expired':
                 return <Button className="w-full" variant="destructive" disabled><AlertCircle className="mr-2"/> Expired</Button>;
            default:
                return null;
        }
    }


    return (
        <Card className="bg-card/50 border-primary/10 flex flex-col">
            <CardHeader>
                <CardTitle>{event.title}</CardTitle>
                <CardDescription>{event.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
                 <div className="flex justify-between text-sm p-4 bg-muted rounded-md space-y-2 flex-col md:flex-row md:space-y-0">
                    <div className="space-y-1">
                        <p className="font-semibold text-base">Target: {getTargetDescription()}</p>
                        <p className="text-muted-foreground text-xs">in {event.durationHours} hours</p>
                    </div>
                    <div className="text-left md:text-right space-y-1">
                        <p className="font-semibold text-base">Reward: LKR {event.rewardAmount.toFixed(2)}</p>
                         <p className="text-xs text-muted-foreground">~{(event.rewardAmount / USDT_RATE).toFixed(2)} USDT</p>
                        <p className="text-muted-foreground text-xs">Fee: LKR {event.enrollmentFee.toFixed(2)}</p>
                    </div>
                </div>

                {enrollment && enrollment.status === 'enrolled' && !isExpired && (
                     <div className="text-center p-3 rounded-lg bg-primary/10">
                        <p className="text-sm text-primary font-semibold flex items-center justify-center gap-2"><Clock/> Time Remaining</p>
                        <p className="text-3xl font-bold text-primary">{countdown}</p>
                    </div>
                )}
                
                {enrollment && (enrollment.status === 'enrolled' || enrollment.status === 'completed') && (
                    <div className="space-y-2 pt-4">
                        <Label>Your Progress</Label>
                        <Progress value={progressPercentage} />
                        <p className="text-xs text-muted-foreground text-right">{getProgressText()}</p>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                 {renderActionButton()}
            </CardFooter>
        </Card>
    )
}

export default function EventsPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const [allEvents, setAllEvents] = useState<Event[]>([]);
    const [enrollments, setEnrollments] = useState<{[key: string]: Enrollment}>({});
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState<string | null>(null); // Store event ID being processed

    useEffect(() => {
        // Fetch all events (active or not, we will filter later)
        const eventsUnsub = onSnapshot(query(collection(db, 'events'), orderBy('createdAt', 'desc')), (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({...doc.data(), id: doc.id } as Event));
            setAllEvents(eventsData);
            setLoading(false);
        });

        if (!user) return;
        // Fetch all enrollments for the user
        const enrollmentsUnsub = onSnapshot(collection(db, 'users', user.uid, 'event_enrollments'), (snapshot) => {
            const enrollmentsData: {[key: string]: Enrollment} = {};
            const now = Timestamp.now();

            snapshot.forEach(doc => {
                const enrollment = doc.data() as Enrollment;
                if(enrollment.status === 'enrolled' && now > enrollment.expiresAt) {
                    // Mark as expired on the client-side for immediate feedback
                    enrollmentsData[doc.id] = {...enrollment, status: 'expired'};
                    // Optionally, write back to Firestore to persist the expired state
                    setDoc(doc.ref, { status: 'expired' }, { merge: true });
                } else {
                    enrollmentsData[doc.id] = enrollment;
                }
            });
            setEnrollments(enrollmentsData);
        });
        
        return () => {
            eventsUnsub();
            if(user) enrollmentsUnsub();
        };
    }, [user]);

    const handleAction = async (type: 'enroll' | 'claim', event: Event) => {
        if (!user || !userData) return;

        setIsProcessing(event.id);
        
        if(type === 'enroll') {
            if (userData.balance < event.enrollmentFee) {
                toast({ variant: 'destructive', title: 'Error', description: 'Insufficient balance to enroll.' });
                setIsProcessing(null);
                return;
            }
            const batch = writeBatch(db);
            const userRef = doc(db, 'users', user.uid);
            const enrollmentRef = doc(db, 'users', user.uid, 'event_enrollments', event.id);
            const now = Timestamp.now();
            
            try {
                batch.update(userRef, { balance: increment(-event.enrollmentFee) });
                batch.set(enrollmentRef, {
                    id: event.id, eventId: event.id, userId: user.uid, status: 'enrolled', progress: 0,
                    enrolledAt: now,
                    expiresAt: Timestamp.fromMillis(now.toMillis() + event.durationHours * 3600 * 1000)
                });
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
            }
        } else if (type === 'claim') {
            const enrollment = enrollments[event.id];
            if (!enrollment || enrollment.status !== 'completed') return;
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
            }
        }
        setIsProcessing(null);
    };

    const activeEvents = allEvents.filter(event => event.isActive && !enrollments[event.id]);
    const enrolledEvents = allEvents.filter(event => enrollments[event.id] && (enrollments[event.id].status === 'enrolled' || enrollments[event.id].status === 'completed'));
    const historyEvents = allEvents.filter(event => enrollments[event.id] && (enrollments[event.id].status === 'claimed' || enrollments[event.id].status === 'expired'));

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3"><Calendar/> Active Events</h1>
                <p className="text-muted-foreground">Join special events to earn exclusive rewards.</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
                {loading ? (
                    [...Array(4)].map((_, i) => <Skeleton key={i} className="h-96"/>)
                ) : enrolledEvents.length > 0 || activeEvents.length > 0 ? (
                    <>
                        {enrolledEvents.map(event => (
                            <EventCard key={event.id} event={event} enrollment={enrollments[event.id]} onAction={handleAction} isProcessing={isProcessing === event.id}/>
                        ))}
                        {activeEvents.map(event => (
                            <EventCard key={event.id} event={event} enrollment={null} onAction={handleAction} isProcessing={isProcessing === event.id}/>
                        ))}
                    </>
                ) : (
                    <p className="col-span-2 text-center text-muted-foreground py-10">There are no active events at this time.</p>
                )}
            </div>

            {historyEvents.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3"><History/> Event History</h2>
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Event</TableHead>
                                        <TableHead>Result</TableHead>
                                        <TableHead>Date Enrolled</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historyEvents.map(event => {
                                        const enrollment = enrollments[event.id];
                                        return (
                                        <TableRow key={event.id}>
                                            <TableCell className="font-medium">{event.title}</TableCell>
                                            <TableCell>
                                                {enrollment.status === 'claimed' ? (
                                                    <Badge className="bg-green-500/20 text-green-400 border-none">Claimed LKR {event.rewardAmount.toFixed(2)}</Badge>
                                                ) : (
                                                    <Badge variant="destructive">Expired</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {format(enrollment.enrolledAt.toDate(), 'PPp')}
                                            </TableCell>
                                        </TableRow>
                                    )})}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
