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
import { DollarSign, ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle2, XCircle, Banknote, History, Copy, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

type Transaction = {
    id: string;
    type: 'deposit' | 'withdrawal';
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
    slipUrl?: string;
    withdrawalDetails?: any;
};

const USDT_RATE = 310;

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
  
  const usdtAmount = (parseFloat(depositAmount) / USDT_RATE || 0).toFixed(2);
  
  const copyToClipboard = (text: string, name: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: `${name} copied to clipboard.`});
  }

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

      const amountInLKR = parseFloat(depositAmount);

      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'deposit',
        amount: amountInLKR,
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
    const amountInUSDT = parseFloat(withdrawalAmount);
    const amountInLKR = amountInUSDT * USDT_RATE;

    if(userData && userData.balance < amountInLKR) {
        toast({ variant: 'destructive', title: 'Error', description: 'Insufficient balance.' });
        return;
    }

    setSubmittingWithdrawal(true);
    try {
        const userRef = doc(db, 'users', user.uid);
        // Immediately deduct balance
        await updateDoc(userRef, {
            balance: increment(-amountInLKR)
        });

      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'withdrawal',
        amount: amountInLKR,
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
            balance: increment(amountInLKR)
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
  
  const username = userData ? `${userData.firstName}${userData.lastName}`.toLowerCase() : '...';


  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-4xl font-bold tracking-tight text-center">Your Wallet</h1>
        <p className="text-muted-foreground text-center">Manage your funds for the games ahead.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DollarSign /> Current Balance</CardTitle>
        </CardHeader>
        <CardContent>
            {loading ? <Skeleton className="h-10 w-48" /> : <p className="text-4xl font-bold">{userData ? (userData.balance / USDT_RATE).toFixed(2) : '0.00'} USDT</p>}
        </CardContent>
      </Card>

      <Tabs defaultValue="deposit" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="deposit"><ArrowUpCircle /> Deposit</TabsTrigger>
          <TabsTrigger value="withdraw"><ArrowDownCircle /> Withdraw</TabsTrigger>
          <TabsTrigger value="history"><History /> History</TabsTrigger>
        </TabsList>
        <TabsContent value="deposit">
            <Card>
                <CardHeader>
                    <CardTitle>Manual Deposit</CardTitle>
                    <CardDescription>Your deposit will be marked as pending until approved by an admin.</CardDescription>
                </CardHeader>
                <form onSubmit={handleDepositSubmit}>
                    <CardContent className="space-y-6">
                        <Tabs value={depositMethod} onValueChange={(v) => setDepositMethod(v as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="binance">Binance Pay</TabsTrigger>
                            <TabsTrigger value="bank">Bank Deposit</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {depositMethod === 'binance' && (
                             <Card className="p-4 bg-card/50 space-y-4">
                                <div>
                                    <Label>Binance PayID</Label>
                                    <div className="flex items-center gap-2">
                                        <Input readOnly value="123456789" />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => copyToClipboard('123456789', 'PayID')}><Copy/></Button>
                                    </div>
                                </div>
                             </Card>
                        )}
                        {depositMethod === 'bank' && (
                             <Card className="p-4 bg-card/50 space-y-4">
                                <p className="text-sm font-semibold">Bank: Commercial Bank</p>
                                <p className="text-sm font-semibold">Account: 100012345678</p>
                                <p className="text-sm font-semibold">Name: Nexbattle Pvt Ltd</p>
                             </Card>
                        )}
                        
                        <div className="space-y-2">
                            <Label htmlFor="deposit-amount">Amount (LKR)</Label>
                            <Input id="deposit-amount" type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="e.g., 3100" required />
                        </div>
                        
                        <div className="p-3 bg-secondary rounded-md text-sm text-muted-foreground">
                            Please send {usdtAmount} USDT to the PayID above.
                        </div>

                        <Card className="p-4 bg-card/50 space-y-2">
                            <div className="flex items-center gap-2 font-semibold"><User/> Important: Use Your Username</div>
                            <p className="text-sm text-muted-foreground">Please use your username as the payment reference or remark. This helps us verify your deposit faster.</p>
                            <div className="flex items-center gap-2">
                                <Input readOnly value={username} />
                                <Button type="button" variant="ghost" size="icon" onClick={() => copyToClipboard(username, 'Username')}><Copy/></Button>
                            </div>
                        </Card>

                        <div className="space-y-2">
                            <Label htmlFor="deposit-slip">Payment Screenshot / Slip</Label>
                            <Input id="deposit-slip" ref={depositFileRef} type="file" accept="image/*" onChange={e => setDepositSlip(e.target.files ? e.target.files[0] : null)} required />
                        </div>
                    </CardContent>
                    <CardFooter>
                    <Button type="submit" className="w-full" disabled={submittingDeposit}>{submittingDeposit ? "Submitting..." : "Submit Deposit"}</Button>
                    </CardFooter>
                </form>
            </Card>
        </TabsContent>
        <TabsContent value="withdraw">
             <Card>
                <CardHeader>
                    <CardTitle>Withdraw Funds</CardTitle>
                    <CardDescription>Request a withdrawal. Funds will be transferred to your account by an admin.</CardDescription>
                </CardHeader>
                <form onSubmit={handleWithdrawalSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="withdrawal-amount">Amount (USDT)</Label>
                            <Input id="withdrawal-amount" type="number" value={withdrawalAmount} onChange={e => setWithdrawalAmount(e.target.value)} placeholder="e.g., 5" required />
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
                <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[400px]">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount (USDT)</TableHead>
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
                                    <TableCell>{(tx.amount / USDT_RATE).toFixed(2)}</TableCell>
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
        </TabsContent>
      </Tabs>

    </div>
  );
}

    