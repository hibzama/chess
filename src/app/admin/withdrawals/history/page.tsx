'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Transaction {
    id: string;
    userId: string;
    amount: number;
    status: 'approved' | 'rejected';
    createdAt: any;
    withdrawalMethod: 'bank' | 'binance';
    withdrawalDetails: {
        bankName?: string;
        branch?: string;
        accountNumber?: string;
        accountName?: string;
        binancePayId?: string;
    };
    user?: { firstName: string; lastName: string; email: string };
}

export default function WithdrawalHistoryPage() {
    const [withdrawals, setWithdrawals] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'transactions'), 
            where('type', '==', 'withdrawal'), 
            where('status', 'in', ['approved', 'rejected']),
            orderBy('createdAt', 'desc')
        );
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const history: Transaction[] = [];
            for (const transactionDoc of snapshot.docs) {
                const withdrawalData = transactionDoc.data() as Transaction;
                const userDoc = await getDoc(doc(db, 'users', withdrawalData.userId));
                if (userDoc.exists()) {
                    history.push({ 
                        ...withdrawalData, 
                        id: transactionDoc.id, 
                        user: userDoc.data() as Transaction['user'] 
                    });
                }
            }
            setWithdrawals(history); // Already sorted
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const getStatusIcon = (status: Transaction['status']) => {
        switch (status) {
          case 'approved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
          case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
        }
      };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Withdrawal History</CardTitle>
                <CardDescription>A log of all approved and rejected withdrawals.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p>Loading withdrawal history...</p>
                ) : withdrawals.length === 0 ? (
                    <p>No withdrawal history found.</p>
                ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Amount (LKR)</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead>Status</TableHead>
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
                                            <AccordionTrigger className="py-1 capitalize">{w.withdrawalMethod}</AccordionTrigger>
                                            <AccordionContent className="text-xs space-y-1 pt-2">
                                                {w.withdrawalMethod === 'bank' ? (
                                                    <>
                                                        <p><strong>Bank:</strong> {w.withdrawalDetails.bankName}</p>
                                                        <p><strong>Branch:</strong> {w.withdrawalDetails.branch}</p>
                                                        <p><strong>Account #:</strong> {w.withdrawalDetails.accountNumber}</p>
                                                        <p><strong>Name:</strong> {w.withdrawalDetails.accountName}</p>
                                                    </>
                                                ) : (
                                                    <p><strong>PayID:</strong> {w.withdrawalDetails.binancePayId}</p>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={w.status === 'approved' ? 'default' : 'destructive'} className="flex items-center gap-1.5 w-fit">
                                        {getStatusIcon(w.status)}
                                        <span className="capitalize">{w.status}</span>
                                    </Badge>
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
