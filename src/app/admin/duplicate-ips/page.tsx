
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Fingerprint, User } from 'lucide-react';
import Link from 'next/link';

interface UserData {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    ipAddress?: string;
}

interface DuplicateIPs {
    [ip: string]: UserData[];
}

export default function DuplicateIPsPage() {
    const [duplicateIPs, setDuplicateIPs] = useState<DuplicateIPs>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsersAndGroup = async () => {
            setLoading(true);
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const usersData = usersSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserData));

            const ips: { [ip: string]: UserData[] } = {};
            usersData.forEach(user => {
                if (user.ipAddress && user.ipAddress !== 'unknown') {
                    if (!ips[user.ipAddress]) {
                        ips[user.ipAddress] = [];
                    }
                    ips[user.ipAddress].push(user);
                }
            });

            const duplicates = Object.keys(ips).reduce((acc, ip) => {
                if (ips[ip].length > 1) {
                    acc[ip] = ips[ip];
                }
                return acc;
            }, {} as DuplicateIPs);
            
            setDuplicateIPs(duplicates);
            setLoading(false);
        };

        fetchUsersAndGroup();
    }, []);

    const duplicateEntries = Object.entries(duplicateIPs);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Fingerprint /> Duplicate IP Addresses</CardTitle>
                <CardDescription>Review accounts that have been created from the same IP address. This may indicate multiple accounts by a single user.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : duplicateEntries.length === 0 ? (
                    <Alert>
                        <Fingerprint className="h-4 w-4" />
                        <AlertTitle>No Duplicates Found</AlertTitle>
                        <AlertDescription>
                            Currently, there are no users sharing the same IP address.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <Accordion type="single" collapsible className="w-full">
                        {duplicateEntries.map(([ip, users]) => (
                            <AccordionItem key={ip} value={ip}>
                                <AccordionTrigger>
                                    <div className="flex items-center justify-between w-full pr-4">
                                        <div className="text-left">
                                            <p className="font-mono">{ip}</p>
                                            <p className="text-sm font-normal text-muted-foreground">{users.length} accounts associated</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <ul className="space-y-2 p-4 bg-muted/50 rounded-md">
                                        {users.map(user => (
                                            <li key={user.uid} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-muted-foreground"/>
                                                    <div>
                                                        <p className="font-semibold">{user.firstName} {user.lastName}</p>
                                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                                    </div>
                                                </div>
                                                <Link href={`/admin/users/${user.uid}`} className="text-primary text-sm hover:underline">
                                                    View User
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </CardContent>
        </Card>
    );
}
