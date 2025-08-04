
'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Calendar, PlusCircle, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface Event {
    id: string;
    title: string;
    description: string;
    enrollmentFee: number;
    targetType: 'totalEarnings';
    targetAmount: number;
    rewardAmount: number;
    durationDays: number;
    isActive: boolean;
    createdAt?: any;
}

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

    const EventForm = ({ event, onSave, onDelete }: { event: Partial<Event>, onSave: (e: Partial<Event>) => void, onDelete?: (id: string) => void }) => {
        const [localEvent, setLocalEvent] = useState(event);

        useEffect(() => {
            setLocalEvent(event);
        }, [event]);

        const handleChange = (field: keyof Event, value: any) => {
            const isNumeric = ['enrollmentFee', 'targetAmount', 'rewardAmount', 'durationDays'].includes(field);
            setLocalEvent(prev => ({ ...prev, [field]: isNumeric ? Number(value) : value }));
        };

        return (
            <Card>
                <CardHeader>
                    <CardTitle>{localEvent.id ? 'Edit Event' : 'Create New Event'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <Label htmlFor={`isActive-${localEvent.id}`}>Event Status</Label>
                        <Switch id={`isActive-${localEvent.id}`} checked={localEvent.isActive || false} onCheckedChange={(val) => handleChange('isActive', val)} />
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
                        </div>
                        <div className="space-y-2">
                            <Label>Target Type</Label>
                             <Select value={localEvent.targetType || 'totalEarnings'} onValueChange={(val) => handleChange('targetType', val)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent><SelectItem value="totalEarnings">Total Earnings</SelectItem></SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label>Target Amount (LKR)</Label>
                            <Input type="number" value={localEvent.targetAmount || 0} onChange={(e) => handleChange('targetAmount', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Reward Amount (LKR)</Label>
                            <Input type="number" value={localEvent.rewardAmount || 0} onChange={(e) => handleChange('rewardAmount', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Duration (Days)</Label>
                            <Input type="number" value={localEvent.durationDays || 0} onChange={(e) => handleChange('durationDays', e.target.value)} />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button onClick={() => onSave(localEvent)}>Save</Button>
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
            
            <EventForm event={{ isActive: false, targetType: 'totalEarnings' }} onSave={handleSave} />
            
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
