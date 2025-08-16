
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, writeBatch, serverTimestamp, increment, Timestamp, getCountFromServer, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { DepositBonusCampaign } from '../../bonus/deposit-bonus/page';


interface Transaction {
    id: string;
    userId: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
    depositMethod: 'bank' | 'binance';
    user?: { firstName: string; lastName:string; email: string; phone: string; };
    eligibleBonus?: number;
}

export default function PendingDepositsPage() {
    const [deposits, setDeposits] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const router = useRouter();


    const handleTransaction = async (transaction: Transaction, newStatus: 'approved' | 'rejected') => {
        const batch = writeBatch(db);
        const transactionRef = doc(db, 'transactions', transaction.id);
        const userRef = doc(db, 'users', transaction.userId);

        try {
            if (newStatus === 'approved') {
                let bonusAmount = 0;
                let bonusDescription = '';

                // Find active deposit bonus campaign
                const bonusQuery = query(collection(db, 'deposit_bonus_campaigns'), where('isActive', '==', true));
                const bonusSnapshot = await getDocs(bonusQuery);

                if(!bonusSnapshot.empty) {
                    const campaign = { id: bonusSnapshot.docs[0].id, ...bonusSnapshot.docs[0].data() } as DepositBonusCampaign;
                    const claimsRef = collection(db, `deposit_bonus_campaigns/${campaign.id}/claims`);
                    const userClaimRef = doc(claimsRef, transaction.userId);

                    const claimsSnapshot = await getCountFromServer(claimsRef);
                    const userClaimDoc = await getDoc(userClaimRef);
                    
                    if (claimsSnapshot.data().count < campaign.userLimit && !userClaimDoc.exists() && transaction.amount >= campaign.minDeposit && transaction.amount <= campaign.maxDeposit) {
                         bonusAmount = transaction.amount * (campaign.percentage / 100);
                         bonusDescription = `Deposit Bonus: ${campaign.title}`;
                         batch.set(userClaimRef, { userId: transaction.userId, claimedAt: serverTimestamp(), amount: bonusAmount });
                    }
                }
                
                const totalAmount = transaction.amount + bonusAmount;
                batch.update(userRef, { balance: increment(totalAmount) });
                batch.update(transactionRef, { status: newStatus });
                
                // If there's a bonus, create a separate transaction log for it
                if (bonusAmount > 0) {
                    const bonusTransactionRef = doc(collection(db, 'transactions'));
                    batch.set(bonusTransactionRef, {
                        userId: transaction.userId,
                        type: 'bonus',
                        amount: bonusAmount,
                        status: 'completed',
                        description: bonusDescription,
                        createdAt: serverTimestamp()
                    });
                }
                
                toast({
                    title: 'Success!',
                    description: `Deposit of LKR ${transaction.amount.toFixed(2)} approved. ${bonusAmount > 0 ? `Bonus of LKR ${bonusAmount.toFixed(2)} added.` : ''}`,
                });

            } else { // 'rejected'
                 batch.update(transactionRef, { status: newStatus });
                 toast({
                    title: 'Success!',
                    description: `Deposit has been rejected.`,
                });
            }
            
            await batch.commit();

        } catch (error) {
            console.error(`Error updating deposit status:`, error);
            toast({
                variant: "destructive",
                title: 'Error',
                description: 'Failed to update deposit.',
            });
        }
    };
    
    useEffect(() => {
        const q = query(collection(db, 'transactions'), where('type', '==', 'deposit'), where('status', '==', 'pending'));
        
        const unsubscribeDeposits = onSnapshot(q, async (snapshot) => {
            const pendingDeposits: Transaction[] = [];
            for (const transactionDoc of snapshot.docs) {
                const depositData = transactionDoc.data() as Transaction;
                const userDoc = await getDoc(doc(db, 'users', depositData.userId));
                if (userDoc.exists()) {
                    pendingDeposits.push({ 
                        ...depositData, 
                        id: transactionDoc.id, 
                        user: userDoc.data() as Transaction['user'],
                    });
                }
            }
            setDeposits(pendingDeposits.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds));
            setLoading(false);
        });

        return () => {
            unsubscribeDeposits();
        };
    }, []);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Pending Deposits</CardTitle>
                <CardDescription>Review and approve or reject new deposit requests.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p>Loading pending deposits...</p>
                ) : deposits.length === 0 ? (
                    <p>No pending deposits.</p>
                ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Amount (LKR)</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {deposits.map((deposit) => (
                            <TableRow key={deposit.id}>
                                <TableCell>
                                    <Button variant="link" className="p-0 h-auto" onClick={() => router.push(`/admin/users/${deposit.userId}`)}>
                                        <div className="font-medium text-left">{deposit.user?.firstName} {deposit.user?.lastName}</div>
                                    </Button>
                                    <div className="text-sm text-muted-foreground">{deposit.user?.email}</div>
                                    <div className="text-sm text-muted-foreground">{deposit.user?.phone}</div>
                                </TableCell>
                                <TableCell>
                                    <div>{deposit.amount.toFixed(2)}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="capitalize">{deposit.depositMethod}</Badge>
                                </TableCell>
                                <TableCell>{deposit.createdAt ? format(new Date(deposit.createdAt.seconds * 1000), 'PPp') : 'N/A'}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button size="sm" variant="outline" onClick={() => handleTransaction(deposit, 'approved')}>
                                        Approve
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleTransaction(deposit, 'rejected')}>Reject</Button>
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
