
'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, DollarSign, MessageSquare, List, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

export default function MobileBottomNav() {
    const pathname = usePathname();
    const { userData } = useAuth();
    
    const navItems = [
        { href: '/dashboard', icon: Home, label: 'Dashboard' },
        { href: '/dashboard/friends', icon: Users, label: 'Friends' },
        { href: '/lobby', icon: DollarSign, label: 'Earn' },
        { href: '/dashboard/chat', icon: MessageSquare, label: 'Messages' },
        ...(userData?.taskReferredBy ? 
            [{ href: '/dashboard/tasks', icon: Gift, label: 'Tasks' }] :
            [{ href: '/dashboard/my-rooms', icon: List, label: 'My Rooms' }]),
    ];

    return (
        <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-card border-t border-border md:hidden">
            <div className="grid h-full grid-cols-5 mx-auto">
                {navItems.map((item, index) => {
                    const isActive = pathname.startsWith(item.href);
                    const isEarnButton = item.label === 'Earn';
                    
                    if (isEarnButton) {
                        return (
                             <div key={item.href} className="flex items-center justify-center">
                                <Link href={item.href} className="group relative">
                                    <div className="w-16 h-16 -translate-y-4 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30">
                                         <item.icon className="w-8 h-8"/>
                                    </div>
                                </Link>
                             </div>
                        )
                    }

                    return (
                        <Link key={item.href} href={item.href} className="inline-flex flex-col items-center justify-center px-5 hover:bg-muted group">
                             <item.icon className={cn("w-6 h-6 mb-1 text-muted-foreground group-hover:text-primary", isActive && "text-primary")}/>
                             <span className={cn("text-xs text-muted-foreground group-hover:text-primary", isActive && "text-primary")}>{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    );
}
