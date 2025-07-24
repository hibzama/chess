
'use client'
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarInset, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Users, LogOut, Clock, History, DollarSign, ArrowUpCircle, ArrowDownCircle, Megaphone, Wallet } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useEffect } from "react";


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
                            <Link href="/admin"><SidebarMenuButton tooltip="Dashboard" isActive><LayoutGrid /><span>Dashboard</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <Link href="/admin/deposits/pending"><SidebarMenuButton tooltip="Pending Deposits"><Clock /><span>Pending Deposits</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <Link href="/admin/withdrawals/pending"><SidebarMenuButton tooltip="Pending Withdrawals"><Clock /><span>Pending Withdrawals</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                             <Link href="/admin/deposits/history"><SidebarMenuButton tooltip="Deposit History"><ArrowUpCircle /><span>Deposit History</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                             <Link href="/admin/withdrawals/history"><SidebarMenuButton tooltip="Withdrawal History"><ArrowDownCircle /><span>Withdrawal History</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                             <Link href="/admin/users"><SidebarMenuButton tooltip="Users"><Users /><span>Users</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                             <Link href="/admin/marketing/applications"><SidebarMenuButton tooltip="Marketing Applications"><Megaphone /><span>Marketing Apps</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                             <Link href="/admin/marketing/withdrawals/pending"><SidebarMenuButton tooltip="Marketing Withdrawals"><Wallet /><span>Marketing Withdrawals</span></SidebarMenuButton></Link>
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
