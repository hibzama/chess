
'use client';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LifeBuoy, Phone, Mail, Megaphone, Info, Users, Trophy, Menu, DollarSign, Network, Sword, MessageSquare, Languages, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { useTheme } from "@/context/theme-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslationSystem } from "@/context/translation-context";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

const ChessKingLogo = () => (
    <div className="flex items-center gap-2 text-xl font-bold text-white">
        <Image src="https://images.chesscomfiles.com/uploads/v1/images_files/_200/V1-images_nav-logo-h-wood.82363421.svg" alt="Chess King Logo" width={100} height={30} />
    </div>
);

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

const landingSections = [
    {
        title: "Play vs customizable training bots from total beginner to master.",
        buttonText: "Play vs Computer",
        image: "https://placehold.co/400x250.png",
        aiHint: "chess computer"
    },
    {
        title: "Play online with over 100 million members from around the world.",
        buttonText: "Play Online",
        image: "https://placehold.co/400x250.png",
        aiHint: "chess world"
    },
    {
        title: "Learn from your games and relive your best moments with our virtual coach in Game Review.",
        buttonText: "Analyze Your Game",
        image: "https://placehold.co/400x250.png",
        aiHint: "chess analysis"
    },
    {
        title: "Train your tactical skills with 100,000+ puzzles.",
        buttonText: "Solve Puzzles",
        image: "https://placehold.co/400x250.png",
        aiHint: "chess puzzle"
    },
    {
        title: "Level up your game with fun, interactive lessons from top masters and coaches.",
        buttonText: "Start a Lesson",
        image: "https://placehold.co/400x250.png",
        aiHint: "chess lesson"
    },
    {
        title: "Watch the best players in the world play in the biggest events.",
        buttonText: "Watch Live",
        image: "https://placehold.co/400x250.png",
        aiHint: "chess tournament"
    },
    {
        title: "Play your friends and family anytime, anywhere with our mobile apps.",
        buttonText: "Download on App Store",
        image: "https://placehold.co/400x250.png",
        aiHint: "chess mobile"
    }
];

export default function ChessKingLanding() {
    const { theme, loading: themeLoading } = useTheme();

    if (themeLoading || !theme) {
        return <Skeleton className="h-screen w-full" />;
    }
    
    const { heroTitle, heroSubtitle, bgImageUrl } = theme.landingPage;

    return (
        <div className="flex h-screen bg-background text-white">
            {/* Fixed Sidebar */}
            <aside className="w-64 bg-[#262421] p-4 flex-col justify-between hidden md:flex">
                <div>
                    <ChessKingLogo />
                    <nav className="mt-8 space-y-2">
                         <Button variant="ghost" asChild className="w-full justify-start gap-2 text-gray-400 hover:text-white"><Link href="/about"><Info/> About Us</Link></Button>
                         <Button variant="ghost" asChild className="w-full justify-start gap-2 text-gray-400 hover:text-white"><Link href="/support"><LifeBuoy/> Support</Link></Button>
                         <Button variant="ghost" asChild className="w-full justify-start gap-2 text-gray-400 hover:text-white"><Link href="/marketing/register"><Trophy/> Join Marketing Team</Link></Button>
                    </nav>
                </div>
                 <div>
                    <div className="space-y-2">
                        <Button asChild className="w-full bg-green-600 hover:bg-green-700"><Link href="/register">Sign Up</Link></Button>
                        <Button asChild variant="secondary" className="w-full"><Link href="/login">Log In</Link></Button>
                    </div>
                    <div className="mt-4 border-t border-gray-700 pt-4">
                        <LanguageSwitcher />
                    </div>
                </div>
            </aside>

            {/* Scrollable Main Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="relative h-96 flex flex-col items-center justify-center text-center p-4 bg-cover bg-center" style={{ backgroundImage: `url(${bgImageUrl})` }}>
                    <div className="absolute inset-0 bg-black/50" />
                     <div className="relative z-10">
                        <h1 className="text-4xl md:text-5xl font-bold leading-tight">{heroTitle}</h1>
                        <p className="mt-4 text-lg text-gray-200">{heroSubtitle}</p>
                        <Button asChild size="lg" className="mt-6 bg-green-600 hover:bg-green-700">
                            <Link href="/register">Get Started</Link>
                        </Button>
                    </div>
                </div>

                <div className="p-8 md:p-16 grid grid-cols-1 md:grid-cols-2 gap-12 bg-[#302e2c]">
                    {landingSections.map((section, index) => (
                        <div key={index} className="text-center">
                            <div className="relative aspect-video mb-4 rounded-md overflow-hidden">
                                <Image src={section.image} alt={section.title} fill className="object-cover" data-ai-hint={section.aiHint} />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-200">{section.title}</h2>
                            <Button asChild variant="link" className="text-green-500 text-lg mt-2">
                                <Link href="/register">{section.buttonText}</Link>
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
