
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, onSnapshot, query, where, doc, updateDoc, getDoc, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface BonusClaim {
    id: string;
    userId: string;
    userName?: string;
    amount: number;
    campaignTitle: string;
    type: 'task';
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
    answers?: Record<string, string>;
}

async function enrichClaims(snapshot: any): Promise<BonusClaim[]> {
    const claimsDataPromises = snapshot.docs.map(async (claimDoc: any) => {
        const data = claimDoc.data() as BonusClaim;
        const userDoc = await getDoc(doc(db, 'users', data.userId));
        
        return { 
            ...data, 
            id: claimDoc.id, 
            userName: userDoc.exists() ? `${userDoc.data().firstName} ${userDoc.data().lastName}` : 'Unknown User',
        };
    });
    return Promise.all(claimsDataPromises);
}

export default function TaskClaimsPage() {
    const [allClaims, setAllClaims] = useState<BonusClaim[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'bonus_claims'), where('type', '==', 'task'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const claims = await enrichClaims(snapshot);
            setAllClaims(claims);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching claims:", error);
            toast({ variant: 'destructive', title: "Error", description: "Failed to fetch task claims."});
            setLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);
    
    const handleClaimAction = async (claim: BonusClaim, newStatus: 'approved' | 'rejected') => {
        try {
            if (newStatus === 'approved') {
                const approveClaimFunction = httpsCallable(functions, 'approveBonusClaim');
                await approveClaimFunction({ claimId: claim.id });
                toast({ title: "Claim Approved", description: "Bonus has been added to the user's wallet." });
            } else {
                await updateDoc(doc(db, 'bonus_claims', claim.id), { status: 'rejected' });
                toast({ title: "Claim Rejected", description: "The claim has been rejected. No funds were added." });
            }
        } catch (error: any) {
            console.error("Error processing claim: ", error);
            toast({ variant: 'destructive', title: "Error", description: error.message });
        }
    };

    const pendingClaims = useMemo(() => allClaims.filter(c => c.status === 'pending'), [allClaims]);
    const historyClaims = useMemo(() => allClaims.filter(c => c.status !== 'pending'), [allClaims]);

    const renderTable = (claims: BonusClaim[], type: 'pending' | 'history') => {
        if (loading) {
            return <div className="flex justify-center items-center h-24"><Loader2 className="animate-spin text-primary" /></div>;
        }
        if (claims.length === 0) {
            return <p className="text-center py-8 text-muted-foreground">No {type} claims found.</p>;
        }
        
        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Answers</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">{type === 'pending' ? 'Actions' : 'Status'}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {claims.map((claim) => (
                        <TableRow key={claim.id}>
                            <TableCell><Link href={`/admin/users/${claim.userId}`} className="hover:underline text-primary">{claim.userName}</Link></TableCell>
                            <TableCell>{claim.campaignTitle}</TableCell>
                            <TableCell>
                                <Accordion type="single" collapsible className="w-full max-w-xs"><AccordionItem value="item-1" className="border-b-0"><AccordionTrigger className="py-1 text-xs">View Answers</AccordionTrigger><AccordionContent className="text-xs pt-2 bg-muted p-2 rounded-md space-y-1">{claim.answers ? Object.entries(claim.answers).map(([key, value]) => (<p key={key}><strong>Q:</strong> ...{key.slice(-4)} <strong>A:</strong> {value}</p>)) : <p>No answer.</p>}</AccordionContent></AccordionItem></Accordion>
                            </TableCell>
                            <TableCell>{claim.createdAt ? format(new Date(claim.createdAt.seconds * 1000), 'PPp') : 'N/A'}</TableCell>
                            <TableCell className="text-right">
                                {type === 'pending' ? (
                                    <div className="space-x-2"><Button size="sm" variant="outline" onClick={() => handleClaimAction(claim, 'approved')}>Approve</Button><Button size="sm" variant="destructive" onClick={() => handleClaimAction(claim, 'rejected')}>Reject</Button></div>
                                ) : (
                                    <Badge variant={claim.status === 'approved' ? 'default' : 'destructive'} className="flex items-center gap-1.5 w-fit ml-auto">{claim.status === 'approved' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}<span className="capitalize">{claim.status}</span></Badge>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Task Claims</CardTitle>
                <CardDescription>Review and manage all user submissions for task campaigns.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="pending">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="pending">Pending ({loading ? '...' : pendingClaims.length})</TabsTrigger>
                        <TabsTrigger value="history">History ({loading ? '...' : historyClaims.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pending">{renderTable(pendingClaims, 'pending')}</TabsContent>
                    <TabsContent value="history">{renderTable(historyClaims, 'history')}</TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

