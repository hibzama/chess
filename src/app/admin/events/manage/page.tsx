
'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, getDoc, doc, documentId, where, getDocs, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Calendar as CalendarIcon, Gift, Users, DollarSign, Target, PlusCircle, Trash2, Edit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export interface Event {
    id: string;
    title: string;
    targetType: 'winningMatches' | 'totalEarnings';
    targetAmount: number;
    enrollmentFee: number;
    rewardAmount: number;
    durationDays: number;
    isActive: boolean;
    createdAt?: any;
    updatedAt?: any;
}

interface EnrolledUser {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    progress: number;
    status: 'enrolled' | 'completed' | 'expired';
}

export default function ManageEventsPage() {
    const [newEvent, setNewEvent] = useState<Partial<Event>>({
        title: '',
        targetType: 'winningMatches',
        targetAmount: 10,
        enrollmentFee: 100,
        rewardAmount: 500,
        durationDays: 7,
        isActive: false
    });
    const [events, setEvents] = useState<Event[]>([]);
    const [enrolledUsers, setEnrolledUsers] = useState<{ [key: string]: EnrolledUser[] }>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    useEffect(() => {
        const eventsQuery = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Event));
            setEvents(eventsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const fetchEnrolledUsers = async (eventId: string) => {
        if (enrolledUsers[eventId]) return; // Don't re-fetch
        
        const enrollmentsRef = collection(db, 'event_enrollments', eventId, 'users');
        const enrollmentsSnap = await getDocs(enrollmentsRef);
        
        if (enrollmentsSnap.empty) {
            setEnrolledUsers(prev => ({ ...prev, [eventId]: [] }));
            return;
        }

        const userIds = enrollmentsSnap.docs.map(d => d.id);
        const users: EnrolledUser[] = [];
        const enrollmentDataMap = new Map(enrollmentsSnap.docs.map(d => [d.id, d.data()]));

        for (let i = 0; i < userIds.length; i += 10) {
            const batchUids = userIds.slice(i, i + 10);
            const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', batchUids));
            const userDocs = await getDocs(usersQuery);
            userDocs.forEach(doc => {
                const enrollmentData = enrollmentDataMap.get(doc.id);
                users.push({ 
                    ...doc.data(), 
                    uid: doc.id,
                    progress: enrollmentData?.progress || 0,
                    status: enrollmentData?.status || 'enrolled',
                } as EnrolledUser);
            });
        }
        setEnrolledUsers(prev => ({ ...prev, [eventId]: users }));
    };
    
    const handleUpdateEvent = async (eventId: string, updatedData: Partial<Event>) => {
        setSaving(true);
        const eventRef = doc(db, 'events', eventId);
        try {
            await updateDoc(eventRef, {...updatedData, updatedAt: serverTimestamp()});
            toast({ title: "Success!", description: "Event has been updated." });
        } catch(e) {
            console.error(e);
            toast({ variant: 'destructive', title: "Error", description: "Failed to update event."});
        } finally {
            setSaving(false);
        }
    }

    const handleDeleteEvent = async (eventId: string) => {
        if (!window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;
        setSaving(true);
        try {
            await deleteDoc(doc(db, 'events', eventId));
            toast({ title: 'Event Deleted', description: 'The event has been successfully removed.' });
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete event.' });
        } finally {
            setSaving(false);
        }
    }

    const handleCreateEvent = async () => {
        if (!newEvent.title || !newEvent.targetAmount) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill out all required fields.' });
            return;
        }
        setSaving(true);
        try {
            const eventPayload = {
                ...newEvent,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            await addDoc(collection(db, 'events'), eventPayload);
            toast({ title: 'Success!', description: 'New event has been created.' });
            setIsCreateDialogOpen(false); // Close dialog on success
             setNewEvent({ title: '', targetType: 'winningMatches', targetAmount: 10, enrollmentFee: 100, rewardAmount: 500, durationDays: 7, isActive: false }); // Reset form
        } catch (error) {
            console.error("Error creating event:", error);
            toast({ variant: "destructive", title: 'Error', description: 'Failed to create event.' });
        } finally {
            setSaving(false);
        }
    };
    
    const handleChange = (field: keyof Event, value: any) => {
        const isNumericField = ['targetAmount', 'enrollmentFee', 'rewardAmount', 'durationDays'].includes(field);
        setNewEvent(prev => ({ ...prev, [field]: isNumericField ? Number(value) : value }));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Event Management</h1>
                    <p className="text-muted-foreground">Create and manage player events and challenges.</p>
                </div>
                 <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                         <Button><PlusCircle className="mr-2"/> Create New Event</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                         <DialogHeader>
                            <DialogTitle>Create New Event</DialogTitle>
                        </DialogHeader>
                         <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Event Title</Label>
                                <Input id="title" value={newEvent.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="e.g., Weekend Warrior"/>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="targetType">Target Type</Label>
                                <Select value={newEvent.targetType} onValueChange={(v) => handleChange('targetType', v)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="winningMatches">Winning Matches</SelectItem>
                                        <SelectItem value="totalEarnings">Total Earnings</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="targetAmount">Target Amount</Label>
                                <Input id="targetAmount" type="number" value={newEvent.targetAmount} onChange={(e) => handleChange('targetAmount', e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="enrollmentFee">Enrollment Fee (LKR)</Label>
                                <Input id="enrollmentFee" type="number" value={newEvent.enrollmentFee} onChange={(e) => handleChange('enrollmentFee', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rewardAmount">Reward Amount (LKR)</Label>
                                <Input id="rewardAmount" type="number" value={newEvent.rewardAmount} onChange={(e) => handleChange('rewardAmount', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="durationDays">Duration (in days)</Label>
                                <Input id="durationDays" type="number" value={newEvent.durationDays} onChange={(e) => handleChange('durationDays', e.target.value)} />
                            </div>
                             <div className="flex items-center space-x-2">
                                <Switch id="isActive" checked={newEvent.isActive} onCheckedChange={(v) => handleChange('isActive', v)} />
                                <Label htmlFor="isActive">Is Active?</Label>
                            </div>
                        </div>
                        <Button onClick={handleCreateEvent} disabled={saving}>{saving ? 'Creating...' : 'Create Event'}</Button>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Existing Events</CardTitle>
                    <CardDescription>View and manage all created events.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? <Skeleton className="h-48 w-full"/> : (
                         <Accordion type="single" collapsible className="w-full" onValueChange={(id) => id && fetchEnrolledUsers(id)}>
                            {events.map(event => (
                                <AccordionItem key={event.id} value={event.id}>
                                    <AccordionTrigger>
                                        <div className="flex items-center justify-between w-full pr-4">
                                            <div className="text-left">
                                                <p className="font-semibold">{event.title}</p>
                                                <p className="text-sm text-muted-foreground">{event.targetType === 'winningMatches' ? `${event.targetAmount} Wins` : `LKR ${event.targetAmount} Earned`}</p>
                                            </div>
                                            <Badge variant={event.isActive ? 'default' : 'secondary'}>{event.isActive ? "Active" : "Inactive"}</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="p-4 bg-muted/50 rounded-md space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                     <div className="flex items-center gap-2 mb-2">
                                                        <Switch id={`isActive-${event.id}`} checked={event.isActive} onCheckedChange={(v) => handleUpdateEvent(event.id, { isActive: v })}/>
                                                        <Label htmlFor={`isActive-${event.id}`}>Event Active</Label>
                                                     </div>
                                                </div>
                                                <Button variant="destructive" size="sm" onClick={() => handleDeleteEvent(event.id)}><Trash2 className="mr-2"/> Delete</Button>
                                            </div>

                                             <h4 className="font-semibold mb-2">Enrolled Players ({enrolledUsers[event.id]?.length || 0})</h4>
                                             {enrolledUsers[event.id] ? (
                                                enrolledUsers[event.id].length > 0 ? (
                                                    <Table>
                                                        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Progress</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                                        <TableBody>
                                                            {enrolledUsers[event.id].map(u => (
                                                                <TableRow key={u.uid}>
                                                                    <TableCell>{u.firstName} {u.lastName}</TableCell>
                                                                    <TableCell>{u.progress.toLocaleString()} / {event.targetAmount.toLocaleString()}</TableCell>
                                                                    <TableCell><Badge variant={u.status === 'completed' ? 'default' : 'outline'}>{u.status}</Badge></TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                ) : <p className="text-sm text-center text-muted-foreground p-4">No enrollments yet for this event.</p>
                                             ) : <Skeleton className="h-24 w-full" />}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                         </Accordion>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

