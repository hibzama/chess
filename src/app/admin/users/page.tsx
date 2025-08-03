
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, User, CheckCircle, Wallet, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UserData {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'user' | 'admin' | 'marketer';
    emailVerified?: boolean;
    balance?: number;
}

export default function UsersPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserData));
            setUsers(usersData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleRoleChange = async (e: React.MouseEvent, uid: string, newRole: 'admin' | 'user') => {
        e.stopPropagation(); 
        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, { role: newRole });
            toast({
                title: 'Success!',
                description: 'User role has been updated.',
            });
        } catch (error) {
            console.error("Error updating user role:", error);
            toast({
                variant: "destructive",
                title: 'Error',
                description: 'Failed to update user role.',
            });
        }
    };
    
    const handleVerificationChange = async (e: React.MouseEvent, uid: string, shouldVerify: boolean) => {
        e.stopPropagation();
        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, { emailVerified: shouldVerify });
            toast({
                title: 'Success!',
                description: `User verification status has been updated.`,
            });
        } catch (error) {
             console.error("Error changing verification status:", error);
            toast({
                variant: "destructive",
                title: 'Error',
                description: 'Failed to change verification status.',
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                     <p>Loading users...</p>
                ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Balance</TableHead>
                             <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.uid} onClick={() => router.push(`/admin/users/${user.uid}`)} className="cursor-pointer">
                                <TableCell>{user.firstName} {user.lastName}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Badge variant={user.role === 'admin' ? 'default' : (user.role === 'marketer' ? 'secondary' : 'outline')} className="gap-1.5">
                                        {user.role === 'admin' ? <ShieldCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5"/> }
                                        <span className="capitalize">{user.role}</span>
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Wallet className="w-4 h-4 text-muted-foreground"/>
                                        <span>LKR {(user.balance || 0).toFixed(2)}</span>
                                    </div>
                                </TableCell>
                                 <TableCell>
                                    {user.emailVerified ? (
                                        <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-none">Verified</Badge>
                                    ) : (
                                        <Badge variant="destructive">Not Verified</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                     {user.emailVerified ? (
                                        <Button size="sm" variant="destructive" onClick={(e) => handleVerificationChange(e, user.uid, false)}>
                                            <ShieldAlert className="w-4 h-4 mr-2"/> Force Verify
                                        </Button>
                                    ) : (
                                        <Button size="sm" variant="outline" onClick={(e) => handleVerificationChange(e, user.uid, true)}>
                                            <CheckCircle className="w-4 h-4 mr-2"/> Allow Login
                                        </Button>
                                    )}
                                    {user.role !== 'admin' && (
                                        <Button size="sm" onClick={(e) => handleRoleChange(e, user.uid, 'admin')}>
                                            Make Admin
                                        </Button>
                                    )}
                                     {user.role === 'admin' && (
                                        <Button size="sm" variant="destructive" onClick={(e) => handleRoleChange(e, user.uid, 'user')}>
                                            Remove Admin
                                        </Button>
                                    )}
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
