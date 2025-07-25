
'use client'
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarInset, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Home, LayoutGrid, BarChart3, Users, Swords, Trophy, Megaphone, MessageSquare, Info, Settings, LifeBuoy, Wallet, Bell, User, LogOut, Gamepad2, Circle, Phone, Mail } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useEffect, useState } from "react";
import MobileBottomNav from "./mobile-bottom-nav";
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDistanceToNowStrict } from 'date-fns';
import { cn } from "@/lib/utils";


const Logo = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-8 h-8 text-primary"
    >
      <path
        fillRule="evenodd"
        d="M12.96 2.544a3 3 0 00-1.92 0L8.14 4.167a1.5 1.5 0 01-1.39.07l-3.03-1.684a1.5 1.5 0 00-1.74 2.29l1.684 3.03a1.5 1.5 0 01-.07 1.39L3.02 12.86a3 3 0 000 1.92l1.623 2.9a1.5 1.5 0 01.07 1.39l-1.684 3.03a1.5 1.5 0 002.29 1.74l3.03-1.684a1.5 1.5 0 011.39.07l2.9 1.623a3 3 0 001.92 0l2.9-1.623a1.5 1.5 0 011.39-.07l3.03 1.684a1.5 1.5 0 001.74-2.29l-1.684-3.03a1.5 1.5 0 01.07-1.39l1.623-2.9a3 3 0 000-1.92l-1.623-2.9a1.5 1.5 0 01-.07-1.39l1.684-3.03a1.5 1.5 0 00-2.29-1.74l-3.03 1.684a1.5 1.5 0 01-1.39-.07l-2.9-1.623z"
        clipRule="evenodd"
      />
    </svg>
  );

type Notification = {
    id: string;
    title: string;
    description: string;
    createdAt: any;
    read: boolean;
    href?: string;
}

const TelegramIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
)

const NotificationBell = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const router = useRouter();

    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'notifications'), 
            where('userId', '==', user.uid),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Notification));
            // Sort client-side
            notifsData.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
            setNotifications(notifsData);
            setUnreadCount(notifsData.filter(n => !n.read).length);
        });

        return () => unsubscribe();
    }, [user]);

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read) {
            await updateDoc(doc(db, 'notifications', notification.id), { read: true });
        }
        if (notification.href) {
            router.push(notification.href);
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell />
                    {unreadCount > 0 && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                            {unreadCount}
                        </div>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length > 0 ? (
                    notifications.map(n => (
                        <DropdownMenuItem key={n.id} onClick={() => handleNotificationClick(n)} className={cn("flex items-start gap-3 cursor-pointer", !n.read && "bg-primary/10")}>
                           {!n.read && <Circle className="w-2 h-2 mt-1.5 text-primary fill-current" />}
                            <div className={cn("flex-1 space-y-1", n.read && "pl-5")}>
                                <p className="font-semibold">{n.title}</p>
                                <p className="text-xs text-muted-foreground">{n.description}</p>
                                <p className="text-xs text-muted-foreground">{n.createdAt ? formatDistanceToNowStrict(n.createdAt.toDate(), { addSuffix: true }) : ''}</p>
                            </div>
                        </DropdownMenuItem>
                    ))
                ) : (
                    <DropdownMenuItem disabled>No new notifications</DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};


export default function MainLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { logout, userData, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMounted, setIsMounted] = React.useState(false);
    
    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    }

    const getInitials = () => {
        if (userData) {
            return `${userData.firstName.charAt(0)}${userData.lastName.charAt(0)}`.toUpperCase();
        }
        return '..';
    }

    const USDT_RATE = 310;
    const isMarketer = userData?.role === 'marketer';


    return (
        <Dialog>
        <SidebarProvider>
            <Sidebar>
                <SidebarHeader>
                    <div className="flex items-center gap-2">
                        <Logo />
                        <h1 className="text-xl font-bold text-primary group-data-[collapsible=icon]:hidden">Nexbattle</h1>
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarMenu>
                        {isMarketer ? (
                            <>
                                <SidebarMenuItem>
                                    <Link href="/marketing/dashboard"><SidebarMenuButton tooltip="Dashboard" isActive={isMounted && pathname.startsWith('/marketing/dashboard')}><LayoutGrid /><span>Dashboard</span></SidebarMenuButton></Link>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <Link href="/marketing/dashboard/wallet"><SidebarMenuButton tooltip="Commission Wallet" isActive={isMounted && pathname.startsWith('/marketing/dashboard/wallet')}><Wallet /><span>Commission Wallet</span></SidebarMenuButton></Link>
                                </SidebarMenuItem>
                            </>
                        ) : (
                            <>
                                <SidebarMenuItem>
                                    <Link href="/dashboard"><SidebarMenuButton tooltip="Dashboard" isActive={isMounted && pathname === '/dashboard'}><LayoutGrid /><span>Dashboard</span></SidebarMenuButton></Link>
                                </SidebarMenuItem>
                                 <SidebarMenuItem>
                                    <Link href="/dashboard/profile"><SidebarMenuButton tooltip="My Profile" isActive={isMounted && pathname === '/dashboard/profile'}><User /><span>My Profile</span></SidebarMenuButton></Link>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <Link href="/dashboard/my-rooms"><SidebarMenuButton tooltip="My Rooms" isActive={isMounted && pathname === '/dashboard/my-rooms'}><BarChart3 /><span>My Rooms</span></SidebarMenuButton></Link>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <Link href="/dashboard/wallet"><SidebarMenuButton tooltip="Wallet" isActive={isMounted && pathname === '/dashboard/wallet'}><Wallet /><span>Wallet</span></SidebarMenuButton></Link>
                                </SidebarMenuItem>
                                 <SidebarMenuItem>
                                    <Link href="/dashboard/friends"><SidebarMenuButton tooltip="Friends & Community" isActive={isMounted && pathname.startsWith('/dashboard/friends')}><Users /><span>Friends & Community</span></SidebarMenuButton></Link>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <Link href="/dashboard/rankings"><SidebarMenuButton tooltip="Rankings" isActive={isMounted && pathname.startsWith('/dashboard/rankings')}><Trophy /><span>Rankings</span></SidebarMenuButton></Link>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <Link href="/dashboard/equipment"><SidebarMenuButton tooltip="My Equipment" isActive={isMounted && pathname === '/dashboard/equipment'}><Swords /><span>My Equipment</span></SidebarMenuButton></Link>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                <Link href="/dashboard/refer-earn"><SidebarMenuButton tooltip="Refer & Earn" isActive={isMounted && pathname === '/dashboard/refer-earn'}><Megaphone /><span>Refer & Earn</span></SidebarMenuButton></Link>
                                </SidebarMenuItem>
                                 <SidebarMenuItem>
                                    <Link href="/dashboard/chat"><SidebarMenuButton tooltip="Direct Messages" isActive={isMounted && pathname.startsWith('/dashboard/chat')}><MessageSquare /><span>Direct Messages</span></SidebarMenuButton></Link>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton tooltip="About Us"><Info /><span>About Us</span></SidebarMenuButton>
                                </SidebarMenuItem>
                            </>
                        )}
                    </SidebarMenu>
                </SidebarContent>
                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <Link href="/dashboard/settings"><SidebarMenuButton tooltip="Settings" isActive={isMounted && pathname === '/dashboard/settings'}><Settings /><span>Settings</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <DialogTrigger asChild>
                                <SidebarMenuButton tooltip="Support"><LifeBuoy /><span>Support</span></SidebarMenuButton>
                           </DialogTrigger>
                        </SidebarMenuItem>
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
                       <div>
                           <Link href={isMarketer ? "/marketing/dashboard/wallet" : "/dashboard/wallet"}>
                              <Card className="bg-card/50 border-primary/20 hover:bg-primary/5 transition-colors">
                                  <CardContent className="p-2 flex items-center gap-2">
                                      <Wallet className="w-5 h-5 text-primary"/>
                                      <div>
                                      {!isMounted || loading || !userData ? (
                                          <div className="space-y-1">
                                            <Skeleton className="h-4 w-16"/>
                                            <Skeleton className="h-3 w-12"/>
                                          </div>
                                          ) : (
                                          <>
                                              <p className="text-sm font-bold text-primary">LKR {(isMarketer ? userData.marketingBalance ?? 0 : userData.balance ?? 0).toFixed(2)}</p>
                                              <p className="text-xs text-muted-foreground">~{((isMarketer ? userData.marketingBalance ?? 0 : userData.balance ?? 0) / USDT_RATE).toFixed(2)} USDT</p>
                                          </>
                                      )}
                                      </div>
                                  </CardContent>
                              </Card>
                          </Link>
                       </div>
                        <NotificationBell />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button>
                                     <Avatar>
                                        <AvatarImage src={userData?.photoURL} />
                                        <AvatarFallback>{loading || !isMounted ? '..' : getInitials()}</AvatarFallback>
                                    </Avatar>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>
                                    <p>{userData?.firstName} {userData?.lastName}</p>
                                    <p className="text-xs text-muted-foreground font-normal">{userData?.email}</p>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild><Link href="/dashboard/profile"><User className="mr-2"/> Profile</Link></DropdownMenuItem>
                                <DropdownMenuItem asChild><Link href="/dashboard/settings"><Settings className="mr-2"/> Settings</Link></DropdownMenuItem>
                                <DropdownMenuItem asChild><Link href="/dashboard/wallet"><Wallet className="mr-2"/> Wallet</Link></DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout}><LogOut className="mr-2"/> Log out</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>
                <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
                    {children}
                </main>
                <MobileBottomNav />
            </SidebarInset>
        </SidebarProvider>
         <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><LifeBuoy/> Contact Support</DialogTitle>
                <DialogDescription>
                    Have an issue? Reach out to us through any of the channels below.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <Button asChild className="w-full justify-start gap-3" variant="outline">
                    <a href="tel:+94742974001"><Phone /> +94 74 297 4001</a>
                </Button>
                <Button asChild className="w-full justify-start gap-3" variant="outline">
                    <a href="https://wa.me/94742974001" target="_blank" rel="noopener noreferrer"><MessageSquare/> WhatsApp</a>
                </Button>
                <Button asChild className="w-full justify-start gap-3" variant="outline">
                    <a href="https://t.me/nexbattlehelp" target="_blank" rel="noopener noreferrer"><TelegramIcon/> Telegram</a>
                </Button>
                <Button asChild className="w-full justify-start gap-3" variant="outline">
                    <a href="mailto:nexbattlehelp@gmail.com"><Mail/> nexbattlehelp@gmail.com</a>
                </Button>
            </div>
        </DialogContent>
        </Dialog>
    )
  }
