
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, writeBatch, increment } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Transaction {
    id: string;
    userId: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
    withdrawalDetails: {
        bankName: string;
        branch: string;
        accountNumber: string;
        accountName: string;
    };
    user?: { firstName: string; lastName: string; email: string };
}

export default function PendingMarketingWithdrawalsPage() {
    const [withdrawals, setWithdrawals] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const q = query(collection(db, 'transactions'), where('type', '==', 'marketing_withdrawal'), where('status', '==', 'pending'));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const pendingWithdrawals: Transaction[] = [];
            for (const transactionDoc of snapshot.docs) {
                const withdrawalData = transactionDoc.data() as Transaction;
                const userDoc = await getDoc(doc(db, 'users', withdrawalData.userId));
                if (userDoc.exists()) {
                    pendingWithdrawals.push({ 
                        ...withdrawalData, 
                        id: transactionDoc.id, 
                        user: userDoc.data() as Transaction['user'] 
                    });
                }
            }
            setWithdrawals(pendingWithdrawals.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds));
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleTransaction = async (transactionId: string, userId: string, amount: number, newStatus: 'approved' | 'rejected') => {
        const transactionRef = doc(db, 'transactions', transactionId);

        try {
            if (newStatus === 'rejected') {
                const userRef = doc(db, 'users', userId);
                const batch = writeBatch(db);
                batch.update(transactionRef, { status: 'rejected' });
                batch.update(userRef, { marketingBalance: increment(amount) }); // Refund the marketer
                await batch.commit();
                toast({
                    title: 'Success!',
                    description: 'Withdrawal has been rejected and funds returned to marketer.',
                });
            } else { // approved
                await updateDoc(transactionRef, { status: 'approved' });
                toast({
                    title: 'Success!',
                    description: 'Withdrawal has been approved.',
                });
            }

        } catch (error) {
            console.error(`Error updating withdrawal status:`, error);
            toast({
                variant: "destructive",
                title: 'Error',
                description: 'Failed to update withdrawal.',
            });
        }
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle>Pending Marketing Withdrawals</CardTitle>
                <CardDescription>Review and process new marketing withdrawal requests.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p>Loading pending withdrawals...</p>
                ) : withdrawals.length === 0 ? (
                    <p>No pending withdrawals.</p>
                ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Amount (LKR)</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {withdrawals.map((w) => (
                            <TableRow key={w.id}>
                                <TableCell>
                                    <div className="font-medium">{w.user?.firstName} {w.user?.lastName}</div>
                                    <div className="text-sm text-muted-foreground">{w.user?.email}</div>
                                </TableCell>
                                <TableCell>{w.amount.toFixed(2)}</TableCell>
                                <TableCell>{w.createdAt ? format(new Date(w.createdAt.seconds * 1000), 'PPp') : 'N/A'}</TableCell>
                                <TableCell>
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="item-1">
                                            <AccordionTrigger className="py-1">View Details</AccordionTrigger>
                                            <AccordionContent className="text-xs space-y-1 pt-2">
                                                <p><strong>Bank:</strong> {w.withdrawalDetails.bankName}</p>
                                                <p><strong>Branch:</strong> {w.withdrawalDetails.branch}</p>
                                                <p><strong>Account #:</strong> {w.withdrawalDetails.accountNumber}</p>
                                                <p><strong>Name:</strong> {w.withdrawalDetails.accountName}</p>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button size="sm" variant="outline" onClick={() => handleTransaction(w.id, w.userId, w.amount, 'approved')}>Approve</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleTransaction(w.id, w.userId, w.amount, 'rejected')}>Reject</Button>
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
