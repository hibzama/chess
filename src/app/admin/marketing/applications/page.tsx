
'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';

interface Application {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    marketingPlan: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
    password?: string;
}

export default function MarketingApplicationsPage() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const q = collection(db, 'marketing_applications');
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const appsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Application));
            setApplications(appsData.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds));
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleApplication = async (app: Application, newStatus: 'approved' | 'rejected') => {
        const appRef = doc(db, 'marketing_applications', app.id);
        try {
            if (newStatus === 'approved') {
                // This is a simplified approval process. In a real app, you would use a secure backend function.
                // Create user in Auth
                const userCredential = await createUserWithEmailAndPassword(auth, app.email, app.password!);
                const user = userCredential.user;

                // Create user document in Firestore
                const userRef = doc(db, 'users', user.uid);
                await setDoc(userRef, {
                    uid: user.uid,
                    firstName: app.firstName,
                    lastName: app.lastName,
                    email: app.email,
                    phone: app.phone,
                    role: 'marketer',
                    balance: 0,
                    createdAt: new Date(),
                    mref: user.uid, // Marketer's own referral code
                });
            }

            // Update application status
            await updateDoc(appRef, { status: newStatus });
            toast({
                title: 'Success!',
                description: `Application has been ${newStatus}.`,
            });

        } catch (error: any) {
            console.error(`Error updating application:`, error);
            let errorMessage = 'Failed to update application.';
            if(error.code === 'auth/email-already-in-use') {
                errorMessage = 'This email is already registered as a user.';
            }
            toast({
                variant: "destructive",
                title: 'Error',
                description: errorMessage,
            });
        }
    };
    
    const pendingApplications = applications.filter(a => a.status === 'pending');

    return (
        <Card>
            <CardHeader>
                <CardTitle>Marketing Applications</CardTitle>
                <CardDescription>Review and approve new marketing partner requests.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p>Loading applications...</p>
                ) : pendingApplications.length === 0 ? (
                    <p>No pending applications.</p>
                ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Applicant</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Marketing Plan</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pendingApplications.map((app) => (
                            <TableRow key={app.id}>
                                <TableCell>
                                    <div className="font-medium">{app.firstName} {app.lastName}</div>
                                    <div className="text-sm text-muted-foreground">{app.email}</div>
                                     <div className="text-sm text-muted-foreground">{app.phone}</div>
                                </TableCell>
                                <TableCell>{app.createdAt ? format(new Date(app.createdAt.seconds * 1000), 'PPp') : 'N/A'}</TableCell>
                                <TableCell>
                                    <Accordion type="single" collapsible className="w-full max-w-xs">
                                        <AccordionItem value="item-1">
                                            <AccordionTrigger className="py-1">View Plan</AccordionTrigger>
                                            <AccordionContent className="text-xs pt-2">
                                               {app.marketingPlan}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button size="sm" variant="outline" onClick={() => handleApplication(app, 'approved')}>Approve</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleApplication(app, 'rejected')}>Reject</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                )}
            </CardContent>
        </Card>
    );
}

    