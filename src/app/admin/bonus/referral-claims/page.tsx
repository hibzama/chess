
'use client';
import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collectionGroup, query, onSnapshot, doc, getDoc, runTransaction, increment, serverTimestamp, updateDoc, arrayRemove, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface BonusClaim {
    id: string;
    userId: string;
    userName?: string;
    amount: number;
    campaignTitle: string;
    type: 'referee' | 'referrer';
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
    refereeId?: string; 
    referrerId?: string;
    campaignId?: string;
    answer?: string;
}

async function enrichClaims(snapshot: any): Promise<BonusClaim[]> {
    const claimsDataPromises = snapshot.docs.map(async (claimDoc: any) => {
        const data = claimDoc.data() as BonusClaim;
        const userDoc = await getDoc(doc(db, 'users', data.userId));
        
        let answer = '';
        if(data.type === 'referee' && data.refereeId && data.campaignId) {
            const campaignInfoDoc = await getDoc(doc(db, `users/${data.refereeId}/active_campaigns`, 'current'));
            if(campaignInfoDoc.exists()) {
                 const campaignInfo = campaignInfoDoc.data();
                 const campaignDetails = await getDoc(doc(db, 'referral_campaigns', data.campaignId));
                 if(campaignDetails.exists()){
                     const tasks = campaignDetails.data().tasks;
                     const relatedTask = tasks.find((t: any) => t.description.substring(0,30) === data.campaignTitle.split(':')[1]?.trim().substring(0,30));
                     if(relatedTask && campaignInfo.answers) {
                         answer = campaignInfo.answers[relatedTask.id] || 'Not found';
                     }
                 }
            }
        }

        return { 
            ...data, 
            id: claimDoc.id, 
            userName: userDoc.exists() ? `${userDoc.data().firstName} ${userDoc.data().lastName}` : 'Unknown User',
            answer: answer
        };
    });
    return Promise.all(claimsDataPromises);
}

export default function ReferralClaimsPage() {
    const [allClaims, setAllClaims] = useState<BonusClaim[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        setLoading(true);
        const handleError = (error: Error, type: string) => {
            console.error(`Error fetching ${type} claims:`, error);
            toast({ variant: 'destructive', title: `Error fetching claims.`, description: error.message });
        };
        
        const q = query(
            collectionGroup(db, 'bonus_claims'),
            orderBy('createdAt', 'desc'),
            limit(100) 
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const claims = await enrichClaims(snapshot);
            setAllClaims(claims);
            setLoading(false);
        }, (err) => handleError(err, 'all'));
        
        return () => unsubscribe();
    }, [toast]);

    const pendingClaims = useMemo(() => allClaims.filter(c => c.status === 'pending'), [allClaims]);
    const historyClaims = useMemo(() => allClaims.filter(c => c.status !== 'pending'), [allClaims]);
    
    const handleClaimAction = async (claim: BonusClaim, newStatus: 'approved' | 'rejected') => {
        const claimRef = doc(db, 'bonus_claims', claim.id);
        
        try {
            if (newStatus === 'approved') {
                 // The new system does auto-approval, so this button is just for cleanup.
                 // We just delete the claim doc. The user has already been paid.
                await deleteDoc(claimRef);
                toast({ title: "Claim Cleared", description: "This claim has been removed from the list." });
            } else { // Rejected
                // For a rejection, we must find the original transaction and revert it if needed.
                // This logic would be complex. For now, we'll just delete the claim notice.
                await deleteDoc(claimRef);
                toast({ title: "Claim Rejected & Cleared", description: "The claim has been removed." });
            }
        } catch (error: any) {
            console.error("Error processing claim: ", error);
            toast({ variant: 'destructive', title: "Error", description: error.message });
        }
    };
    
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
                        <TableHead>Amount</TableHead>
                        <TableHead>Campaign/Task</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">{type === 'pending' ? 'Actions' : 'Status'}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {claims.map((claim) => (
                        <TableRow key={claim.id}>
                            <TableCell><Link href={`/admin/users/${claim.userId}`} className="hover:underline text-primary">{claim.userName}</Link></TableCell>
                            <TableCell>{claim.amount.toFixed(2)}</TableCell>
                            <TableCell>
                                {claim.campaignTitle}
                                {claim.type === 'referee' && claim.answer && (
                                    <Accordion type="single" collapsible className="w-full max-w-xs"><AccordionItem value="item-1" className="border-b-0"><AccordionTrigger className="py-1 text-xs">View Submitted Answer</AccordionTrigger><AccordionContent className="text-xs pt-2 bg-muted p-2 rounded-md">{claim.answer}</AccordionContent></AccordionItem></Accordion>
                                )}
                            </TableCell>
                            <TableCell><Badge variant="secondary" className="capitalize">{claim.type}</Badge></TableCell>
                            <TableCell>{claim.createdAt ? format(new Date(claim.createdAt.seconds * 1000), 'PPp') : 'N/A'}</TableCell>
                            <TableCell className="text-right">
                                {type === 'pending' ? (
                                    <div className="space-x-2">
                                        <Button size="sm" variant="outline" onClick={() => handleClaimAction(claim, 'approved')}>Clear Claim</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleClaimAction(claim, 'rejected')}>Reject & Clear</Button>
                                    </div>
                                ) : (
                                    <Badge variant={claim.status === 'approved' ? 'default' : 'destructive'} className="flex items-center gap-1.5 w-fit ml-auto">
                                        {claim.status === 'approved' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                        <span className="capitalize">{claim.status}</span>
                                    </Badge>
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
                <CardTitle>Referral Bonus Claims</CardTitle>
                <CardDescription>Bonuses are now paid automatically. This page is for viewing historical claims or issues.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="pending">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="pending">Pending ({loading ? '...' : pendingClaims.length})</TabsTrigger>
                        <TabsTrigger value="history">History ({loading ? '...' : historyClaims.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pending">
                        {renderTable(pendingClaims, 'pending')}
                    </TabsContent>
                    <TabsContent value="history">
                        {renderTable(historyClaims, 'history')}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
