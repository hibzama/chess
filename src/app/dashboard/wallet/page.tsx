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
import { DollarSign, ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle2, XCircle, Banknote, History, Copy, User, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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

const TelegramIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
)

export default function WalletPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState<'binance' | 'bank'>('binance');
  const [submittingDeposit, setSubmittingDeposit] = useState(false);
  
  const [isConfirmRemarkOpen, setIsConfirmRemarkOpen] = useState(false);
  const [isPostSubmitInfoOpen, setIsPostSubmitInfoOpen] = useState(false);

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
  

  const handleDepositSubmit = async () => {
    if (!user || !depositAmount) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a deposit amount.' });
      return;
    }
    setSubmittingDeposit(true);
    setIsConfirmRemarkOpen(false);

    try {
      const amountInLKR = parseFloat(depositAmount);

      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'deposit',
        amount: amountInLKR,
        status: 'pending',
        slipUrl: '', // No slip URL anymore
        depositMethod,
        createdAt: serverTimestamp()
      });

      toast({ title: 'Success', description: 'Deposit request submitted for review.' });
      setDepositAmount('');
      setIsPostSubmitInfoOpen(true);

    } catch (error) {
      console.error("Error submitting deposit:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit deposit request.' });
    } finally {
      setSubmittingDeposit(false);
    }
  };

  const handleInitiateDeposit = (e: React.FormEvent) => {
    e.preventDefault();
     if (!depositAmount) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please enter an amount.' });
        return;
    }
    setIsConfirmRemarkOpen(true);
  }

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
    <>
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
            {authLoading || !userData || typeof userData.balance === 'undefined' ? (
                <Skeleton className="h-10 w-48" /> 
            ) : (
                <div>
                    <p className="text-4xl font-bold">LKR {userData.balance.toFixed(2)}</p>
                    <p className="text-muted-foreground">~{(userData.balance / USDT_RATE).toFixed(2)} USDT</p>
                </div>
            )}
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
                <form onSubmit={handleInitiateDeposit}>
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
                        
                        <div className="p-3 bg-yellow-900/20 rounded-md text-sm text-yellow-300">
                            Equivalent in USDT: {usdtAmount} USDT
                        </div>

                        <Card className="p-4 bg-card/50 space-y-2">
                            <div className="flex items-center gap-2 font-semibold"><User/> Important: Use Your Username</div>
                            <p className="text-sm text-muted-foreground">Please use your username as the payment reference or remark. This helps us verify your deposit faster.</p>
                            <div className="flex items-center gap-2">
                                <Input readOnly value={username} />
                                <Button type="button" variant="ghost" size="icon" onClick={() => copyToClipboard(username, 'Username')}><Copy/></Button>
                            </div>
                        </Card>
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
                         <div className="p-3 bg-secondary rounded-md text-sm text-muted-foreground">
                            You will receive: {(parseFloat(withdrawalAmount) * USDT_RATE || 0).toFixed(2)} LKR
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
                                    <TableCell>
                                        <div className="font-medium">LKR {tx.amount.toFixed(2)}</div>
                                        <div className="text-xs text-muted-foreground">~{(tx.amount / USDT_RATE).toFixed(2)} USDT</div>
                                    </TableCell>
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

    <AlertDialog open={isConfirmRemarkOpen} onOpenChange={setIsConfirmRemarkOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deposit</AlertDialogTitle>
            <AlertDialogDescription>
                Have you added your username (<span className="font-bold text-primary">{username}</span>) as the payment remark/reference? This is crucial for us to verify your transaction.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>No, I'll add it</AlertDialogCancel>
            <AlertDialogAction onClick={handleDepositSubmit} disabled={submittingDeposit}>
                {submittingDeposit ? "Submitting..." : "Yes, I have"}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={isPostSubmitInfoOpen} onOpenChange={setIsPostSubmitInfoOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Deposit Submitted!</AlertDialogTitle>
            <AlertDialogDescription>
                For faster approval, or if you forgot to add your username as a remark, please send your payment slip/screenshot to our support team on WhatsApp or Telegram.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
                <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                    <a href="https://wa.me/94742974001" target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-2 h-4 w-4" /> Send to WhatsApp
                    </a>
                </Button>
                <Button asChild className="w-full bg-blue-500 hover:bg-blue-600">
                     <a href="https://t.me/nexbattle_help" target="_blank" rel="noopener noreferrer">
                        <TelegramIcon className="mr-2 h-4 w-4" /> Send to Telegram
                    </a>
                </Button>
                 <AlertDialogCancel className="m-0" onClick={() => setIsPostSubmitInfoOpen(false)}>Close</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
