'use client'
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarInset, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, LayoutGrid, BarChart3, Users, Swords, Trophy, Megaphone, MessageSquare, Info, Settings, LifeBuoy, Wallet, Bell, User, LogOut } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";


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

export default function DashboardLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { logout, userData } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    }

    const getInitials = () => {
        if (userData) {
            return `${userData.firstName.charAt(0)}${userData.lastName.charAt(0)}`.toUpperCase();
        }
        return '...';
    }

    const USDT_RATE = 310;


    return (
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
                        <SidebarMenuItem>
                            <Link href="/dashboard"><SidebarMenuButton tooltip="Dashboard" isActive><LayoutGrid /><span>Dashboard</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="My Rooms"><BarChart3 /><span>My Rooms</span></SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <Link href="/dashboard/wallet"><SidebarMenuButton tooltip="Wallet"><Wallet /><span>Wallet</span></SidebarMenuButton></Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Friends & Community"><Users /><span>Friends & Community</span></SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Rankings"><Trophy /><span>Rankings</span></SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="My Equipment"><Swords /><span>My Equipment</span></SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Refer & Earn"><Megaphone /><span>Refer & Earn</span></SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Tournaments"><Trophy /><span>Tournaments</span></SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Direct Messages"><MessageSquare /><span>Direct Messages</span></SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="About Us"><Info /><span>About Us</span></SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarContent>
                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Settings"><Settings /><span>Settings</span></SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Support"><LifeBuoy /><span>Support</span></SidebarMenuButton>
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
                    <div className="hidden md:flex items-center gap-2 text-lg font-medium"><Home className="w-5 h-5" /> Home</div>
                    <div className="ml-auto flex items-center gap-4">
                        <Card className="hidden sm:block bg-card/50 border-primary/20">
                            <CardContent className="p-2 flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-primary"/>
                                <div>
                                    <p className="text-sm font-bold text-primary">{userData ? (userData.balance / USDT_RATE).toFixed(2) : '0.00'} USDT</p>
                                    <p className="text-xs text-muted-foreground">Your Balance</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Button variant="ghost" size="icon"><Bell /></Button>
                        <Button variant="ghost" size="icon"><Settings /></Button>
                        <Avatar>
                            <AvatarImage src="https://placehold.co/40x40.png" data-ai-hint="avatar" />
                            <AvatarFallback>{getInitials()}</AvatarFallback>
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
