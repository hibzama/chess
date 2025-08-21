
'use client'
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarInset, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Home, LayoutGrid, BarChart3, Users, Swords, Trophy, Megaphone, MessageSquare, Info, Settings, LifeBuoy, Wallet, Bell, User, LogOut, Gamepad2, Circle, Phone, Mail, List, Gift, Award, ClipboardCheck, Languages } from "lucide-react";
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
import Image from 'next/image';
import { useTranslationSystem } from '@/context/translation-context';
import { useTranslation } from '@/hooks/use-translation';


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

const LanguageSwitcher = () => {
    const { languages, currentLang, changeLanguage, loading } = useTranslationSystem();

    if (loading || languages.length <= 1) return null;

    const currentLanguageName = languages.find(l => l.code === currentLang)?.name || 'Language';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                    <Languages className="w-4 h-4" />
                    <span className="hidden md:inline">{currentLanguageName}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                {languages.map(lang => (
                    <DropdownMenuItem key={lang.code} onSelect={() => changeLanguage(lang.code)}>
                        {lang.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

const NotificationBell = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const t = useTranslation;

    useEffect(() => {
        setIsMounted(true);
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
                    {isMounted && unreadCount > 0 && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                            {unreadCount}
                        </div>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>{t('Notifications')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length > 0 ? (
                    notifications.map(n => (
                        <DropdownMenuItem key={n.id} onClick={() => handleNotificationClick(n)} className={cn("flex items-start gap-3 cursor-pointer", !n.read && "bg-primary/10")}>
                           {!n.read && <Circle className="w-2 h-2 mt-1.5 text-primary fill-current" />}
                            <div className={cn("flex-1 space-y-1", n.read && "pl-5")}>
                                <p className="font-semibold">{t(n.title)}</p>
                                <p className="text-xs text-muted-foreground">{t(n.description)}</p>
                                <p className="text-xs text-muted-foreground">{n.createdAt ? formatDistanceToNowStrict(n.createdAt.toDate(), { addSuffix: true }) : ''}</p>
                            </div>
                        </DropdownMenuItem>
                    ))
                ) : (
                    <DropdownMenuItem disabled>{t('No new notifications')}</DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};


export default function MainLayout({
    children,
  }: {
    children: React.ReactNode,
  }) {
    const { logout, userData, loading, currencyConfig } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMounted, setIsMounted] = React.useState(false);
    const t = useTranslation;
    
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

    const isMarketer = userData?.role === 'marketer';
    
    const sidebarItems = isMarketer ? [
        { href: '/marketing/dashboard', icon: LayoutGrid, label: 'Dashboard' },
        { href: '/marketing/dashboard/wallet', icon: Wallet, label: 'Commission Wallet' },
    ] : [
        { href: '/dashboard', icon: LayoutGrid, label: 'Dashboard' },
        { href: '/dashboard/profile', icon: User, label: 'My Profile' },
        { href: '/dashboard/my-rooms', icon: List, label: 'My Rooms' },
        { href: '/dashboard/wallet', icon: Wallet, label: 'Wallet' },
        { href: '/dashboard/tasks', icon: ClipboardCheck, label: 'Task & Earn' },
        { href: '/dashboard/your-task', icon: ClipboardCheck, label: 'Your Tasks', condition: !!userData?.campaignInfo },
        { href: '/dashboard/friends', icon: Users, label: 'Friends & Community' },
        { href: '/dashboard/rankings', icon: Trophy, label: 'Rankings' },
        { href: '/dashboard/equipment', icon: Gamepad2, label: 'My Equipment' },
        { href: '/dashboard/referral-campaigns', icon: Award, label: 'Referral Campaigns' },
        { href: '/dashboard/chat', icon: MessageSquare, label: 'Direct Messages' },
        { href: '/about', icon: Info, label: 'About Us' },
    ];


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
                        {sidebarItems.filter(item => item.condition !== false).map(item => (
                             <SidebarMenuItem key={item.href}>
                                <Link href={item.href}>
                                    <SidebarMenuButton tooltip={t(item.label)} isActive={isMounted && pathname.startsWith(item.href)}>
                                        <item.icon />
                                        <span>{t(item.label)}</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarContent>
                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <Link href="/dashboard/settings"><SidebarMenuButton tooltip={t("Settings")} isActive={isMounted && pathname === '/dashboard/settings'}><Settings /><span>{t('Settings')}</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <DialogTrigger asChild>
                                <SidebarMenuButton tooltip={t("Support")}><LifeBuoy /><span>{t('Support')}</span></SidebarMenuButton>
                           </DialogTrigger>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip={t("Logout")} onClick={handleLogout}><LogOut /><span>{t('Logout')}</span></SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>
            <SidebarInset>
                <div className="absolute inset-0 z-0">
                    <Image
                        src="https://allnews.ltd/wp-content/uploads/2025/07/futuristic-video-game-controller-background-with-text-space_1017-54730.avif"
                        alt="background"
                        fill
                        className="object-cover"
                        data-ai-hint="futuristic gamepad"
                    />
                    <div className="absolute inset-0 bg-background/90" />
                </div>
                <div className="relative z-10 flex flex-col min-h-svh">
                    <header className="px-4 lg:px-6 h-16 flex items-center border-b">
                        <SidebarTrigger className="md:hidden"/>
                        <div className="ml-auto flex items-center gap-4">
                           {isMounted && (
                               <div className="flex items-center gap-2">
                                   <Link href={isMarketer ? "/marketing/dashboard/wallet" : "/dashboard/wallet"}>
                                      <Card className="bg-card/50 border-primary/20 hover:bg-primary/5 transition-colors">
                                          <CardContent className="p-2 flex items-center gap-2">
                                              <Wallet className="w-5 h-5 text-primary"/>
                                              <div>
                                              {loading || !userData ? (
                                                  <div className="space-y-1">
                                                    <Skeleton className="h-4 w-16"/>
                                                    <Skeleton className="h-3 w-12"/>
                                                  </div>
                                                  ) : (
                                                  <>
                                                      <p className="text-sm font-bold text-primary">{currencyConfig.symbol} {(isMarketer ? userData.marketingBalance ?? 0 : userData.balance ?? 0).toFixed(2)}</p>
                                                      <p className="text-xs text-muted-foreground">~{((isMarketer ? userData.marketingBalance ?? 0 : userData.balance ?? 0) / currencyConfig.usdtRate).toFixed(2)} USDT</p>
                                                  </>
                                              )}
                                              </div>
                                          </CardContent>
                                      </Card>
                                  </Link>
                               </div>
                           )}
                            <LanguageSwitcher />
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
                                    <DropdownMenuItem asChild><Link href="/dashboard/profile"><User className="mr-2"/> {t('Profile')}</Link></DropdownMenuItem>
                                    <DropdownMenuItem asChild><Link href="/dashboard/settings"><Settings className="mr-2"/> {t('Settings')}</Link></DropdownMenuItem>
                                    <DropdownMenuItem asChild><Link href="/dashboard/wallet"><Wallet className="mr-2"/> {t('Wallet')}</Link></DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout}><LogOut className="mr-2"/> {t('Log out')}</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </header>
                    <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
                        {children}
                    </main>
                    <MobileBottomNav />
                </div>
            </SidebarInset>
        </SidebarProvider>
         <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><LifeBuoy/> {t('Contact Support')}</DialogTitle>
                <DialogDescription>
                    {t('Have an issue? Reach out to us through any of the channels below.')}
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <Button asChild className="w-full justify-start gap-3" variant="outline">
                    <a href="tel:+94704894587"><Phone /> +94 70 489 4587</a>
                </Button>
                <Button asChild className="w-full justify-start gap-3" variant="outline">
                    <a href="https://wa.me/94704894587" target="_blank" rel="noopener noreferrer"><MessageSquare/> WhatsApp</a>
                </Button>
                <Button asChild className="w-full justify-start gap-3" variant="outline">
                    <a href="https://t.me/nexbattle_help" target="_blank" rel="noopener noreferrer"><TelegramIcon/> Telegram</a>
                </Button>
                <Button asChild className="w-full justify-start gap-3" variant="outline">
                    <a href="mailto:nexbattlehelp@gmail.com"><Mail/> nexbattlehelp@gmail.com</a>
                </Button>
            </div>
        </DialogContent>
        </Dialog>
    )
  }
