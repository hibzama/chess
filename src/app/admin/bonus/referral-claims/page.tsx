'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, runTransaction, increment, serverTimestamp, writeBatch, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface BonusClaim {
    id: string;
    userId: string;
    userName?: string;
    amount: number;
    campaignTitle: string;
    type: 'referee' | 'referrer';
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
    refereeId?: string; // ID of the referee whose task completion is being reviewed
}

export default function ReferralClaimsPage() {
    const [claims, setClaims] = useState<BonusClaim[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const q = query(collection(db, 'bonus_claims'), where('status', '==', 'pending'));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const claimsDataPromises = snapshot.docs.map(async (claimDoc) => {
                const data = claimDoc.data() as BonusClaim;
                const userDoc = await getDoc(doc(db, 'users', data.userId));
                return { 
                    ...data, 
                    id: claimDoc.id, 
                    userName: userDoc.exists() ? `${userDoc.data().firstName} ${userDoc.data().lastName}` : 'Unknown User' 
                };
            });
            const claimsData = await Promise.all(claimsDataPromises);
            setClaims(claimsData.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds));
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleClaimAction = async (claim: BonusClaim, newStatus: 'approved' | 'rejected') => {
        const claimRef = doc(db, 'bonus_claims', claim.id);
        const userRef = doc(db, 'users', claim.userId);
        
        try {
            await runTransaction(db, async (transaction) => {
                const claimDoc = await transaction.get(claimRef);
                if (!claimDoc.exists() || claimDoc.data()?.status !== 'pending') {
                    throw new Error("This claim has already been processed.");
                }

                if (newStatus === 'approved') {
                    // 1. Approve the claim
                    transaction.update(claimRef, { status: 'approved' });
                    // 2. Add funds to user's balance
                    transaction.update(userRef, { balance: increment(claim.amount) });
                    // 3. Create a transaction log
                    const transactionRef = doc(collection(db, 'transactions'));
                    transaction.set(transactionRef, {
                        userId: claim.userId,
                        type: 'bonus',
                        amount: claim.amount,
                        status: 'completed',
                        description: `Referral Bonus: ${claim.campaignTitle}`,
                        createdAt: serverTimestamp(),
                    });
                } else { // Rejected
                    // 1. Reject the claim
                    transaction.update(claimRef, { status: 'rejected' });
                    // 2. If it's a referee task claim, invalidate the referral for the referrer
                    if (claim.type === 'referee' && claim.refereeId) {
                         const referrerCampaignRef = doc(db, 'users', claim.userId, 'active_campaigns', 'current');
                         transaction.update(referrerCampaignRef, {
                            referrals: admin.firestore.FieldValue.arrayRemove(claim.refereeId)
                         });
                    }
                }
            });

            toast({ title: "Success!", description: `Claim has been ${newStatus}.` });

        } catch (error: any) {
            console.error("Error processing claim: ", error);
            toast({ variant: 'destructive', title: "Error", description: error.message });
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Pending Referral Bonus Claims</CardTitle>
                <CardDescription>Review and approve or reject referral bonus claims.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p>Loading claims...</p>
                ) : claims.length === 0 ? (
                    <p>No pending claims found.</p>
                ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Amount (LKR)</TableHead>
                            <TableHead>Campaign</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {claims.map((claim) => (
                            <TableRow key={claim.id}>
                                <TableCell>
                                     <Link href={`/admin/users/${claim.userId}`} className="hover:underline text-primary">
                                        {claim.userName}
                                    </Link>
                                </TableCell>
                                <TableCell>{claim.amount.toFixed(2)}</TableCell>
                                <TableCell>{claim.campaignTitle}</TableCell>
                                <TableCell><Badge variant="secondary" className="capitalize">{claim.type}</Badge></TableCell>
                                <TableCell>{claim.createdAt ? format(new Date(claim.createdAt.seconds * 1000), 'PPp') : 'N/A'}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button size="sm" variant="outline" onClick={() => handleClaimAction(claim, 'approved')}>Approve</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleClaimAction(claim, 'rejected')}>Reject</Button>
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
```
  </change>
  <change>
    <file>/src/app/admin/layout.tsx</file>
    <content><![CDATA[
'use client'
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarInset, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Users, LogOut, Clock, History, DollarSign, ArrowUpCircle, ArrowDownCircle, Megaphone, Wallet, Swords, Fingerprint, ShieldAlert, Mail, Settings, Gift, PercentCircle, CalendarClock, Award, CheckSquare } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useEffect } from "react";


const Logo = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-8 h-8 text-primary"
    >
        <circle cx="12" cy="12" r="10" />
        <path d="m14.5 9.5-5 5" />
        <path d="m9.5 9.5 5 5" />
        <path d="M12 3v1" />
        <path d="M12 20v1" />
        <path d="m5 7 1-1" />
        <path d="m18 18 1-1" />
        <path d="m5 17 1 1" />
        <path d="m18 6-1 1" />
    </svg>
  );

export default function AdminLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { user, userData, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const isLoginPage = pathname === '/admin/login';

    useEffect(() => {
        if (!loading && !isLoginPage) {
            if (!user || (userData && userData.role !== 'admin')) {
                router.push('/admin/login');
            }
        }
    }, [user, userData, loading, router, isLoginPage, pathname]);


    const handleLogout = async () => {
        await logout();
        router.push('/admin/login');
    }
    
    if (isLoginPage) {
        return <>{children}</>;
    }

    if(loading || !user || (userData && userData.role !== 'admin')) {
        return (
            <div className="flex h-screen">
                <div className="w-64 bg-card p-4">
                    <Skeleton className="h-10 w-32 mb-8"/>
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                </div>
                <div className="flex-1 p-8">
                    <Skeleton className="h-full w-full" />
                </div>
            </div>
        )
    }

    const isActive = (path: string) => pathname.startsWith(path);

    return (
        <SidebarProvider>
            <Sidebar>
                <SidebarHeader>
                    <div className="flex items-center gap-2">
                        <Logo />
                        <h1 className="text-xl font-bold text-primary group-data-[collapsible=icon]:hidden">Admin Panel</h1>
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <Link href="/admin"><SidebarMenuButton tooltip="Dashboard" isActive={pathname === '/admin'}><LayoutGrid /><span>Dashboard</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <Link href="/admin/deposits/pending"><SidebarMenuButton tooltip="Pending Deposits" isActive={isActive('/admin/deposits/pending')}><Clock /><span>Pending Deposits</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <Link href="/admin/withdrawals/pending"><SidebarMenuButton tooltip="Pending Withdrawals" isActive={isActive('/admin/withdrawals/pending')}><Clock /><span>Pending Withdrawals</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                             <Link href="/admin/deposits/history"><SidebarMenuButton tooltip="Deposit History" isActive={isActive('/admin/deposits/history')}><ArrowUpCircle /><span>Deposit History</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                             <Link href="/admin/withdrawals/history"><SidebarMenuButton tooltip="Withdrawal History" isActive={isActive('/admin/withdrawals/history')}><ArrowDownCircle /><span>Withdrawal History</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                             <Link href="/admin/game-history"><SidebarMenuButton tooltip="Game History" isActive={isActive('/admin/game-history')}><Swords /><span>Game History</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                             <Link href="/admin/users"><SidebarMenuButton tooltip="Users" isActive={isActive('/admin/users')}><Users /><span>Users</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                             <Link href="/admin/duplicate-ips"><SidebarMenuButton tooltip="Duplicate IPs" isActive={isActive('/admin/duplicate-ips')}><Fingerprint /><span>Duplicate IPs</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                             <Link href="/admin/proxy-detection"><SidebarMenuButton tooltip="Proxy/VPN Users" isActive={isActive('/admin/proxy-detection')}><ShieldAlert /><span>Proxy/VPN Users</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                             <Link href="/admin/bonus"><SidebarMenuButton tooltip="Signup Bonus" isActive={pathname === '/admin/bonus'}><Gift /><span>Signup Bonus</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                             <Link href="/admin/bonus/deposit-bonus"><SidebarMenuButton tooltip="Deposit Bonus" isActive={isActive('/admin/bonus/deposit-bonus')}><PercentCircle /><span>Deposit Bonus</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                             <Link href="/admin/bonus/daily-bonus"><SidebarMenuButton tooltip="Daily Bonus" isActive={isActive('/admin/bonus/daily-bonus')}><CalendarClock /><span>Daily Bonus</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                             <Link href="/admin/bonus/referral-bonus"><SidebarMenuButton tooltip="Referral Bonus" isActive={isActive('/admin/bonus/referral-bonus')}><Users /><span>Referral Bonus</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                             <Link href="/admin/referral-campaigns"><SidebarMenuButton tooltip="Referral Campaigns" isActive={isActive('/admin/referral-campaigns')}><Award /><span>Referral Campaigns</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                             <Link href="/admin/bonus/referral-claims"><SidebarMenuButton tooltip="Referral Claims" isActive={isActive('/admin/bonus/referral-claims')}><CheckSquare /><span>Referral Claims</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                             <Link href="/admin/mailer"><SidebarMenuButton tooltip="Mailer" isActive={pathname === '/admin/mailer'}><Mail /><span>Mailer</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                             <Link href="/admin/mailer/settings"><SidebarMenuButton tooltip="Mailer Settings" isActive={isActive('/admin/mailer/settings')}><Settings /><span>Mailer Settings</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                             <Link href="/admin/marketing/applications"><SidebarMenuButton tooltip="Marketing Applications" isActive={isActive('/admin/marketing/applications')}><Megaphone /><span>Marketing Apps</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                             <Link href="/admin/marketing/withdrawals/pending"><SidebarMenuButton tooltip="Marketing Withdrawals" isActive={isActive('/admin/marketing/withdrawals/pending')}><Wallet /><span>Marketing Withdrawals</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                             <Link href="/admin/marketing/withdrawals/history"><SidebarMenuButton tooltip="Marketing Withdrawals History" isActive={isActive('/admin/marketing/withdrawals/history')}><History /><span>M. Withdraw History</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarContent>
                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Logout" onClick={handleLogout}><LogOut /><span>Logout</span></SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>
            <SidebarInset>
                <header className="px-4 lg:px-6 h-16 flex items-center border-b">
                    <SidebarTrigger className="md:hidden"/>
                    <div className="ml-auto flex items-center gap-4">
                        <Avatar>
                            <AvatarImage src="https://placehold.co/40x40.png" data-ai-hint="avatar" />
                            <AvatarFallback>AD</AvatarFallback>
                        </Avatar>
                    </div>
                </header>
                <main className="flex-1 p-4 md:p-8">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
  }

    
