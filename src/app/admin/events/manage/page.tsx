
'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, serverTimestamp, deleteDoc, query, where, getDocs, collectionGroup, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Calendar, PlusCircle, Trash2, Users, Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export interface Event {
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
    userId: string;
    status: 'enrolled' | 'completed' | 'claimed';
    progress: number;
    enrolledAt: any;
    user?: {
        firstName: string;
        lastName: string;
    };
}


const USDT_RATE = 310;

const eventDrafts = [
    { title: "Weekend Warrior", description: "Climb the ranks this weekend! Earn the most to claim the top prize." },
    { title: "Rookies Rumble", description: "New to the game? Prove your skills in this beginner-friendly tournament." },
    { title: "Checkmate Challenge", description: "Secure 10 victories in Chess with a wager of LKR 50 or more to win a bonus." },
    { title: "King's Ransom", description: "Accumulate LKR 2000 in total earnings to claim a royal reward." },
    { title: "The Grandmaster's Gauntlet", description: "A high-stakes event for elite players. Only the best will triumph." },
    { title: "Daily Dasher", description: "Win 5 games in the next 24 hours to get a quick bonus." },
    { title: "High Roller's Heist", description: "Play big, win bigger. This event is for players who aren't afraid of high wagers." },
    { title: "Strategic Streak", description: "Achieve a 5-game winning streak to prove your strategic dominance." },
    { title: "Checkers Champion Quest", description: "Win 15 games of Checkers to be crowned the champion." },
    { title: "The Profit Prophecy", description: "Double your investment! Earn LKR 5000 from a starting point." },
    { title: "Midnight Madness", description: "Compete in the late hours for exclusive rewards. Only games after midnight count." },
    { title: "The Tactician's Trial", description: "This event rewards calculated plays and consistent earnings over a week." },
    { title: "Blitz Boss", description: "Dominate in fast-paced games. All 5-minute timer games count towards your goal." },
    { title: "Endgame Expert", description: "Show your prowess in the final stages. Wins with fewer than 10 pieces left get a bonus." },
    { title: "The Ascendant", description: "A week-long challenge to see who can earn the most from a LKR 1000 starting balance." },
    { title: "Pawn Promotion Prize", description: "Successfully promote 10 pawns to queens in winning games to earn a special prize." },
    { title: "The Jumper's Jackpot (Checkers)", description: "Execute 50 successful jumps in Checkers to win." },
    { title: "The Royal Treasury", description: "A massive event with a huge prize pool for the top 3 earners over a month." },
    { title: "The Equalizer", description: "Win 5 games against higher-ranked opponents to get a special underdog bonus." },
    { title: "The First Move Advantage", description: "Win 10 games playing as White to master the opening advantage." }
];

export default function ManageEventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'events'), (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Event));
            setEvents(eventsData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSave = async (event: Partial<Event>) => {
        const eventId = event.id || doc(collection(db, 'events')).id;
        if (!event.title || !event.description) {
            toast({ variant: "destructive", title: 'Error', description: 'Title and description cannot be empty.' });
            return;
        }
        try {
            await setDoc(doc(db, 'events', eventId), {
                ...event,
                id: eventId,
                createdAt: event.createdAt || serverTimestamp(),
            }, { merge: true });
            toast({ title: 'Event Saved', description: 'The event details have been updated.' });
        } catch (error) {
            console.error("Error saving event:", error);
            toast({ variant: "destructive", title: 'Error', description: 'Failed to save event.' });
        }
    };
    
    const handleDelete = async (eventId: string) => {
        if (!window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, 'events', eventId));
            toast({ title: 'Event Deleted', description: 'The event has been removed.' });
        } catch (error) {
             console.error("Error deleting event:", error);
            toast({ variant: "destructive", title: 'Error', description: 'Failed to delete event.' });
        }
    };

    const EventForm = ({ event, onSave, onDelete, isNew = false }: { event: Partial<Event>, onSave: (e: Partial<Event>) => void, onDelete?: (id: string) => void, isNew?: boolean }) => {
        const [localEvent, setLocalEvent] = useState(event);
        const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
        const [loadingEnrollments, setLoadingEnrollments] = useState(true);

        useEffect(() => {
            setLocalEvent(event);
        }, [event]);

        useEffect(() => {
            if (!localEvent.id || isNew) {
                setLoadingEnrollments(false);
                return;
            };

            const fetchEnrollments = async () => {
                setLoadingEnrollments(true);
                // Fetch all users first
                const usersSnapshot = await getDocs(collection(db, 'users'));
                const enrollmentsData: Enrollment[] = [];
                
                // Iterate through each user to check for an enrollment
                for (const userDoc of usersSnapshot.docs) {
                    const userId = userDoc.id;
                    const enrollmentRef = doc(db, 'users', userId, 'event_enrollments', localEvent.id!);
                    const enrollmentSnap = await getDoc(enrollmentRef);

                    if (enrollmentSnap.exists()) {
                        const enrollment = enrollmentSnap.data() as Enrollment;
                        enrollmentsData.push({
                            ...enrollment,
                            user: {
                                firstName: userDoc.data().firstName,
                                lastName: userDoc.data().lastName,
                            },
                        });
                    }
                }
                
                setEnrollments(enrollmentsData);
                setLoadingEnrollments(false);
            };

            fetchEnrollments();
            
        }, [localEvent.id, isNew]);

        const handleChange = (field: keyof Event, value: any) => {
            const isNumeric = ['enrollmentFee', 'targetAmount', 'rewardAmount', 'durationHours', 'minWager'].includes(field);
            setLocalEvent(prev => ({ ...prev, [field]: isNumeric ? Number(value) : value }));
        };
        
        const handleDraftSelect = (draftTitle: string) => {
            if (draftTitle === 'custom') {
                handleChange('title', '');
                handleChange('description', '');
                return;
            }
            const selectedDraft = eventDrafts.find(d => d.title === draftTitle);
            if (selectedDraft) {
                handleChange('title', selectedDraft.title);
                handleChange('description', selectedDraft.description);
            }
        };

        const isWinningType = localEvent.targetType === 'winningMatches';

        return (
            <Card>
                <CardHeader>
                    <CardTitle>{isNew ? 'Create New Event' : 'Edit Event'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     {isNew && (
                        <div className="space-y-2">
                            <Label>Load a Draft</Label>
                            <Select onValueChange={handleDraftSelect}>
                                <SelectTrigger><SelectValue placeholder="Select a pre-written event draft..."/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="custom">Custom Title</SelectItem>
                                    {eventDrafts.map(draft => (
                                        <SelectItem key={draft.title} value={draft.title}>{draft.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <Label htmlFor={`isActive-${localEvent.id || 'new'}`}>Event Status</Label>
                        <Switch id={`isActive-${localEvent.id || 'new'}`} checked={localEvent.isActive || false} onCheckedChange={(val) => handleChange('isActive', val)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Title</Label>
                        <Input value={localEvent.title || ''} onChange={(e) => handleChange('title', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input value={localEvent.description || ''} onChange={(e) => handleChange('description', e.target.value)} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label>Enrollment Fee (LKR)</Label>
                            <Input type="number" value={localEvent.enrollmentFee || 0} onChange={(e) => handleChange('enrollmentFee', e.target.value)} />
                             <p className="text-xs text-muted-foreground">~{((localEvent.enrollmentFee || 0) / USDT_RATE).toFixed(2)} USDT</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Target Type</Label>
                             <Select value={localEvent.targetType || 'totalEarnings'} onValueChange={(val) => handleChange('targetType', val)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="totalEarnings">Total Earnings</SelectItem>
                                    <SelectItem value="winningMatches">Winning Matches</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {isWinningType && (
                             <div className="space-y-2">
                                <Label>Minimum Wager (LKR)</Label>
                                <Input type="number" value={localEvent.minWager || 0} onChange={(e) => handleChange('minWager', e.target.value)} />
                                <p className="text-xs text-muted-foreground">Only wins from games with this wager or higher will count.</p>
                            </div>
                        )}
                         <div className="space-y-2">
                            <Label>{isWinningType ? "Target Wins" : "Target Earnings (LKR)"}</Label>
                            <Input type="number" value={localEvent.targetAmount || 0} onChange={(e) => handleChange('targetAmount', e.target.value)} />
                            {!isWinningType && <p className="text-xs text-muted-foreground">~{((localEvent.targetAmount || 0) / USDT_RATE).toFixed(2)} USDT</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Reward Amount (LKR)</Label>
                            <Input type="number" value={localEvent.rewardAmount || 0} onChange={(e) => handleChange('rewardAmount', e.target.value)} />
                             <p className="text-xs text-muted-foreground">~{((localEvent.rewardAmount || 0) / USDT_RATE).toFixed(2)} USDT</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Duration (Hours)</Label>
                            <Input type="number" value={localEvent.durationHours || 0} onChange={(e) => handleChange('durationHours', e.target.value)} />
                        </div>
                    </div>
                </CardContent>
                {!isNew && localEvent.id && (
                    <CardContent>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><Users/> Enrolled Players ({enrollments.length})</h3>
                        {loadingEnrollments ? <Skeleton className="h-24 w-full" /> : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Player</TableHead>
                                        <TableHead>Enrolled At</TableHead>
                                        <TableHead>Progress</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {enrollments.length > 0 ? enrollments.map(enr => {
                                        const progressPercentage = localEvent.targetAmount ? Math.min(100, (enr.progress / (localEvent.targetAmount || 1)) * 100) : 0;
                                        return (
                                            <TableRow key={enr.userId}>
                                                <TableCell>
                                                    <Link href={`/admin/users/${enr.userId}`} className="text-primary hover:underline">
                                                        {enr.user?.firstName} {enr.user?.lastName}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>{format(enr.enrolledAt.toDate(), 'PPp')}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Progress value={progressPercentage} className="w-24"/>
                                                        <span className="text-xs text-muted-foreground">{progressPercentage.toFixed(0)}%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                     <Badge variant={enr.status === 'completed' || enr.status === 'claimed' ? 'default' : 'secondary'}>{enr.status}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    }) : (
                                         <TableRow>
                                            <TableCell colSpan={4} className="text-center">No players have enrolled in this event yet.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                )}
                <CardFooter className="flex justify-between">
                    <Button onClick={() => onSave(localEvent)}>{isNew ? 'Create Event' : 'Save Changes'}</Button>
                    {onDelete && localEvent.id && <Button variant="destructive" onClick={() => onDelete(localEvent.id!)}><Trash2/></Button>}
                </CardFooter>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Calendar /> Event Management</CardTitle>
                    <CardDescription>Create and configure special events for your players.</CardDescription>
                </CardHeader>
            </Card>
            
            <EventForm event={{ isActive: false, targetType: 'totalEarnings' }} onSave={handleSave} isNew />
            
            <div className="space-y-4">
                <h2 className="text-2xl font-bold">Existing Events</h2>
                {loading ? (
                    <Skeleton className="h-48 w-full" />
                ) : events.length > 0 ? (
                    events.map(event => (
                        <EventForm key={event.id} event={event} onSave={handleSave} onDelete={handleDelete} />
                    ))
                ) : (
                    <p>No events found.</p>
                )}
            </div>
        </div>
    )
}

    