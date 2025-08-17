
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CheckCircle2, XCircle } from 'lucide-react';

interface Transaction {
    id: string;
    userId: string;
    amount: number;
    status: 'approved' | 'rejected';
    createdAt: any;
    depositMethod: 'bank' | 'binance';
    user?: { firstName: string; lastName: string; email: string };
}

export default function DepositHistoryPage() {
    const [deposits, setDeposits] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'transactions'), 
            where('type', '==', 'deposit'),
            orderBy('createdAt', 'desc')
        );
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const allDeposits: Transaction[] = [];
            for (const transactionDoc of snapshot.docs) {
                const depositData = transactionDoc.data() as Omit<Transaction, 'id' | 'user'>;
                // Fetch only completed or rejected transactions
                if (depositData.status === 'approved' || depositData.status === 'rejected') {
                    const userDoc = await getDoc(doc(db, 'users', depositData.userId));
                    allDeposits.push({ 
                        ...depositData, 
                        id: transactionDoc.id, 
                        user: userDoc.exists() ? userDoc.data() as Transaction['user'] : undefined
                    });
                }
            }
            setDeposits(allDeposits);
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
                <CardTitle>Deposit History</CardTitle>
                <CardDescription>A log of all approved and rejected deposits.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p>Loading deposit history...</p>
                ) : deposits.length === 0 ? (
                    <p>No deposit history found.</p>
                ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Amount (LKR)</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {deposits.map((deposit) => (
                            <TableRow key={deposit.id}>
                                <TableCell>
                                    <div className="font-medium">{deposit.user?.firstName} {deposit.user?.lastName}</div>
                                    <div className="text-sm text-muted-foreground">{deposit.user?.email}</div>
                                </TableCell>
                                <TableCell>{deposit.amount.toFixed(2)}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="capitalize">{deposit.depositMethod}</Badge>
                                </TableCell>
                                <TableCell>{deposit.createdAt ? format(new Date(deposit.createdAt.seconds * 1000), 'PPp') : 'N/A'}</TableCell>
                                <TableCell>
                                    <Badge variant={deposit.status === 'approved' ? 'default' : 'destructive'} className="flex items-center gap-1.5 w-fit">
                                        {getStatusIcon(deposit.status)}
                                        <span className="capitalize">{deposit.status}</span>
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
