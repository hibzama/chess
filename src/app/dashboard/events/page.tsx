
'use client'
import { useState, useEffect } from 'react';
import { db, functions } from '@/lib/firebase';
import { doc, onSnapshot, Timestamp, updateDoc, writeBatch, getDoc, collection, query, serverTimestamp, where, getDocs, orderBy, increment, deleteField, runTransaction } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Clock, Users, DollarSign, Ban, CheckCircle, Target, Loader2, Trophy, History as HistoryIcon, Swords, Check, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { httpsCallable } from 'firebase/functions';

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
    maxEnrollees?: number;
    enrolledCount?: number;
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

interface ProgressHistoryItem {
    id: string;
    gameId: string;
    opponentName: string;
    increment: number;
    timestamp: Timestamp;
    result: 'win' | 'loss';
}

const USDT_RATE = 310;

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
    const [progressHistory, setProgressHistory] = useState<{ [eventId: string]: ProgressHistoryItem[] }>({});
    const [loading, setLoading] = useState(true);
    const [isEnrolling, setIsEnrolling] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const eventsQuery = query(collection(db, 'events'), where('isActive', '==', true));
        const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Event));
            eventsData.sort((a,b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
            setAvailableEvents(eventsData);
        });

        const enrollmentsRef = collection(db, 'users', user.uid, 'event_enrollments');
        const unsubEnrollments = onSnapshot(enrollmentsRef, async (snapshot) => {
            setLoading(true);
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
            setLoading(false);
        });
        
        return () => {
            unsubEvents();
            unsubEnrollments();
        };
    }, [user]);

    const fetchProgressHistory = async (eventId: string) => {
        if (!user || progressHistory[eventId]) return;

        const historyQuery = query(
            collection(db, 'users', user.uid, 'event_enrollments', eventId, 'progress_history'),
            orderBy('timestamp', 'desc')
        );

        const historySnapshot = await getDocs(historyQuery);
        const historyData = historySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as ProgressHistoryItem));
        setProgressHistory(prev => ({...prev, [eventId]: historyData}));
    }

    const handleEnroll = async (event: Event) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
            return;
        }
        setIsEnrolling(event.id);

        try {
            const enrollInEvent = httpsCallable(functions, 'enrollInEvent');
            const result = await enrollInEvent({ eventId: event.id });
            
            const data = result.data as { success: boolean, message: string };

            if(data.success) {
                toast({ title: 'Successfully Enrolled!', description: `You have joined the "${event.title}" event.` });
            } else {
                throw new Error(data.message || 'Failed to enroll in event.');
            }
            
        } catch (error: any) {
            console.error("Enrollment failed: ", error);
            toast({ variant: 'destructive', title: 'Enrollment Failed', description: error.message || 'Could not enroll in the event. Please try again.' });
        } finally {
            setIsEnrolling(null);
        }
    }


    const alreadyEnrolledIds = new Set(enrolledEvents.map(e => e.eventId));
    
    const displayableAvailableEvents = availableEvents.filter(event => {
        if (alreadyEnrolledIds.has(event.id)) return false; // Already enrolled
        if (event.maxEnrollees && event.maxEnrollees > 0 && (event.enrolledCount || 0) >= event.maxEnrollees) {
            return false; // Event is full
        }
        return true;
    });

    const activeEnrolledEvents = enrolledEvents.filter(e => e.status === 'enrolled' && e.expiresAt.toDate() > new Date());
    const historyEvents = enrolledEvents.filter(e => e.status !== 'enrolled' || e.expiresAt.toDate() <= new Date());


    const renderProgressDetails = (enrollment: Enrollment) => {
        if(!enrollment.eventDetails) return null;

        if (enrollment.eventDetails.targetType === 'winningMatches') {
            return (
                <span className='flex items-center gap-1.5'><Trophy className="w-4 h-4 text-yellow-400" /> {enrollment.progress.toLocaleString()} / {enrollment.eventDetails.targetAmount.toLocaleString()} Wins</span>
            )
        }
        if(enrollment.eventDetails.targetType === 'totalEarnings') {
             return (
                 <div className='text-center'>
                    <p>LKR {enrollment.progress.toFixed(2)} / {enrollment.eventDetails.targetAmount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">~{(enrollment.progress / USDT_RATE).toFixed(2)} / {(enrollment.eventDetails.targetAmount / USDT_RATE).toFixed(2)} USDT</p>
                </div>
            )
        }
    }

    return (
        <Tabs defaultValue="available">
            <div className="flex justify-between items-center mb-4">
                 <div>
                    <h1 className="text-3xl font-bold">Events & Challenges</h1>
                    <p className="text-muted-foreground">Join events to earn exclusive rewards.</p>
                </div>
                 <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="available">Available</TabsTrigger>
                    <TabsTrigger value="active">Active</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="available">
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    {loading ? (
                        [...Array(3)].map((_, i) => <Skeleton key={i} className="h-96 w-full" />)
                    ) : displayableAvailableEvents.length > 0 ? (
                        displayableAvailableEvents.map(event => (
                            <Card key={event.id} className="flex flex-col">
                                <CardHeader className="text-center">
                                    <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-2">
                                        <Target className="w-8 h-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-2xl">{event.title}</CardTitle>
                                    {event.maxEnrollees && event.maxEnrollees > 0 && (
                                        <Badge variant="secondary" className="w-fit mx-auto">{event.enrolledCount || 0} / {event.maxEnrollees} Enrolled</Badge>
                                    )}
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
                                    <Button className="w-full" onClick={() => handleEnroll(event)} disabled={isEnrolling === event.id || (!!event.maxEnrollees && event.maxEnrollees > 0 && (event.enrolledCount || 0) >= event.maxEnrollees)}>
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
            <TabsContent value="active">
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    {loading ? (
                         [...Array(3)].map((_, i) => <Skeleton key={i} className="h-96 w-full" />)
                    ) : activeEnrolledEvents.length > 0 ? (
                        activeEnrolledEvents.map(enrollment => {
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
                                                <span>{renderProgressDetails(enrollment)}</span>
                                            </div>
                                            <Progress value={progressPercentage} />
                                        </div>
                                         <div className="p-4 bg-secondary/50 rounded-lg text-center space-y-1">
                                            <p className="text-sm text-muted-foreground">Reward</p>
                                            <p className="text-xl font-bold text-green-400">LKR {enrollment.eventDetails.rewardAmount.toFixed(2)}</p>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex-col gap-2">
                                        <Countdown expiryTimestamp={enrollment.expiresAt} />
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" className="w-full" onClick={() => fetchProgressHistory(enrollment.id)}>
                                                    <HistoryIcon className="mr-2"/> View History
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Progress History for "{enrollment.eventDetails.title}"</DialogTitle>
                                                </DialogHeader>
                                                <ScrollArea className="h-72">
                                                    <Table>
                                                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Vs Opponent</TableHead><TableHead>Result</TableHead><TableHead>Progress</TableHead></TableRow></TableHeader>
                                                        <TableBody>
                                                            {progressHistory[enrollment.id] ? progressHistory[enrollment.id].length > 0 ? (
                                                                progressHistory[enrollment.id].map(h => (
                                                                    <TableRow key={h.id}>
                                                                        <TableCell>{h.timestamp ? format(h.timestamp.toDate(), 'PPp') : 'N/A'}</TableCell>
                                                                        <TableCell>{h.opponentName}</TableCell>
                                                                        <TableCell><Badge variant={h.result === 'win' ? 'default' : 'destructive'}>{h.result}</Badge></TableCell>
                                                                        <TableCell className={cn(h.increment > 0 && "text-green-400")}>
                                                                            {h.increment > 0 ? (enrollment.eventDetails?.targetType === 'winningMatches' ? '+1 Win' : `+LKR ${h.increment.toFixed(2)}`) : 'N/A'}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))
                                                            ) : (
                                                                <TableRow><TableCell colSpan={4} className="text-center">No progress yet.</TableCell></TableRow>
                                                            ) : <TableRow><TableCell colSpan={4} className="text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>}
                                                        </TableBody>
                                                    </Table>
                                                </ScrollArea>
                                            </DialogContent>
                                        </Dialog>
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
            <TabsContent value="history">
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    {loading ? (
                         [...Array(3)].map((_, i) => <Skeleton key={i} className="h-96 w-full" />)
                    ) : historyEvents.length > 0 ? (
                        historyEvents.map(enrollment => {
                            if (!enrollment.eventDetails) return null;
                            const progressPercentage = Math.min(100, (enrollment.progress / enrollment.eventDetails.targetAmount) * 100);
                            const isExpired = enrollment.status === 'enrolled' && enrollment.expiresAt.toDate() <= new Date();

                            return (
                                <Card key={enrollment.id} className="flex flex-col opacity-70">
                                    <CardHeader className="text-center">
                                         <div className="mx-auto p-3 bg-muted/50 rounded-full w-fit mb-2">
                                            <HistoryIcon className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <CardTitle className="text-2xl">{enrollment.eventDetails.title}</CardTitle>
                                        <Badge variant={enrollment.status === 'completed' ? 'default' : 'destructive'} className="w-fit mx-auto">{isExpired ? 'Expired' : 'Completed'}</Badge>
                                    </CardHeader>
                                    <CardContent className="space-y-4 flex-1">
                                        <div className="space-y-2">
                                             <div className="flex justify-between text-sm font-medium">
                                                <span>Final Progress</span>
                                                <span>{renderProgressDetails(enrollment)}</span>
                                            </div>
                                            <Progress value={progressPercentage} />
                                        </div>
                                         <div className="p-4 bg-secondary/50 rounded-lg text-center space-y-1">
                                            <p className="text-sm text-muted-foreground">Reward</p>
                                            <p className="text-xl font-bold text-green-400">LKR {enrollment.eventDetails.rewardAmount.toFixed(2)}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })
                     ) : (
                         <div className="col-span-full flex flex-col items-center justify-center text-center gap-4 py-12">
                            <HistoryIcon className="w-16 h-16 text-muted-foreground" />
                            <h2 className="text-2xl font-bold">No Event History</h2>
                            <p className="text-muted-foreground">Your completed and expired events will appear here.</p>
                        </div>
                    )}
                 </div>
            </TabsContent>
        </Tabs>
    );
}
