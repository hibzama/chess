
'use client';
import { useState, useEffect } from 'react';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Loader2, User, UserCheck, DollarSign } from 'lucide-react';
import Link from 'next/link';

type Claim = {
    id: string;
    referrerId?: string;
    newUserId?: string;
    taskId: string;
    taskTitle: string;
    claimType: 'new_user_task' | 'referrer_target';
    commissionAmount?: number;
    bonusAmount?: number;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
    referrer?: { firstName: string, lastName: string };
    newUser?: { firstName: string, lastName: string, taskStatus?: any };
};

export default function ReferralClaimsPage() {
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const q = query(collection(db, 'bonus_claims'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const claimsDataPromises = snapshot.docs.map(async (claimDoc) => {
                const data = claimDoc.data() as Claim;
                data.id = claimDoc.id;

                if (data.referrerId) {
                    const referrerSnap = await getDoc(doc(db, 'users', data.referrerId));
                    if (referrerSnap.exists()) data.referrer = referrerSnap.data() as any;
                }
                if (data.newUserId) {
                    const newUserSnap = await getDoc(doc(db, 'users', data.newUserId));
                    if (newUserSnap.exists()) data.newUser = newUserSnap.data() as any;
                }
                return data;
            });
            const claimsData = await Promise.all(claimsDataPromises);
            setClaims(claimsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleClaimAction = async (claimId: string, newStatus: 'approved' | 'rejected') => {
        setActionLoading(claimId);
        try {
            const approveBonusClaim = httpsCallable(functions, 'approveBonusClaim');
            await approveBonusClaim({ claimId, newStatus });
            toast({ title: 'Success', description: `Claim has been ${newStatus}.` });
        } catch (error) {
            console.error('Failed to update claim status:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not process the claim.' });
        } finally {
            setActionLoading(null);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pending Referral Bonus Claims</CardTitle>
                <CardDescription>Review and approve bonuses for completed referral tasks.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? <Skeleton className="h-48 w-full" /> : (
                    <Accordion type="single" collapsible className="w-full">
                        {claims.length > 0 ? claims.map(claim => (
                            <AccordionItem key={claim.id} value={claim.id}>
                                <AccordionTrigger>
                                    <div className="flex items-center justify-between w-full pr-4">
                                        <div className="text-left">
                                            <p className="font-semibold">{claim.claimType === 'new_user_task' ? 'New User Bonus' : 'Referrer Target Bonus'}</p>
                                            <p className="text-sm text-muted-foreground">{claim.claimType === 'new_user_task' ? `For: ${claim.newUser?.firstName || 'N/A'}` : `For: ${claim.referrer?.firstName || 'N/A'}`}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <Badge variant="secondary" className="text-base">LKR {(claim.bonusAmount || claim.commissionAmount || 0).toFixed(2)}</Badge>
                                             <p className="text-xs text-muted-foreground">{format(claim.createdAt.toDate(), 'PP p')}</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="p-4 bg-muted/50 rounded-md space-y-4">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <Card>
                                                <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserCheck /> Referrer</CardTitle></CardHeader>
                                                <CardContent>
                                                    <p>{claim.referrer?.firstName} {claim.referrer?.lastName}</p>
                                                    <Button variant="link" size="sm" asChild className="p-0 h-auto"><Link href={`/admin/users/${claim.referrerId}`}>View Profile</Link></Button>
                                                </CardContent>
                                            </Card>
                                             <Card>
                                                <CardHeader><CardTitle className="text-base flex items-center gap-2"><User /> New User</CardTitle></CardHeader>
                                                <CardContent>
                                                    <p>{claim.newUser?.firstName} {claim.newUser?.lastName}</p>
                                                    {claim.newUserId ? (
                                                         <Button variant="link" size="sm" asChild className="p-0 h-auto"><Link href={`/admin/users/${claim.newUserId}`}>View Profile</Link></Button>
                                                    ) : <p className="text-xs text-muted-foreground">N/A</p>}
                                                </CardContent>
                                            </Card>
                                        </div>
                                        
                                        {claim.claimType === 'new_user_task' && claim.newUser?.taskStatus?.[claim.taskId] && (
                                            <div>
                                                <h4 className="font-semibold mb-2">Completed Task Details</h4>
                                                <div className="space-y-2 text-sm p-3 border rounded-md bg-background">
                                                    {Object.entries(claim.newUser.taskStatus[claim.taskId]).map(([key, value]: [string, any]) => (
                                                         <p key={key}><strong>{value.label || key}:</strong> {value.value || 'N/A'}</p>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="flex justify-end gap-2 pt-4">
                                            <Button variant="destructive" size="sm" onClick={() => handleClaimAction(claim.id, 'rejected')} disabled={actionLoading === claim.id}>
                                                {actionLoading === claim.id ? <Loader2 className="animate-spin"/> : <><X className="mr-2"/> Reject</>}
                                            </Button>
                                             <Button variant="default" size="sm" onClick={() => handleClaimAction(claim.id, 'approved')} disabled={actionLoading === claim.id}>
                                                {actionLoading === claim.id ? <Loader2 className="animate-spin"/> : <><Check className="mr-2"/> Approve</>}
                                            </Button>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )) : <p className="text-sm text-center text-muted-foreground p-8">No pending claims found.</p>}
                    </Accordion>
                )}
            </CardContent>
        </Card>
    );
}

