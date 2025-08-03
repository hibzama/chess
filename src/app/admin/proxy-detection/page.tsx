
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert, User, Fingerprint } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface UserData {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    ipAddress?: string;
}

interface SuspiciousIPs {
    [ip: string]: UserData[];
}

const VPN_THRESHOLD = 5; // IPs with this many users or more will be flagged

export default function ProxyDetectionPage() {
    const [suspiciousIPs, setSuspiciousIPs] = useState<SuspiciousIPs>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsersAndFlag = async () => {
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

            const suspicious = Object.keys(ips).reduce((acc, ip) => {
                if (ips[ip].length >= VPN_THRESHOLD) {
                    acc[ip] = ips[ip];
                }
                return acc;
            }, {} as SuspiciousIPs);
            
            setSuspiciousIPs(suspicious);
            setLoading(false);
        };

        fetchUsersAndFlag();
    }, []);

    const suspiciousEntries = Object.entries(suspiciousIPs);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldAlert /> Proxy/VPN User Detection</CardTitle>
                <CardDescription>
                    Review accounts from IP addresses that are shared by an unusually high number of users ({VPN_THRESHOLD}+). This is a strong indicator of VPN or proxy usage.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : suspiciousEntries.length === 0 ? (
                    <Alert>
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>No Suspicious IPs Found</AlertTitle>
                        <AlertDescription>
                            Currently, there are no IP addresses that meet the threshold for being flagged as a potential VPN or proxy.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <Accordion type="single" collapsible className="w-full">
                        {suspiciousEntries.map(([ip, users]) => (
                            <AccordionItem key={ip} value={ip}>
                                <AccordionTrigger>
                                    <div className="flex items-center justify-between w-full pr-4">
                                        <div className="text-left">
                                            <p className="font-mono flex items-center gap-2">
                                                <Fingerprint className="w-4 h-4" />
                                                {ip}
                                            </p>
                                        </div>
                                         <Badge variant="destructive">{users.length} accounts</Badge>
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
