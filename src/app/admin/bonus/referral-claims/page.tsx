
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collectionGroup, query, where, onSnapshot, doc, getDoc, runTransaction, increment, serverTimestamp, updateDoc, arrayRemove, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle } from 'lucide-react';

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
    const [pendingClaims, setPendingClaims] = useState<BonusClaim[]>([]);
    const [historyClaims, setHistoryClaims] = useState<BonusClaim[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        setLoading(true);
        const handleError = (error: Error, type: string) => {
            console.error(`Error fetching ${type} claims:`, error);
            toast({ variant: 'destructive', title: `Error fetching ${type} claims.`, description: error.message });
        };
        
        const pendingQuery = query(
            collectionGroup(db, 'bonus_claims'),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'asc')
        );

        const historyQuery = query(
            collectionGroup(db, 'bonus_claims'),
            where('status', 'in', ['approved', 'rejected']),
            orderBy('createdAt', 'asc')
        );
        
        const unsubPending = onSnapshot(pendingQuery, async (snapshot) => {
            const claims = await enrichClaims(snapshot);
            setPendingClaims(claims.reverse());
            setLoading(false);
        }, (err) => handleError(err, 'pending'));

        const unsubHistory = onSnapshot(historyQuery, async (snapshot) => {
            const claims = await enrichClaims(snapshot);
            setHistoryClaims(claims.reverse());
        }, (err) => handleError(err, 'history'));

        return () => {
            unsubPending();
            unsubHistory();
        };
    }, [toast]);
    
    const handleClaimAction = async (claim: BonusClaim, newStatus: 'approved' | 'rejected') => {
        // This is tricky with collectionGroup. We need the full path to the document.
        // For simplicity, let's assume claims are under the user who receives the bonus.
        const claimRef = doc(db, 'users', claim.userId, 'bonus_claims', claim.id);
        const userRef = doc(db, 'users', claim.userId);
        
        try {
            await runTransaction(db, async (transaction) => {
                const claimDoc = await transaction.get(claimRef);
                if (!claimDoc.exists() || claimDoc.data()?.status !== 'pending') {
                    throw new Error("This claim has already been processed.");
                }

                if (newStatus === 'approved') {
                    transaction.update(claimRef, { status: 'approved' });
                    transaction.update(userRef, { balance: increment(claim.amount) });
                    
                    const transactionRef = doc(collection(db, 'transactions'));
                    transaction.set(transactionRef, {
                        userId: claim.userId,
                        type: 'bonus',
                        amount: claim.amount,
                        status: 'completed',
                        description: `Referral Bonus: ${claim.campaignTitle}`,
                        createdAt: serverTimestamp(),
                    });
                } else { // Rejected
                    transaction.update(claimRef, { status: 'rejected' });
                    
                    if (claim.type === 'referee' && claim.refereeId && claim.referrerId && claim.campaignId) {
                         const referrerCampaignRef = doc(db, 'users', claim.referrerId, 'active_campaigns', claim.campaignId);
                         transaction.update(referrerCampaignRef, {
                            referrals: arrayRemove(claim.refereeId)
                         });
                    }
                }
            });

            toast({ title: "Success!", description: `Claim has been ${newStatus}.` });

        } catch (error: any) {
            console.error("Error processing claim: ", error);
            // This is a common error if the claim document isn't where we expect it.
            // A more robust solution might involve querying for the doc path first.
            if(error.message.includes('No document to update')){
                 toast({ variant: 'destructive', title: "Error", description: `Could not locate the claim document. This might be a data structure issue.` });
            } else {
                 toast({ variant: 'destructive', title: "Error", description: error.message });
            }
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Referral Bonus Claims</CardTitle>
                <CardDescription>Review pending claims and view past claim history.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="pending">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="pending">Pending</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pending">
                        {loading ? <p>Loading claims...</p> : pendingClaims.length === 0 ? <p className="text-center py-8">No pending claims found.</p> : (
                        <Table>
                            <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Amount</TableHead><TableHead>Campaign/Task</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {pendingClaims.map((claim) => (
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
                                    <TableCell className="text-right space-x-2">
                                        <Button size="sm" variant="outline" onClick={() => handleClaimAction(claim, 'approved')}>Approve</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleClaimAction(claim, 'rejected')}>Reject</Button>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        )}
                    </TabsContent>
                    <TabsContent value="history">
                         {loading ? <p>Loading history...</p> : historyClaims.length === 0 ? <p className="text-center py-8">No claim history found.</p> : (
                        <Table>
                            <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Amount</TableHead><TableHead>Campaign</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {historyClaims.map((claim) => (
                                <TableRow key={claim.id}>
                                    <TableCell>{claim.userName}</TableCell>
                                    <TableCell>{claim.amount.toFixed(2)}</TableCell>
                                    <TableCell>{claim.campaignTitle}</TableCell>
                                    <TableCell>{claim.createdAt ? format(new Date(claim.createdAt.seconds * 1000), 'PPp') : 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant={claim.status === 'approved' ? 'default' : 'destructive'} className="flex items-center gap-1.5 w-fit">
                                            {claim.status === 'approved' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                            <span className="capitalize">{claim.status}</span>
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
