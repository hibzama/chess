
'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, Timestamp, updateDoc, writeBatch, getDoc, collection, query, serverTimestamp, where, getDocs, orderBy, increment } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Clock, Users, DollarSign, Ban, CheckCircle, Target, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export interface Event {
    id: string;
    title: string;
    targetType: 'winningMatches' | 'totalEarnings';
    targetAmount: number;
    enrollmentFee: number;
    rewardAmount: number;
    durationHours: number;
    isActive: boolean;
    minWager?: number;
    createdAt?: any;
}

export interface Enrollment {
    id: string;
    eventId: string;
    progress: number;
    status: 'enrolled' | 'completed' | 'expired';
    expiresAt: Timestamp;
    eventDetails?: Event;
}

const Countdown = ({ expiryTimestamp }: { expiryTimestamp: Timestamp }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const expiry = expiryTimestamp.toDate();
            const distance = expiry.getTime() - now.getTime();

            if (distance < 0) {
                setTimeLeft('Expired');
                clearInterval(interval);
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }, 1000);

        return () => clearInterval(interval);
    }, [expiryTimestamp]);

    return <p className="text-center text-sm text-muted-foreground">{timeLeft}</p>;
}


export default function EventsPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const [availableEvents, setAvailableEvents] = useState<Event[]>([]);
    const [enrolledEvents, setEnrolledEvents] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEnrolling, setIsEnrolling] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        // Fetch active events
        const eventsQuery = query(collection(db, 'events'), where('isActive', '==', true));
        const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Event));
            // Sort client-side to avoid needing a composite index
            eventsData.sort((a,b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
            setAvailableEvents(eventsData);
            setLoading(false);
        });

        // Fetch user's enrolled events
        const enrollmentsRef = collection(db, 'users', user.uid, 'event_enrollments');
        const unsubEnrollments = onSnapshot(enrollmentsRef, async (snapshot) => {
            const enrollmentsDataPromises = snapshot.docs.map(async (enrollmentDoc) => {
                const enrollment = { ...enrollmentDoc.data(), id: enrollmentDoc.id } as Enrollment;
                const eventDoc = await getDoc(doc(db, 'events', enrollment.eventId));
                if (eventDoc.exists()) {
                    enrollment.eventDetails = { ...eventDoc.data(), id: eventDoc.id } as Event;
                }
                return enrollment;
            });
            const enrollmentsData = await Promise.all(enrollmentsDataPromises);
            setEnrolledEvents(enrollmentsData.filter(e => e.eventDetails));
        });
        
        return () => {
            unsubEvents();
            unsubEnrollments();
        };
    }, [user]);

    const handleEnroll = async (event: Event) => {
        if (!user || !userData) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
            return;
        }

        if (userData.balance < event.enrollmentFee) {
            toast({ variant: 'destructive', title: 'Insufficient Funds', description: `You need LKR ${event.enrollmentFee.toFixed(2)} to enroll.` });
            return;
        }

        setIsEnrolling(event.id);
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', user.uid);
        const enrollmentRef = doc(db, 'users', user.uid, 'event_enrollments', event.id);
        const masterEnrollmentRef = doc(db, 'event_enrollments', event.id, 'users', user.uid);

        try {
            // Deduct enrollment fee
            if (event.enrollmentFee > 0) {
                 batch.update(userRef, { balance: increment(-event.enrollmentFee) });
            }

            // Create enrollment documents
            const expiryDate = new Date(Date.now() + event.durationHours * 60 * 60 * 1000);
            
            const enrollmentData = {
                eventId: event.id,
                status: 'enrolled',
                progress: 0,
                enrolledAt: serverTimestamp(),
                expiresAt: Timestamp.fromDate(expiryDate)
            };
            batch.set(enrollmentRef, enrollmentData);
            batch.set(masterEnrollmentRef, { enrolledAt: serverTimestamp() });

            await batch.commit();
            toast({ title: 'Successfully Enrolled!', description: `You have joined the "${event.title}" event.` });
        } catch (error) {
            console.error("Enrollment failed: ", error);
            toast({ variant: 'destructive', title: 'Enrollment Failed', description: 'Could not enroll in the event.' });
        } finally {
            setIsEnrolling(null);
        }
    }

    const alreadyEnrolledIds = new Set(enrolledEvents.map(e => e.eventId));

    return (
        <Tabs defaultValue="available">
            <div className="flex justify-between items-center mb-4">
                 <div>
                    <h1 className="text-3xl font-bold">Events & Challenges</h1>
                    <p className="text-muted-foreground">Join events to earn exclusive rewards.</p>
                </div>
                 <TabsList className="grid grid-cols-2">
                    <TabsTrigger value="available">Available</TabsTrigger>
                    <TabsTrigger value="enrolled">My Events</TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="available">
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    {loading ? (
                        [...Array(3)].map((_, i) => <Skeleton key={i} className="h-96 w-full" />)
                    ) : availableEvents.filter(e => !alreadyEnrolledIds.has(e.id)).length > 0 ? (
                        availableEvents.filter(e => !alreadyEnrolledIds.has(e.id)).map(event => (
                            <Card key={event.id} className="flex flex-col">
                                <CardHeader className="text-center">
                                    <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-2">
                                        <Target className="w-8 h-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-2xl">{event.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 flex-1">
                                    <div className="p-4 bg-secondary/50 rounded-lg text-center space-y-1">
                                        <p className="text-sm text-muted-foreground">Goal</p>
                                        <p className="text-xl font-bold text-primary">
                                            {event.targetType === 'winningMatches'
                                                ? `${event.targetAmount} Wins`
                                                : `Earn LKR ${event.targetAmount.toLocaleString()}`
                                            }
                                        </p>
                                        {event.targetType === 'winningMatches' && event.minWager && event.minWager > 0 && (
                                            <p className="text-xs text-muted-foreground">(Min. Wager: LKR {event.minWager})</p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-center text-sm">
                                        <div>
                                            <p className="font-semibold">Fee</p>
                                            <p>LKR {event.enrollmentFee.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold">Reward</p>
                                            <p className="text-green-400">LKR {event.rewardAmount.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center">You will have {event.durationHours} hours to complete this event after enrolling.</p>
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full" onClick={() => handleEnroll(event)} disabled={isEnrolling === event.id}>
                                        {isEnrolling === event.id ? <Loader2 className="animate-spin"/> : `Enroll (LKR ${event.enrollmentFee.toFixed(2)})`}
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full flex flex-col items-center justify-center text-center gap-4 py-12">
                            <Gift className="w-16 h-16 text-muted-foreground" />
                            <h2 className="text-2xl font-bold">No New Events Available</h2>
                            <p className="text-muted-foreground">Check back later for new challenges!</p>
                        </div>
                    )}
                </div>
            </TabsContent>
            <TabsContent value="enrolled">
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    {loading ? (
                         [...Array(3)].map((_, i) => <Skeleton key={i} className="h-96 w-full" />)
                    ) : enrolledEvents.length > 0 ? (
                        enrolledEvents.map(enrollment => {
                            if (!enrollment.eventDetails) return null;
                            const progressPercentage = Math.min(100, (enrollment.progress / enrollment.eventDetails.targetAmount) * 100);
                            
                            return (
                                <Card key={enrollment.id} className="flex flex-col">
                                    <CardHeader className="text-center">
                                         <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-2">
                                            <Target className="w-8 h-8 text-primary" />
                                        </div>
                                        <CardTitle className="text-2xl">{enrollment.eventDetails.title}</CardTitle>
                                        <Badge variant={enrollment.status === 'completed' ? 'default' : 'secondary'} className="w-fit mx-auto">{enrollment.status}</Badge>
                                    </CardHeader>
                                    <CardContent className="space-y-4 flex-1">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm font-medium">
                                                <span>Progress</span>
                                                <span>{enrollment.progress.toLocaleString()} / {enrollment.eventDetails.targetAmount.toLocaleString()}</span>
                                            </div>
                                            <Progress value={progressPercentage} />
                                        </div>
                                         <div className="p-4 bg-secondary/50 rounded-lg text-center space-y-1">
                                            <p className="text-sm text-muted-foreground">Reward</p>
                                            <p className="text-xl font-bold text-green-400">LKR {enrollment.eventDetails.rewardAmount.toFixed(2)}</p>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Countdown expiryTimestamp={enrollment.expiresAt} />
                                    </CardFooter>
                                </Card>
                            )
                        })
                     ) : (
                         <div className="col-span-full flex flex-col items-center justify-center text-center gap-4 py-12">
                            <Gift className="w-16 h-16 text-muted-foreground" />
                            <h2 className="text-2xl font-bold">You Haven't Enrolled in Any Events</h2>
                            <p className="text-muted-foreground">Check the "Available" tab to join a new challenge!</p>
                        </div>
                    )}
                 </div>
            </TabsContent>
        </Tabs>
    );
}
