
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, runTransaction, increment, serverTimestamp, updateDoc, arrayRemove } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

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
}

export default function ReferralClaimsPage() {
    const [claims, setClaims] = useState<BonusClaim[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const q = query(collection(db, 'bonus_claims'), where('status', '==', 'pending'));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const claimsDataPromises = snapshot.docs.map(async (claimDoc) => {
                const data = claimDoc.data() as BonusClaim;
                const userDoc = await getDoc(doc(db, 'users', data.userId));
                return { 
                    ...data, 
                    id: claimDoc.id, 
                    userName: userDoc.exists() ? `${userDoc.data().firstName} ${userDoc.data().lastName}` : 'Unknown User' 
                };
            });
            const claimsData = await Promise.all(claimsDataPromises);
            setClaims(claimsData.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds));
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleClaimAction = async (claim: BonusClaim, newStatus: 'approved' | 'rejected') => {
        const claimRef = doc(db, 'bonus_claims', claim.id);
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
            toast({ variant: 'destructive', title: "Error", description: error.message });
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Pending Referral Bonus Claims</CardTitle>
                <CardDescription>Review and approve or reject referral bonus claims.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p>Loading claims...</p>
                ) : claims.length === 0 ? (
                    <p>No pending claims found.</p>
                ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Amount (LKR)</TableHead>
                            <TableHead>Campaign</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {claims.map((claim) => (
                            <TableRow key={claim.id}>
                                <TableCell>
                                     <Link href={`/admin/users/${claim.userId}`} className="hover:underline text-primary">
                                        {claim.userName}
                                    </Link>
                                </TableCell>
                                <TableCell>{claim.amount.toFixed(2)}</TableCell>
                                <TableCell>{claim.campaignTitle}</TableCell>
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
            </CardContent>
        </Card>
    );
}
