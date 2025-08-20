
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, ArrowDownCircle, History, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

type Transaction = {
    id: string;
    type: 'marketing_withdrawal' | 'commission';
    amount: number;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    createdAt: any;
    description?: string;
};

export default function MarketingWalletPage() {
  const { user, userData, loading: authLoading, currencyConfig } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalDetails, setWithdrawalDetails] = useState({ bankName: '', branch: '', accountNumber: '', accountName: '' });
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    }
    
    const q = query(collection(db, 'transactions'), where('userId', '==', user.uid), where('type', 'in', ['marketing_withdrawal', 'commission']));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(userTransactions.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching transactions:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch transaction history.' });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);
  

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !withdrawalAmount || Object.values(withdrawalDetails).some(v => v === '')) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill all fields.' });
      return;
    }
    const amountInLKR = parseFloat(withdrawalAmount);

    if (amountInLKR < 100) {
        toast({ variant: 'destructive', title: 'Error', description: `Minimum withdrawal amount is ${currencyConfig.symbol} 100.` });
        return;
    }

    if(userData && (userData.marketingBalance || 0) < amountInLKR) {
        toast({ variant: 'destructive', title: 'Error', description: 'Insufficient commission balance.' });
        return;
    }

    setSubmittingWithdrawal(true);
    try {
        const userRef = doc(db, 'users', user.uid);
        // Immediately deduct balance
        await updateDoc(userRef, {
            marketingBalance: increment(-amountInLKR)
        });

      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'marketing_withdrawal',
        amount: amountInLKR,
        status: 'pending',
        description: `Marketing withdrawal to ${withdrawalDetails.bankName}`,
        withdrawalDetails,
        createdAt: serverTimestamp()
      });

      toast({ title: 'Success', description: 'Withdrawal request submitted.' });
      setWithdrawalAmount('');
      setWithdrawalDetails({ bankName: '', branch: '', accountNumber: '', accountName: '' });

    } catch (error: any) {
        console.error("Error submitting withdrawal:", error);
        toast({ variant: 'destructive', title: 'Error', description: `Failed to submit withdrawal request: ${error.message}` });
        
        // Revert balance deduction if firestore update fails
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
            marketingBalance: increment(amountInLKR)
        });

    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'approved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
    }
  };
  
  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-4xl font-bold tracking-tight text-center">Your Marketing Wallet</h1>
        <p className="text-muted-foreground text-center">Manage your commission earnings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DollarSign /> Commission Balance</CardTitle>
        </CardHeader>
        <CardContent>
            {authLoading || !userData ? (
                <div className="space-y-2">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
            ) : (
                <div>
                    <p className="text-4xl font-bold">{currencyConfig.symbol} {(userData.marketingBalance || 0).toFixed(2)}</p>
                    <p className="text-muted-foreground">~{((userData.marketingBalance || 0) / currencyConfig.usdtRate).toFixed(2)} USDT</p>
                </div>
            )}
        </CardContent>
      </Card>

      <Tabs defaultValue="withdraw" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="withdraw"><ArrowDownCircle /> Withdraw</TabsTrigger>
          <TabsTrigger value="history"><History /> History</TabsTrigger>
        </TabsList>
        <TabsContent value="withdraw">
             <Card>
                <CardHeader>
                    <CardTitle>Withdraw Commission</CardTitle>
                    <CardDescription>Request a withdrawal. Funds will be transferred to your account by an admin.</CardDescription>
                </CardHeader>
                <form onSubmit={handleWithdrawalSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="withdrawal-amount">Amount ({currencyConfig.symbol})</Label>
                            <Input id="withdrawal-amount" type="number" value={withdrawalAmount} onChange={e => setWithdrawalAmount(e.target.value)} placeholder="e.g., 1550" required />
                             <p className="text-xs text-muted-foreground pt-1">Minimum withdrawal amount: 100 {currencyConfig.symbol}</p>
                        </div>
                        <Separator />
                        <p className="font-medium text-sm">Bank Details</p>
                        <div className="space-y-2">
                            <Label htmlFor="bank-name">Bank Name</Label>
                            <Input id="bank-name" value={withdrawalDetails.bankName} onChange={e => setWithdrawalDetails({...withdrawalDetails, bankName: e.target.value})} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="branch">Branch</Label>
                            <Input id="branch" value={withdrawalDetails.branch} onChange={e => setWithdrawalDetails({...withdrawalDetails, branch: e.target.value})} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="account-number">Account Number</Label>
                            <Input id="account-number" value={withdrawalDetails.accountNumber} onChange={e => setWithdrawalDetails({...withdrawalDetails, accountNumber: e.target.value})} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="account-name">Account Holder Name</Label>
                            <Input id="account-name" value={withdrawalDetails.accountName} onChange={e => setWithdrawalDetails({...withdrawalDetails, accountName: e.target.value})} required />
                        </div>
                    </CardContent>
                    <CardFooter>
                    <Button type="submit" disabled={submittingWithdrawal}>{submittingWithdrawal ? "Requesting..." : "Request Withdrawal"}</Button>
                    </CardFooter>
                </form>
            </Card>
        </TabsContent>
        <TabsContent value="history">
              <Card>
                <CardHeader>
                <CardTitle>Commission & Withdrawal History</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[400px]">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="text-center">Loading history...</TableCell></TableRow>
                            ) : transactions.length > 0 ? (
                                transactions.map(tx => (
                                <TableRow key={tx.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div>
                                                <span className="capitalize font-medium">{tx.type.replace('_', ' ')}</span>
                                                {tx.description && <p className="text-xs text-muted-foreground">{tx.description}</p>}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{currencyConfig.symbol} {tx.amount.toFixed(2)}</div>
                                        <div className="text-xs text-muted-foreground">~{(tx.amount / currencyConfig.usdtRate).toFixed(2)} USDT</div>
                                    </TableCell>
                                    <TableCell>{tx.createdAt ? format(new Date(tx.createdAt.seconds * 1000), 'PPp') : 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant={tx.status === 'approved' || tx.status === 'completed' ? 'default' : tx.status === 'rejected' ? 'destructive' : 'secondary'} className="flex items-center gap-1.5 w-fit">
                                            {getStatusIcon(tx.status)}
                                            <span className="capitalize">{tx.status}</span>
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={4} className="text-center">No transactions yet.</TableCell></TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
