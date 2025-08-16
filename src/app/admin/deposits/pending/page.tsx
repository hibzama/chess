
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, writeBatch, serverTimestamp, increment, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';


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
    const [bonusSettings, setBonusSettings] = useState({
        depositBonusEnabled: false,
        depositBonusPercentage: 10,
        depositBonusMaxAmount: 500,
    });

    const { toast } = useToast();
    const router = useRouter();


    useEffect(() => {
        const fetchBonusSettings = async () => {
            const settingsRef = doc(db, 'settings', 'depositBonusConfig');
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
                setBonusSettings(settingsSnap.data() as typeof bonusSettings);
            }
        }
        fetchBonusSettings();

        const q = query(collection(db, 'transactions'), where('type', '==', 'deposit'), where('status', '==', 'pending'));
        
        const unsubscribeDeposits = onSnapshot(q, async (snapshot) => {
            const pendingDeposits: Transaction[] = [];
            for (const transactionDoc of snapshot.docs) {
                const depositData = transactionDoc.data() as Transaction;
                const userDoc = await getDoc(doc(db, 'users', depositData.userId));
                if (userDoc.exists()) {
                    let eligibleBonus = 0;
                    if(bonusSettings.depositBonusEnabled) {
                        const bonus = depositData.amount * (bonusSettings.depositBonusPercentage / 100);
                        eligibleBonus = Math.min(bonus, bonusSettings.depositBonusMaxAmount);
                    }
                    pendingDeposits.push({ 
                        ...depositData, 
                        id: transactionDoc.id, 
                        user: userDoc.data() as Transaction['user'],
                        eligibleBonus,
                    });
                }
            }
            setDeposits(pendingDeposits.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds));
            setLoading(false);
        });

        return () => {
            unsubscribeDeposits();
        };
    }, [bonusSettings.depositBonusEnabled, bonusSettings.depositBonusMaxAmount, bonusSettings.depositBonusPercentage]);

    const handleTransaction = async (transaction: Transaction, newStatus: 'approved' | 'rejected') => {
        const batch = writeBatch(db);
        const transactionRef = doc(db, 'transactions', transaction.id);
        const userRef = doc(db, 'users', transaction.userId);

        try {
            if (newStatus === 'approved') {
                const totalAmount = transaction.amount + (transaction.eligibleBonus || 0);
                batch.update(userRef, { balance: increment(totalAmount) });
                batch.update(transactionRef, { status: newStatus });
                
                // If there's a bonus, create a separate transaction log for it
                if (transaction.eligibleBonus && transaction.eligibleBonus > 0) {
                    const bonusTransactionRef = doc(collection(db, 'transactions'));
                    batch.set(bonusTransactionRef, {
                        userId: transaction.userId,
                        type: 'bonus',
                        amount: transaction.eligibleBonus,
                        status: 'completed',
                        description: 'Deposit Bonus',
                        createdAt: serverTimestamp()
                    });
                }
                
                toast({
                    title: 'Success!',
                    description: `Deposit of LKR ${transaction.amount.toFixed(2)} approved. ${transaction.eligibleBonus ? `Bonus of LKR ${transaction.eligibleBonus.toFixed(2)} added.` : ''}`,
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
                                    {deposit.eligibleBonus && deposit.eligibleBonus > 0 && (
                                        <Badge variant="secondary" className="mt-1">Bonus: {deposit.eligibleBonus.toFixed(2)}</Badge>
                                    )}
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
