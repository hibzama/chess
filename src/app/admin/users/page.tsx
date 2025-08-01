
'use client';
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { signInWithCustomToken } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, User, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UserData {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'user' | 'admin' | 'marketer';
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

    const handleRoleChange = async (uid: string, newRole: 'admin' | 'user') => {
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
    
    const handleLoginAsUser = async (uid: string) => {
        const originalAdminUid = auth.currentUser?.uid;
        if (!originalAdminUid) {
            toast({ variant: "destructive", title: 'Error', description: 'Could not identify current admin.' });
            return;
        }

        try {
            const response = await fetch('/api/create-custom-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid, adminUid: originalAdminUid }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get custom token.');
            }

            const { token } = await response.json();
            
            sessionStorage.setItem('originalAdminUid', originalAdminUid);
            
            await signInWithCustomToken(auth, token);
            toast({ title: "Success", description: `You are now logged in as the user.` });
            router.push('/dashboard');

        } catch (error: any) {
            console.error("Error logging in as user:", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to log in as user.' });
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
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.uid}>
                                <TableCell>{user.firstName} {user.lastName}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Badge variant={user.role === 'admin' ? 'default' : (user.role === 'marketer' ? 'secondary' : 'outline')} className="gap-1.5">
                                        {user.role === 'admin' ? <ShieldCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5"/> }
                                        <span className="capitalize">{user.role}</span>
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                     {/* <Button size="sm" variant="outline" onClick={() => handleLoginAsUser(user.uid)}>
                                        <LogIn className="mr-2 h-4 w-4"/> Login As
                                    </Button> */}
                                    {user.role !== 'admin' && (
                                        <Button size="sm" onClick={() => handleRoleChange(user.uid, 'admin')}>
                                            Make Admin
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
