'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle2, XCircle, Banknote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

type Transaction = {
    id: string;
    type: 'deposit' | 'withdrawal';
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
    slipUrl?: string;
    withdrawalDetails?: any;
};

export default function WalletPage() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [depositAmount, setDepositAmount] = useState('');
  const [depositSlip, setDepositSlip] = useState<File | null>(null);
  const [depositMethod, setDepositMethod] = useState<'binance' | 'bank'>('binance');
  const [submittingDeposit, setSubmittingDeposit] = useState(false);
  const depositFileRef = useRef<HTMLInputElement>(null);

  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalMethod, setWithdrawalMethod] = useState('bank');
  const [withdrawalDetails, setWithdrawalDetails] = useState({ bankName: '', branch: '', accountNumber: '', accountName: '' });
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    }
    
    const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
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
  

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !depositSlip || !depositAmount) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill all fields and select a slip.' });
      return;
    }
    setSubmittingDeposit(true);
    try {
      const storageRef = ref(storage, `slips/${user.uid}/${Date.now()}_${depositSlip.name}`);
      await uploadBytes(storageRef, depositSlip);
      const slipUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'deposit',
        amount: parseFloat(depositAmount),
        status: 'pending',
        slipUrl,
        depositMethod,
        createdAt: serverTimestamp()
      });

      toast({ title: 'Success', description: 'Deposit request submitted for review.' });
      setDepositAmount('');
      setDepositSlip(null);
      if(depositFileRef.current) depositFileRef.current.value = "";

    } catch (error) {
      console.error("Error submitting deposit:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit deposit request.' });
    } finally {
      setSubmittingDeposit(false);
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !withdrawalAmount || Object.values(withdrawalDetails).some(v => v === '')) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill all fields.' });
      return;
    }
    const amount = parseFloat(withdrawalAmount);
    if(userData && userData.balance < amount) {
        toast({ variant: 'destructive', title: 'Error', description: 'Insufficient balance.' });
        return;
    }

    setSubmittingWithdrawal(true);
    try {
        const userRef = doc(db, 'users', user.uid);
        // Immediately deduct balance
        await updateDoc(userRef, {
            balance: increment(-amount)
        });

      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'withdrawal',
        amount: amount,
        status: 'pending',
        withdrawalMethod,
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
            balance: increment(amount)
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
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
        <p className="text-muted-foreground">Manage your funds and view your transaction history.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DollarSign /> Current Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">LKR {userData?.balance?.toFixed(2) || '0.00'}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ArrowUpCircle /> Deposit Funds</CardTitle>
            <CardDescription>Manually deposit funds. Your balance will be updated upon admin approval.</CardDescription>
          </CardHeader>
          <form onSubmit={handleDepositSubmit}>
            <CardContent className="space-y-4">
              <Tabs value={depositMethod} onValueChange={(v) => setDepositMethod(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="binance">Binance Pay</TabsTrigger>
                  <TabsTrigger value="bank">Bank Transfer</TabsTrigger>
                </TabsList>
                <TabsContent value="binance" className="mt-4 p-4 border rounded-md">
                    <p className="text-sm font-semibold">Binance Pay ID: <span className="font-mono text-primary">123456789</span></p>
                    <p className="text-xs text-muted-foreground mt-2">Send funds to the ID above and upload a screenshot of the confirmation.</p>
                </TabsContent>
                <TabsContent value="bank" className="mt-4 p-4 border rounded-md">
                    <p className="text-sm font-semibold">Bank: Commercial Bank</p>
                    <p className="text-sm font-semibold">Account: 100012345678</p>
                    <p className="text-sm font-semibold">Name: Nexbattle Pvt Ltd</p>
                    <p className="text-xs text-muted-foreground mt-2">Deposit funds to the account above and upload a screenshot of the confirmation slip.</p>
                </TabsContent>
              </Tabs>
              
              <div className="space-y-2">
                <Label htmlFor="deposit-amount">Amount (LKR)</Label>
                <Input id="deposit-amount" type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="e.g., 1000" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit-slip">Payment Slip Screenshot</Label>
                <Input id="deposit-slip" ref={depositFileRef} type="file" accept="image/*" onChange={e => setDepositSlip(e.target.files ? e.target.files[0] : null)} required />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={submittingDeposit}>{submittingDeposit ? "Submitting..." : "Submit Deposit"}</Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ArrowDownCircle /> Withdraw Funds</CardTitle>
            <CardDescription>Request a withdrawal. Funds will be transferred to your account by an admin.</CardDescription>
          </CardHeader>
          <form onSubmit={handleWithdrawalSubmit}>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="withdrawal-amount">Amount (LKR)</Label>
                    <Input id="withdrawal-amount" type="number" value={withdrawalAmount} onChange={e => setWithdrawalAmount(e.target.value)} placeholder="e.g., 500" required />
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
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
                                    {tx.type === 'deposit' ? <ArrowUpCircle className="w-5 h-5 text-green-500" /> : <ArrowDownCircle className="w-5 h-5 text-red-500" />}
                                    <span className="capitalize">{tx.type}</span>
                                </div>
                            </TableCell>
                            <TableCell>LKR {tx.amount.toFixed(2)}</TableCell>
                            <TableCell>{tx.createdAt ? format(new Date(tx.createdAt.seconds * 1000), 'PPp') : 'N/A'}</TableCell>
                            <TableCell>
                                <Badge variant={tx.status === 'approved' ? 'default' : tx.status === 'rejected' ? 'destructive' : 'secondary'} className="flex items-center gap-1.5 w-fit">
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
    </div>
  );
}
