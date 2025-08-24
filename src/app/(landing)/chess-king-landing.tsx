
'use client';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LifeBuoy, Phone, Mail, Megaphone, Info, Users, Trophy, Menu, DollarSign, Network, Sword, MessageSquare, Languages, Search, Puzzle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { useTheme } from "@/context/theme-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslationSystem } from "@/context/translation-context";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import React from "react";
import { cn } from "@/lib/utils";


const TelegramIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
)

const ChessKingLogo = () => {
    const { theme } = useTheme();
    if (!theme?.logoUrl) {
        return (
            <div className="flex items-center gap-2 text-xl font-bold text-white">
                <span>Chess King</span>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-2 text-xl font-bold text-white">
            <Image src={theme.logoUrl} alt="Chess King Logo" width={120} height={40} />
        </div>
    );
};


const LanguageSwitcher = () => {
    const { languages, currentLang, changeLanguage, loading } = useTranslationSystem();
    if (loading || languages.length <= 1) return null;
    const currentLanguageName = languages.find(l => l.code === currentLang)?.name || 'Language';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 text-gray-400 hover:text-white w-full justify-start">
                    <Languages />
                    <span>{currentLanguageName}</span>
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

export default function ChessKingLanding() {
    const { theme, loading: themeLoading } = useTheme();

    if (themeLoading || !theme) {
        return <Skeleton className="h-screen w-full" />;
    }
    
    const { landingPage, aboutContent, supportDetails, marketingContent } = theme;
    const { heroTitle, heroImageUrl, landingSections = [], playingNow, gamesToday, heroTitleAlign } = landingPage || {};


     const aboutSections = (aboutContent || '').split('## ').slice(1).map(section => {
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
    
    const getLinkForSection = (buttonText: string) => {
        if (buttonText.toLowerCase().includes('computer')) {
            return '/practice';
        }
        return '/register';
    }

    const textAlignClass = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
    }[heroTitleAlign || 'left'];

    return (
        <div className="flex h-screen bg-[#302e2c] text-white">
            {/* Fixed Sidebar */}
            <aside className="w-64 bg-[#262421] p-4 flex-col justify-between hidden md:flex">
                <div>
                    <div className="mb-4">
                        <ChessKingLogo />
                    </div>
                    <nav className="mt-8 space-y-2">
                        <Link href="/puzzles"><Button variant="ghost" className="w-full justify-start gap-2 text-gray-400 hover:text-white"><Puzzle/> Puzzles</Button></Link>
                         <Dialog>
                            <DialogTrigger asChild><Button variant="ghost" className="w-full justify-start gap-2 text-gray-400 hover:text-white"><Info/> About Us</Button></DialogTrigger>
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
                            <DialogTrigger asChild><Button variant="ghost" className="w-full justify-start gap-2 text-gray-400 hover:text-white"><LifeBuoy/> Support</Button></DialogTrigger>
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
                            <DialogTrigger asChild><Button variant="ghost" className="w-full justify-start gap-2 text-gray-400 hover:text-white"><Trophy/> Join Marketing Team</Button></DialogTrigger>
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
                </div>
                 <div>
                    <div className="space-y-2">
                        <Button asChild className="w-full"><Link href="/register">Sign Up</Link></Button>
                        <Button asChild variant="secondary" className="w-full"><Link href="/login">Log In</Link></Button>
                    </div>
                    <div className="mt-4 border-t border-gray-700 pt-4">
                        <LanguageSwitcher />
                    </div>
                </div>
            </aside>

            {/* Scrollable Main Content */}
            <main className="flex-1 overflow-y-auto flex flex-col">
                <header className="py-4 px-8 text-center">
                     <div className="flex justify-center items-center gap-8 text-sm">
                        <p><span className="font-bold">{playingNow}</span> PLAYING NOW</p>
                        <p><span className="font-bold">{gamesToday}</span> GAMES TODAY</p>
                    </div>
                </header>

                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-8 container mx-auto">
                        <div className="relative w-full h-full min-h-[300px] md:min-h-[400px]">
                           {heroImageUrl && <Image src={heroImageUrl} alt="Chess pieces" fill className="object-contain" data-ai-hint="chess pieces illustration" />}
                        </div>
                        <div className={cn("md:text-left", textAlignClass)}>
                            <h1 className="text-4xl md:text-5xl font-bold leading-tight whitespace-pre-line">{heroTitle}</h1>
                            <Button asChild size="lg" className="mt-6">
                                <Link href="/register">Get Started</Link>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="p-8 md:p-16 grid grid-cols-1 md:grid-cols-2 gap-12 bg-[#262421]/50">
                    {landingSections.map((section, index) => (
                        <div key={index} className="text-center p-4 rounded-lg" style={{ borderColor: section.borderColor || 'transparent', borderWidth: 2 }}>
                            <div className="relative aspect-video mb-4 rounded-md overflow-hidden group">
                                <Image src={section.image || 'https://placehold.co/400x250.png'} alt={section.title} fill className="object-cover" data-ai-hint={section.aiHint || 'abstract'} />
                                 {section.overlayText && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-white text-center font-semibold">{section.overlayText}</p>
                                    </div>
                                )}
                            </div>
                            <h2 className="text-xl font-semibold text-gray-200">{section.title}</h2>
                            <Button 
                                asChild 
                                variant={section.buttonStyle === 'box' ? 'outline' : 'link'} 
                                className="text-lg mt-2"
                                style={{ color: section.buttonTextColor || '' }}
                            >
                                <Link href={getLinkForSection(section.buttonText)}>{section.buttonText}</Link>
                            </Button>
                        </div>
                    ))}
                </div>

                <footer className="p-8 bg-[#262421] text-center text-gray-400 text-sm">
                    <p>&copy; {new Date().getFullYear()} Nexbattle. All rights reserved.</p>
                </footer>
            </main>
        </div>
    );
}
