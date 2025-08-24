
'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, updateDoc, increment, getDoc, writeBatch, Timestamp, orderBy, limit, getDocs, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle2, XCircle, Banknote, History, Copy, User, MessageCircle, Swords, Trophy, Info, AlertTriangle, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DepositBonusCampaign } from '@/app/admin/bonus/deposit-bonus/page';


type Transaction = {
    id: string;
    type: 'deposit' | 'withdrawal' | 'wager' | 'payout' | 'commission' | 'commission_transfer' | 'bonus';
    amount: number;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    createdAt: any;
    slipUrl?: string;
    withdrawalDetails?: any;
    description?: string;
    level?: number;
};

interface SignupBonusCampaign {
    id: string;
    title: string;
    bonusAmount: number;
    userLimit: number;
    claimsCount?: number;
    isActive: boolean;
}

const TelegramIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
)

const SignupBonusClaimCard = () => {
    const { user, currencyConfig } = useAuth();
    const { toast } = useToast();
    const [campaign, setCampaign] = useState<SignupBonusCampaign | null>(null);
    const [hasClaimed, setHasClaimed] = useState(true);
    const [isClaiming, setIsClaiming] = useState(false);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const checkEligibility = async () => {
            setLoading(true);
            const campaignsRef = collection(db, 'signup_bonus_campaigns');
            const q = query(campaignsRef, where("isActive", "==", true), limit(1));
            const campaignSnapshot = await getDocs(q);

            if (campaignSnapshot.empty) {
                setLoading(false);
                return;
            }

            const campaignData = { id: campaignSnapshot.docs[0].id, ...campaignSnapshot.docs[0].data() } as SignupBonusCampaign;
            
            const claimsQuery = query(collection(db, "bonus_claims"), where("userId", "==", user.uid), where("campaignId", "==", campaignData.id));
            const userClaimSnapshot = await getDocs(claimsQuery);

            if (userClaimSnapshot.empty) {
                setCampaign(campaignData);
                setHasClaimed(false);
            } else {
                setHasClaimed(true);
            }
            setLoading(false);
        };

        checkEligibility();
    }, [user]);

    const handleClaim = async () => {
        if (!user || !campaign) return;
        setIsClaiming(true);
        try {
            const claimRef = doc(collection(db, 'bonus_claims'));
            await setDoc(claimRef, {
                userId: user.uid,
                type: 'signup',
                amount: campaign.bonusAmount,
                status: 'pending',
                campaignId: campaign.id,
                campaignTitle: `Signup Bonus: ${campaign.title}`,
                createdAt: serverTimestamp()
            });

            toast({ title: 'Bonus Claimed!', description: `Your bonus is pending admin approval.` });
            setHasClaimed(true); // Hide card after claiming
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not claim bonus.' });
        } finally {
            setIsClaiming(false);
        }
    };

    if (loading || hasClaimed || !campaign) {
        return null;
    }

    return (
        <Card className="bg-primary/10 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Gift /> {campaign?.title}</CardTitle>
                <CardDescription>A special welcome bonus is available for you!</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Claim your <span className="font-bold text-primary">{currencyConfig.symbol} {campaign.bonusAmount.toFixed(2)}</span> bonus now. It will be added to your wallet after admin approval.</p>
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={handleClaim} disabled={isClaiming}>
                    {isClaiming ? 'Claiming...' : 'Claim Welcome Bonus'}
                </Button>
            </CardFooter>
        </Card>
    );
};

const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
        case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
        case 'approved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
        case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
        case 'completed': return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
    }
};

const getTransactionIcon = (type: Transaction['type']) => {
    switch(type) {
        case 'deposit': return <ArrowUpCircle className="w-5 h-5 text-green-500" />;
        case 'withdrawal': return <ArrowDownCircle className="w-5 h-5 text-red-500" />;
        case 'wager': return <Swords className="w-5 h-5 text-orange-500" />;
        case 'payout': return <Trophy className="w-5 h-5 text-yellow-500" />;
        case 'commission_transfer': return <DollarSign className="w-5 h-5 text-blue-500" />;
        case 'bonus': return <Gift className="w-5 h-5 text-pink-500" />;
        default: return <DollarSign className="w-5 h-5 text-gray-500" />;
    }
}

const TransactionItem = ({ tx, currencyConfig, paymentConfig }: { tx: Transaction, currencyConfig: CurrencyConfig, paymentConfig: any }) => {
    return (
        <Card key={tx.id} className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                <div className="flex items-center gap-2">
                    {getTransactionIcon(tx.type)}
                    <div>
                        <span className="capitalize font-medium">{tx.description || tx.type.replace('_', ' ')}</span>
                    </div>
                </div>
                <div>
                    <div className="font-medium">{currencyConfig.symbol} {tx.amount.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">~{(tx.amount / currencyConfig.usdtRate).toFixed(2)} USDT</div>
                </div>
                <div className="text-muted-foreground text-sm">{tx.createdAt ? format(new Date(tx.createdAt.seconds * 1000), 'PPp') : 'N/A'}</div>
                <div>
                    <Badge variant={tx.status === 'approved' || tx.status === 'completed' ? 'default' : tx.status === 'rejected' ? 'destructive' : 'secondary'} className="flex items-center gap-1.5 w-fit">
                        {getStatusIcon(tx.status)}
                        <span className="capitalize">{tx.status}</span>
                    </Badge>
                </div>
            </div>
            {(tx.type === 'deposit' || tx.type === 'bonus') && tx.status === 'pending' && (
                <div className="mt-4 p-3 rounded-md bg-secondary space-y-3">
                    <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-primary" />
                        <p className="text-sm font-semibold">For faster approval, send a screenshot to support.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" asChild className="w-full bg-green-600 hover:bg-green-700">
                            <a href={`https://wa.me/${paymentConfig.supportWhatsapp}`} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                            </a>
                        </Button>
                        <Button size="sm" asChild className="w-full bg-blue-500 hover:bg-blue-600">
                            <a href={`https://t.me/${paymentConfig.supportTelegram}`} target="_blank" rel="noopener noreferrer">
                                <TelegramIcon className="mr-2 h-4 w-4" /> Telegram
                            </a>
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    )
}

export default function WalletPage() {
  const { user, userData, loading: authLoading, currencyConfig, paymentConfig } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState<'binance' | 'bank'>('binance');
  const [submittingDeposit, setSubmittingDeposit] = useState(false);
  
  const [isConfirmRemarkOpen, setIsConfirmRemarkOpen] = useState(false);
  const [isPostSubmitInfoOpen, setIsPostSubmitInfoOpen] = useState(false);

  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalMethod, setWithdrawalMethod] = useState<'bank' | 'binance'>('bank');
  const [withdrawalDetails, setWithdrawalDetails] = useState({ bankName: paymentConfig.bankName || '', branch: '', accountNumber: '', accountName: '' });
  const [binancePayId, setBinancePayId] = useState('');
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  
  const [depositBonus, setDepositBonus] = useState<DepositBonusCampaign | null>(null);
  
  const usdtAmount = (parseFloat(depositAmount) / currencyConfig.usdtRate || 0).toFixed(2);
  
  const withdrawalFeePercentage = paymentConfig.withdrawalFeePercentage || 5;
  const withdrawalFee = useMemo(() => {
      const amount = parseFloat(withdrawalAmount);
      if (isNaN(amount) || amount <= 0) return 0;
      return amount * (withdrawalFeePercentage / 100);
  }, [withdrawalAmount, withdrawalFeePercentage]);

  const finalWithdrawalAmount = useMemo(() => {
      const amount = parseFloat(withdrawalAmount);
      if (isNaN(amount) || amount <= 0) return 0;
      return amount - withdrawalFee;
  }, [withdrawalAmount, withdrawalFee]);

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    }
    
    const q = query(
        collection(db, 'transactions'), 
        where('userId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userTransactions = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Transaction))
        .filter(tx => tx.type !== 'commission')
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setTransactions(userTransactions.slice(0, 50));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching transactions:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch transaction history.' });
      setLoading(false);
    });

    const bonusQuery = query(collection(db, 'deposit_bonus_campaigns'), where('isActive', '==', true));
    const unsubscribeBonus = onSnapshot(bonusQuery, (snapshot) => {
        if (!snapshot.empty) {
            const now = new Date();
            const activeCampaigns = snapshot.docs.map(d => d.data() as DepositBonusCampaign);
            const stillValidCampaign = activeCampaigns.find(c => c.expiresAt && c.expiresAt.toDate() > now);
            setDepositBonus(stillValidCampaign || null);
        } else {
            setDepositBonus(null);
        }
    });

    return () => {
        unsubscribe();
        unsubscribeBonus();
    };
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
            description: `${depositMethod === 'binance' ? 'Binance' : 'Bank'} Deposit`,
            depositMethod,
            createdAt: serverTimestamp()
        });
      
        toast({ title: 'Success', description: 'Deposit request submitted for review.' });
        setDepositAmount('');
        setIsPostSubmitInfoOpen(true);

    } catch (error) {
        console.error("Error submitting deposit:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit deposit request. Please try again.' });
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
    if (parseFloat(depositAmount) < 100) {
        toast({ variant: 'destructive', title: 'Error', description: `Minimum deposit amount is ${currencyConfig.symbol} 100.` });
        return;
    }
    setIsConfirmRemarkOpen(true);
  }

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !userData || !withdrawalAmount) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill all required fields.' });
      return;
    }

    if (withdrawalMethod === 'bank' && (withdrawalDetails.branch === '' || withdrawalDetails.accountNumber === '' || withdrawalDetails.accountName === '')) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill all bank details.' });
      return;
    }
    
    if (withdrawalMethod === 'binance' && !binancePayId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please enter your Binance PayID.' });
        return;
    }

    const requestedAmount = parseFloat(withdrawalAmount);

    if (requestedAmount < 500) {
        toast({ variant: 'destructive', title: 'Error', description: `Minimum withdrawal amount is ${currencyConfig.symbol} 500.` });
        return;
    }

    if(userData && userData.balance < requestedAmount) {
        toast({ variant: 'destructive', title: 'Error', description: 'Insufficient balance.' });
        return;
    }

    setSubmittingWithdrawal(true);
    try {
        const userRef = doc(db, 'users', user.uid);
        // Immediately deduct balance for the full requested amount
        await updateDoc(userRef, {
            balance: increment(-requestedAmount)
        });

      // The amount in the transaction is the amount the user will receive after the fee.
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'withdrawal',
        amount: finalWithdrawalAmount,
        status: 'pending',
        withdrawalMethod,
        withdrawalDetails: withdrawalMethod === 'bank' ? withdrawalDetails : { binancePayId },
        createdAt: serverTimestamp()
      });

      toast({ title: 'Success', description: 'Withdrawal request submitted.' });
      setWithdrawalAmount('');
      setBinancePayId('');
      if (withdrawalMethod === 'bank') {
        setWithdrawalDetails({ bankName: paymentConfig.bankName || '', branch: '', accountNumber: '', accountName: '' });
      }

    } catch (error: any) {
        console.error("Error submitting withdrawal:", error);
        toast({ variant: 'destructive', title: 'Error', description: `Failed to submit withdrawal request: ${error.message}` });
        
        // Revert balance deduction if firestore update fails
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
            balance: increment(requestedAmount)
        });

    } finally {
      setSubmittingWithdrawal(false);
    }
  };
  
  const username = userData ? `${userData.firstName}${userData.lastName}`.toLowerCase() : '...';

  const copyToClipboard = (text: string, name: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: `${name} copied to clipboard.`});
  }


  return (
    <>
    <div className="space-y-8">
       <div>
        <h1 className="text-4xl font-bold tracking-tight text-center">Your Wallet</h1>
        <p className="text-muted-foreground text-center">Manage your funds for the games ahead.</p>
      </div>

      <SignupBonusClaimCard />

      <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2"><DollarSign /> Main Balance</CardTitle>
        <CardDescription>All your funds in one place. Deposit, withdraw, and play.</CardDescription>
        </CardHeader>
        <CardContent>
            {authLoading || !userData || typeof userData.balance === 'undefined' ? (
                <div className="space-y-2">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
            ) : (
                <div>
                    <p className="text-4xl font-bold">{currencyConfig.symbol} {userData.balance.toFixed(2)}</p>
                    <p className="text-muted-foreground">~{(userData.balance / currencyConfig.usdtRate).toFixed(2)} USDT</p>
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
                        {depositBonus && (
                            <Alert className="border-green-500/50 bg-green-500/10 text-green-400">
                                <Gift className="h-4 w-4 !text-green-400" />
                                <AlertTitle className="text-green-400">{depositBonus.title || "Deposit Bonus"}</AlertTitle>
                                <AlertDescription>
                                    Active Bonus: Get a {depositBonus.percentage}% bonus on deposits from {currencyConfig.symbol} {depositBonus.minDeposit} to {currencyConfig.symbol} {depositBonus.maxDeposit}!
                                </AlertDescription>
                            </Alert>
                        )}
                        <Tabs value={depositMethod} onValueChange={(v) => setDepositMethod(v as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                               {paymentConfig.binancePayEnabled && <TabsTrigger value="binance">Binance Pay</TabsTrigger>}
                               {paymentConfig.bankDepositEnabled && <TabsTrigger value="bank">Bank Deposit</TabsTrigger>}
                            </TabsList>
                        </Tabs>

                        {depositMethod === 'binance' && paymentConfig.binancePayEnabled && (
                             <Card className="p-4 bg-card/50 space-y-4">
                                <div>
                                    <Label>Binance PayID</Label>
                                    <div className="flex items-center gap-2">
                                        <Input readOnly value={paymentConfig.binancePayId} />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => copyToClipboard(paymentConfig.binancePayId, 'PayID')}><Copy/></Button>
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="deposit-amount">Amount ({currencyConfig.symbol})</Label>
                                    <Input id="deposit-amount" type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="e.g., 3100" required />
                                    <p className="text-xs text-muted-foreground pt-1">Minimum deposit amount: {currencyConfig.symbol} 100</p>
                                </div>
                                <div>
                                    <Label>Amount (USDT)</Label>
                                     <div className="flex items-center gap-2">
                                        <Input readOnly value={usdtAmount} />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => copyToClipboard(usdtAmount, 'USDT Amount')}><Copy/></Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground pt-1">Please send this exact USDT amount.</p>
                                </div>
                             </Card>
                        )}
                        {depositMethod === 'bank' && paymentConfig.bankDepositEnabled && (
                             <Card className="p-4 bg-card/50 space-y-4">
                                <p className="text-sm font-semibold">Bank: {paymentConfig.bankName}</p>
                                <p className="text-sm font-semibold">Branch: {paymentConfig.bankBranch}</p>
                                <p className="text-sm font-semibold">Name: {paymentConfig.bankAccountName}</p>
                                <p className="text-sm font-semibold">Account: {paymentConfig.bankAccountNumber}</p>
                                <div className="space-y-2">
                                    <Label htmlFor="deposit-amount-bank">Amount ({currencyConfig.symbol})</Label>
                                    <Input id="deposit-amount-bank" type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="e.g., 3100" required />
                                    <p className="text-xs text-muted-foreground pt-1">Minimum deposit amount: {currencyConfig.symbol} 100</p>
                                </div>
                             </Card>
                        )}
                        
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
                        <Tabs value={withdrawalMethod} onValueChange={(v) => setWithdrawalMethod(v as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="bank">Bank Transfer</TabsTrigger>
                                <TabsTrigger value="binance">Binance Pay</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="space-y-2">
                            <Label htmlFor="withdrawal-amount">Amount to Withdraw ({currencyConfig.symbol})</Label>
                            <Input id="withdrawal-amount" type="number" value={withdrawalAmount} onChange={e => setWithdrawalAmount(e.target.value)} placeholder="e.g., 1550" required />
                             <p className="text-xs text-muted-foreground pt-1">Minimum withdrawal amount: {currencyConfig.symbol} 500</p>
                        </div>
                         
                        <Alert variant="destructive">
                             <Info className="h-4 w-4" />
                            <AlertTitle>Withdrawal Fee</AlertTitle>
                            <AlertDescription>
                                A {withdrawalFeePercentage}% fee is applied to all withdrawals.
                            </AlertDescription>
                        </Alert>
                         
                        <div className="p-3 bg-secondary rounded-md text-sm text-muted-foreground space-y-2">
                            <div className="flex justify-between">
                                <span>Fee ({withdrawalFeePercentage}%):</span>
                                <span className="font-medium text-foreground">- {currencyConfig.symbol} {withdrawalFee.toFixed(2)}</span>
                            </div>
                            <Separator/>
                             <div className="flex justify-between font-bold">
                                <span>You will receive:</span>
                                <div className="text-right">
                                    <p className="text-foreground">{currencyConfig.symbol} {finalWithdrawalAmount.toFixed(2)}</p>
                                    {withdrawalMethod === 'binance' && <p className="text-xs font-normal text-muted-foreground">~{(finalWithdrawalAmount / currencyConfig.usdtRate).toFixed(2)} USDT</p>}
                                </div>
                            </div>
                        </div>

                        {withdrawalMethod === 'bank' && (
                        <>
                            <Separator />
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>Bank Withdrawals</AlertTitle>
                                <AlertDescription>
                                    Please note that bank withdrawals are only processed for <strong>{paymentConfig.bankName}</strong> accounts at this time.
                                </AlertDescription>
                            </Alert>
                            <div className="space-y-2">
                                <Label htmlFor="bank-name">Bank Name</Label>
                                <Input id="bank-name" value={withdrawalDetails.bankName} onChange={e => setWithdrawalDetails({...withdrawalDetails, bankName: e.target.value})} required={withdrawalMethod === 'bank'} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="branch">Branch</Label>
                                <Input id="branch" value={withdrawalDetails.branch} onChange={e => setWithdrawalDetails({...withdrawalDetails, branch: e.target.value})} required={withdrawalMethod === 'bank'} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="account-number">Account Number</Label>
                                <Input id="account-number" value={withdrawalDetails.accountNumber} onChange={e => setWithdrawalDetails({...withdrawalDetails, accountNumber: e.target.value})} required={withdrawalMethod === 'bank'} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="account-name">Account Holder Name</Label>
                                <Input id="account-name" value={withdrawalDetails.accountName} onChange={e => setWithdrawalDetails({...withdrawalDetails, accountName: e.target.value})} required={withdrawalMethod === 'bank'} />
                            </div>
                        </>
                        )}
                        {withdrawalMethod === 'binance' && (
                             <Card className="p-4 bg-card/50 space-y-2">
                                <Label htmlFor="binance-pay-id">Your Binance PayID</Label>
                                <Input 
                                    id="binance-pay-id"
                                    value={binancePayId} 
                                    onChange={(e) => setBinancePayId(e.target.value)}
                                    placeholder='Enter your Binance PayID'
                                    required={withdrawalMethod === 'binance'}
                                />
                             </Card>
                        )}
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
                        <div className="space-y-4">
                            {loading ? (
                                <p className="text-center">Loading history...</p>
                            ) : transactions.length > 0 ? (
                                transactions.map(tx => (
                                    <TransactionItem key={tx.id} tx={tx} currencyConfig={currencyConfig} paymentConfig={paymentConfig}/>
                                ))
                            ) : (
                                <p className="text-center h-24 flex items-center justify-center text-muted-foreground">No transactions yet.</p>
                            )}
                        </div>
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
                Have you added your username ( <span className="font-bold text-primary">{username}</span>) as the payment remark/reference? This is crucial for us to verify your transaction.
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
                    <a href={`https://wa.me/${paymentConfig.supportWhatsapp}`} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-2 h-4 w-4" /> Send to WhatsApp
                    </a>
                </Button>
                <Button asChild className="w-full bg-blue-500 hover:bg-blue-600">
                     <a href={`https://t.me/${paymentConfig.supportTelegram}`} target="_blank" rel="noopener noreferrer">
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
