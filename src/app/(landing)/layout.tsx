
'use client';

import { useTheme } from "@/context/theme-context";
import { Skeleton } from "@/components/ui/skeleton";

// Default Layout Component
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LifeBuoy, Phone, Mail, Megaphone, Info, Users, Trophy, Menu, DollarSign, Network, Sword, MessageSquare, Languages } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import React from "react";

const DefaultLogo = () => (
    <div className="flex items-center gap-2 text-2xl font-bold">
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
        <span>Nexbattle</span>
    </div>
);

const TelegramIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
)

const DefaultLandingLayout = ({ children }: { children: React.ReactNode }) => {
    const { theme } = useTheme();
    const { aboutContent, supportDetails, marketingContent } = theme!;

    // A simplified way to parse the markdown-like content from Firestore
    const aboutSections = aboutContent.split('## ').slice(1).map(section => {
        const [title, ...contentParts] = section.split('\n');
        const content = contentParts.join('\n').trim();
        const icons: { [key: string]: React.ElementType } = {
            "Our Mission": Sword,
            "Multiplayer Rules & Payouts": DollarSign,
            "Standard Referral System": Network,
            "Marketing Partner System": Megaphone,
            "Ranking & Leaderboards": Trophy,
        };
        return { title, content, icon: icons[title.trim()] || Info };
    });

    return (
        <div className="flex flex-col min-h-screen bg-background text-white relative overflow-hidden">
             <div 
                className="absolute inset-0 z-0 opacity-40 animate-zoom-in-out"
                style={{
                    backgroundImage: `url(${theme?.landingPage.bgImageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            <div className="absolute inset-0 z-10 bg-black/50" />
            <header className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6 relative z-20">
                 <Link href="/" className="flex items-center gap-2 font-bold">
                    <DefaultLogo />
                </Link>
                 <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                    <Dialog>
                        <DialogTrigger asChild><button className="hover:text-primary">About Us</button></DialogTrigger>
                         <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2"><Info/> About Nexbattle</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="h-[60vh] p-4">
                                <div className="space-y-6">
                                {aboutSections.map(section => (
                                    <div key={section.title}>
                                        <h3 className="font-semibold text-lg flex items-center gap-3 mb-2 text-primary">
                                            <section.icon className="w-5 h-5"/>
                                            {section.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground whitespace-pre-line">{section.content}</p>
                                    </div>
                                ))}
                                </div>
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                     <Dialog>
                        <DialogTrigger asChild><button className="hover:text-primary">Support</button></DialogTrigger>
                         <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2"><LifeBuoy/> Contact Support</DialogTitle>
                            </DialogHeader>
                             <div className="space-y-4 py-4">
                                <Button asChild className="w-full justify-start gap-3" variant="outline">
                                    <a href={`tel:${supportDetails.phone}`}><Phone /> {supportDetails.phone}</a>
                                </Button>
                                <Button asChild className="w-full justify-start gap-3" variant="outline">
                                    <a href={`https://wa.me/${supportDetails.whatsapp}`} target="_blank" rel="noopener noreferrer"><MessageSquare/> WhatsApp</a>
                                </Button>
                                <Button asChild className="w-full justify-start gap-3" variant="outline">
                                    <a href={`https://t.me/${supportDetails.telegram}`} target="_blank" rel="noopener noreferrer"><TelegramIcon/> Telegram</a>
                                </Button>
                                <Button asChild className="w-full justify-start gap-3" variant="outline">
                                    <a href={`mailto:${supportDetails.email}`}><Mail/> {supportDetails.email}</a>
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                     <Dialog>
                        <DialogTrigger asChild><button className="hover:text-primary">Join Marketing Team</button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2"><Trophy/> Join the Marketing Team</DialogTitle>
                            </DialogHeader>
                            <Card className="bg-primary/5 border-primary/20 mt-4">
                                <CardContent className="p-6 text-sm space-y-4">
                                    <p className="whitespace-pre-line">{marketingContent}</p>
                                     <Button asChild className="w-full">
                                        <Link href="/marketing/register">Apply to be a Marketer</Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        </DialogContent>
                    </Dialog>
                </nav>
                <div className="flex items-center gap-2">
                     <Button variant="outline" asChild>
                        <Link href="/login">Sign In</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/register">Sign Up</Link>
                    </Button>
                     <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="md:hidden">
                                <Menu />
                                <span className="sr-only">Toggle navigation menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left">
                             <nav className="grid gap-6 text-lg font-medium mt-12">
                                {/* Mobile dialogs can be simplified or reused */}
                                <Link href="/about">About Us</Link>
                                <Link href="/support">Support</Link>
                                <Link href="/marketing/register">Join Marketing Team</Link>
                            </nav>
                        </SheetContent>
                    </Sheet>
                </div>
            </header>
            <main className="flex-1 relative z-20">
                {children}
            </main>
        </div>
    );
};

export default function LandingLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { theme, loading: themeLoading } = useTheme();

    if (themeLoading || !theme) {
        return <Skeleton className="h-screen w-full" />;
    }
    
    // The "Chess King" theme provides its own full-page layout, so we don't need a wrapper.
    if (theme.id === 'chess_king') {
        return <>{children}</>;
    }

    // Render the default layout for the default theme.
    return <DefaultLandingLayout>{children}</DefaultLandingLayout>;
  }
