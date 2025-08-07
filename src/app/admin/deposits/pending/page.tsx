

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
import type { DepositBonus } from '@/app/admin/bonus/page';
import { Input } from '@/components/ui/input';
import { Gift } from 'lucide-react';


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
    const [bonusSettings, setBonusSettings] = useState<DepositBonus | null>(null);
    const [loading, setLoading] = useState(true);
    const [bonusAmounts, setBonusAmounts] = useState<{[key: string]: number}>({});

    const { toast } = useToast();
    const router = useRouter();


    useEffect(() => {
        const bonusRef = doc(db, 'settings', 'depositBonus');
        const unsubscribeBonus = onSnapshot(bonusRef, (docSnap) => {
            if (docSnap.exists()) {
                setBonusSettings(docSnap.data() as DepositBonus);
            } else {
                setBonusSettings(null);
            }
        });

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
                        user: userDoc.data() as Transaction['user'] 
                    });
                }
            }
            setDeposits(pendingDeposits.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds));
            setLoading(false);
        });

        return () => {
            unsubscribeBonus();
            unsubscribeDeposits();
        };
    }, []);

    useEffect(() => {
        if (!bonusSettings || deposits.length === 0) return;

        const updatedBonusAmounts: {[key: string]: number} = {};

        deposits.forEach(deposit => {
            if (!bonusSettings.startTime) return;

            const now = new Date();
            const bonusIsActive = bonusSettings.isActive && 
                                  (bonusSettings.startTime.toDate().getTime() + (bonusSettings.durationHours * 3600 * 1000)) > now.getTime();

            const isEligible = bonusIsActive &&
                deposit.amount >= bonusSettings.minDeposit &&
                deposit.amount <= bonusSettings.maxDeposit &&
                deposit.createdAt.toDate() > bonusSettings.startTime.toDate();
            
            if (isEligible) {
                let calculatedBonus = 0;
                if (bonusSettings.bonusType === 'percentage') {
                    calculatedBonus = deposit.amount * (bonusSettings.percentage / 100);
                } else if (bonusSettings.bonusType === 'fixed') {
                    calculatedBonus = bonusSettings.fixedAmount;
                }
                updatedBonusAmounts[deposit.id] = calculatedBonus;
            }
        });
        setBonusAmounts(updatedBonusAmounts);

    }, [deposits, bonusSettings]);

    const handleTransaction = async (transaction: Transaction, newStatus: 'approved' | 'rejected') => {
        const batch = writeBatch(db);
        const transactionRef = doc(db, 'transactions', transaction.id);
        const userRef = doc(db, 'users', transaction.userId);

        try {
            if (newStatus === 'approved') {
                const bonusAmount = bonusAmounts[transaction.id] || 0;
                
                const updatePayload: any = {
                    balance: increment(transaction.amount)
                };
                if (bonusAmount > 0) {
                    updatePayload.bonusBalance = increment(bonusAmount);
                }
                
                batch.update(userRef, updatePayload);
                
                let description = `Approved: ${transaction.amount.toFixed(2)} Deposit`;
                if (bonusAmount > 0) {
                    description += ` with LKR ${bonusAmount.toFixed(2)} bonus`;
                }
                 batch.update(transactionRef, { 
                    status: newStatus, 
                    description: description
                });
                
                toast({
                    title: 'Success!',
                    description: `Deposit of LKR ${transaction.amount.toFixed(2)} approved ${bonusAmount > 0 ? `with a bonus of LKR ${bonusAmount.toFixed(2)}` : ''}.`,
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
    
    const handleBonusAmountChange = (depositId: string, amount: string) => {
        setBonusAmounts(prev => ({...prev, [depositId]: parseFloat(amount) || 0}));
    }


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
                            <TableHead>Bonus (LKR)</TableHead>
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
                                <TableCell>
                                     {bonusAmounts[deposit.id] !== undefined ? (
                                        <div className="flex items-center gap-1">
                                             <Gift className="w-4 h-4 text-primary"/>
                                            <Input 
                                                type="number" 
                                                value={bonusAmounts[deposit.id]}
                                                onChange={(e) => handleBonusAmountChange(deposit.id, e.target.value)}
                                                className="w-24 h-8"
                                            />
                                        </div>
                                     ) : (
                                        <span className="text-muted-foreground text-xs">N/A</span>
                                     )}
                                </TableCell>
                                <TableCell>{deposit.createdAt ? format(new Date(deposit.createdAt.seconds * 1000), 'PPp') : 'N/A'}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button size="sm" variant="outline" onClick={() => handleTransaction(deposit, 'approved')}>
                                        {bonusAmounts[deposit.id] !== undefined ? 'Approve with Bonus' : 'Approve'}
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
