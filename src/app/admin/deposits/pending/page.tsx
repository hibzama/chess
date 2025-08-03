
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, writeBatch, serverTimestamp, arrayUnion, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import type { DepositBonus } from '../../bonus/page';
import { useRouter } from 'next/navigation';


interface Transaction {
    id: string;
    userId: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
    depositMethod: 'bank' | 'binance';
    user?: { firstName: string; lastName:string; email: string; phone: string; };
}

export default function PendingDepositsPage() {
    const [deposits, setDeposits] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const router = useRouter();


    useEffect(() => {
        const q = query(collection(db, 'transactions'), where('type', '==', 'deposit'), where('status', '==', 'pending'));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const pendingDeposits: Transaction[] = [];
            for (const transactionDoc of snapshot.docs) {
                const depositData = transactionDoc.data() as Transaction;
                const userDoc = await getDoc(doc(db, 'users', depositData.userId));
                if (userDoc.exists()) {
                    pendingDeposits.push({ 
                        ...depositData, 
                        id: transactionDoc.id, 
                        user: userDoc.data() as Transaction['user'] 
                    });
                }
            }
            setDeposits(pendingDeposits.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds));
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleTransaction = async (transactionId: string, userId: string, amount: number, newStatus: 'approved' | 'rejected') => {
        const batch = writeBatch(db);
        const transactionRef = doc(db, 'transactions', transactionId);

        try {
            batch.update(transactionRef, { status: newStatus });

            if (newStatus === 'approved') {
                const userRef = doc(db, 'users', userId);
                const userDoc = await getDoc(userRef);
                if (!userDoc.exists()) throw new Error("User not found");

                let totalDepositAmount = amount;
                let bonusAmount = 0;
                let bonusDescription = `Deposit approved.`;

                // --- Bonus Logic ---
                const bonusRef = doc(db, 'settings', 'depositBonus');
                const bonusSnap = await getDoc(bonusRef);
                if (bonusSnap.exists()) {
                    const bonusData = bonusSnap.data() as DepositBonus;
                    const bonusIsActive = bonusData.isActive && bonusData.startTime;
                    const bonusExpiry = bonusIsActive ? bonusData.startTime!.toMillis() + (bonusData.durationHours * 60 * 60 * 1000) : 0;
                    const isExpired = Date.now() > bonusExpiry;
                    
                    const canClaim = bonusIsActive && 
                                     !isExpired &&
                                     bonusData.claimedBy.length < bonusData.maxUsers && 
                                     !bonusData.claimedBy.includes(userId);
                    
                    if (canClaim && amount >= bonusData.minDeposit && amount <= bonusData.maxDeposit) {
                        bonusAmount = amount * (bonusData.percentage / 100);
                        totalDepositAmount += bonusAmount;
                        
                        batch.update(bonusRef, {
                            claimedBy: arrayUnion(userId)
                        });
                        
                        // Create a transaction record for the bonus
                         const bonusTransactionRef = doc(collection(db, 'transactions'));
                         batch.set(bonusTransactionRef, {
                            userId,
                            type: 'deposit',
                            amount: bonusAmount,
                            status: 'completed',
                            description: `${bonusData.percentage}% Deposit Bonus`,
                            createdAt: serverTimestamp()
                         });
                         
                        bonusDescription = `Deposit approved with a bonus of LKR ${bonusAmount.toFixed(2)}!`;
                    }
                }
                // --- End Bonus Logic ---

                const newBalance = (userDoc.data().balance || 0) + totalDepositAmount;
                batch.update(userRef, { balance: newBalance });
                
                toast({
                    title: 'Success!',
                    description: bonusDescription,
                });

            } else {
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
                                <TableCell>{deposit.amount.toFixed(2)}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="capitalize">{deposit.depositMethod}</Badge>
                                </TableCell>
                                <TableCell>{deposit.createdAt ? format(new Date(deposit.createdAt.seconds * 1000), 'PPp') : 'N/A'}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button size="sm" variant="outline" onClick={() => handleTransaction(deposit.id, deposit.userId, deposit.amount, 'approved')}>Approve</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleTransaction(deposit.id, deposit.userId, deposit.amount, 'rejected')}>Reject</Button>
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
