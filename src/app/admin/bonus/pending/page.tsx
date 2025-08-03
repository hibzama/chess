
'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
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
    description: string;
    user?: { firstName: string; lastName:string; email: string; phone: string; };
}

export default function PendingBonusesPage() {
    const [bonuses, setBonuses] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const router = useRouter();


    useEffect(() => {
        const q = query(collection(db, 'transactions'), where('type', '==', 'bonus'), where('status', '==', 'pending'));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const pendingBonuses: Transaction[] = [];
            for (const transactionDoc of snapshot.docs) {
                const bonusData = transactionDoc.data() as Transaction;
                const userDoc = await getDoc(doc(db, 'users', bonusData.userId));
                if (userDoc.exists()) {
                    pendingBonuses.push({ 
                        ...bonusData, 
                        id: transactionDoc.id, 
                        user: userDoc.data() as Transaction['user'] 
                    });
                }
            }
            setBonuses(pendingBonuses.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds));
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleTransaction = async (transactionId: string, userId: string, amount: number, newStatus: 'approved' | 'rejected') => {
        const batch = writeBatch(db);
        const transactionRef = doc(db, 'transactions', transactionId);
        const userRef = doc(db, 'users', userId);

        try {
            if (newStatus === 'approved') {
                batch.update(userRef, { balance: increment(amount) });
                batch.update(transactionRef, { 
                    status: newStatus, 
                    description: `Approved: ${amount.toFixed(2)} Bonus`
                });
                
                toast({
                    title: 'Success!',
                    description: `Bonus of LKR ${amount.toFixed(2)} approved.`,
                });

            } else { // 'rejected'
                 batch.update(transactionRef, { status: newStatus });
                 toast({
                    title: 'Success!',
                    description: `Bonus has been rejected.`,
                });
            }
            
            await batch.commit();

        } catch (error) {
            console.error(`Error updating bonus status:`, error);
            toast({
                variant: "destructive",
                title: 'Error',
                description: 'Failed to update bonus.',
            });
        }
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle>Pending Bonuses</CardTitle>
                <CardDescription>Review and approve or reject pending bonus transactions.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p>Loading pending bonuses...</p>
                ) : bonuses.length === 0 ? (
                    <p>No pending bonuses.</p>
                ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Bonus Amount (LKR)</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bonuses.map((bonus) => (
                            <TableRow key={bonus.id}>
                                <TableCell>
                                    <Button variant="link" className="p-0 h-auto" onClick={() => router.push(`/admin/users/${bonus.userId}`)}>
                                        <div className="font-medium text-left">{bonus.user?.firstName} {bonus.user?.lastName}</div>
                                    </Button>
                                    <div className="text-sm text-muted-foreground">{bonus.user?.email}</div>
                                    <div className="text-sm text-muted-foreground">{bonus.user?.phone}</div>
                                </TableCell>
                                <TableCell>{bonus.amount.toFixed(2)}</TableCell>
                                 <TableCell>
                                    <Badge variant="secondary" className="capitalize">{bonus.description}</Badge>
                                </TableCell>
                                <TableCell>{bonus.createdAt ? format(new Date(bonus.createdAt.seconds * 1000), 'PPp') : 'N/A'}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button size="sm" variant="outline" onClick={() => handleTransaction(bonus.id, bonus.userId, bonus.amount, 'approved')}>Approve</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleTransaction(bonus.id, bonus.userId, bonus.amount, 'rejected')}>Reject</Button>
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

