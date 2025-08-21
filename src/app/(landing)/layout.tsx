
'use client'
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LifeBuoy, Phone, Mail, Megaphone, Info, Users, Trophy, Menu, DollarSign, Network, Sword, MessageSquare, Languages } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTranslation } from "@/hooks/use-translation";
import { useTranslationSystem } from "@/context/translation-context";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const LanguageSwitcher = () => {
    const { languages, currentLang, changeLanguage, loading } = useTranslationSystem();
    const t = useTranslation;

    if (loading || languages.length <= 1) return null;

    const currentLanguageName = languages.find(l => l.code === currentLang)?.name || 'Language';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                    <Languages className="w-4 h-4" />
                    <span className="hidden md:inline">{t(currentLanguageName)}</span>
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

const Logo = () => (
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

export default function LandingLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const t = useTranslation;

    const aboutSections = [
        {
            title: "Our Mission",
            content: "Nexbattle is the ultimate online arena where strategy, skill, and stakes collide. We provide a secure and engaging platform for Chess and Checkers enthusiasts to compete for real rewards, fostering a global community of strategic thinkers.",
            icon: Sword,
        },
        {
            title: "Multiplayer Rules & Payouts",
            content: "In Multiplayer Mode, your wager is your investment. A standard win by checkmate, timeout, or capturing all pieces earns you a 180% return. If the game ends in a draw, both players receive a 90% refund. To ensure fair play, if you resign or abandon a match, you still get a 75% refund, while your opponent is rewarded with a 105% payout for their time.",
            icon: DollarSign,
        },
        {
            title: "Standard Referral System",
            content: "Every user can earn by inviting friends. Share your unique referral link, and when someone signs up, they become your Level 1 referral. You'll earn a commission from every game they play. The more direct referrals you have, the higher your commission rate becomes.",
            icon: Network,
        },
        {
            title: "Marketing Partner System",
            content: "For our most dedicated community builders, the Marketing Partner Program unlocks a powerful 20-level deep referral network. As a marketer, you earn commissions from a vast network of players, creating a significant passive income stream. Anyone can apply to join the team.",
            link: "/marketing/register",
            linkText: "Apply to be a Marketer",
            icon: Megaphone
        },
        {
            title: "Ranking & Leaderboards",
            content: "Your legacy is built on wins. Accumulate victories across both Chess and Checkers to increase your level and unlock prestigious Rank Titles, from 'Beginner' to 'Immortal'. Compete against everyone on the platform to climb the live World Rank leaderboard.",
            icon: Trophy
        }
    ];


    return (
        <div className="flex flex-col min-h-screen bg-background text-white relative overflow-hidden">
             <div 
                className="absolute inset-0 z-0 opacity-40 animate-zoom-in-out"
                style={{
                    backgroundImage: `url(https://allnews.ltd/wp-content/uploads/2025/07/futuristic-video-game-controller-background-with-text-space_1017-54730.avif)`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            <div className="absolute inset-0 z-10 bg-black/50" />


            <header className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6 relative z-20">
                 <Link href="/" className="flex items-center gap-2 font-bold">
                    <Logo />
                </Link>
                 <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                    <Dialog>
                        <DialogTrigger asChild><button className="hover:text-primary">{t('About Us')}</button></DialogTrigger>
                         <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2"><Info/> {t('About Nexbattle')}</DialogTitle>
                                <DialogDescription>{t('The ultimate platform where skill meets investment.')}</DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-[60vh] p-4">
                                <div className="space-y-6">
                                {aboutSections.map(section => (
                                    <div key={section.title}>
                                        <h3 className="font-semibold text-lg flex items-center gap-3 mb-2 text-primary">
                                            <section.icon className="w-5 h-5"/>
                                            {t(section.title)}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">{t(section.content)}</p>
                                        {section.link && (
                                            <Link href={section.link} className="text-primary font-semibold hover:underline mt-2 inline-block text-sm">
                                                {t(section.linkText as string)} &rarr;
                                            </Link>
                                        )}
                                    </div>
                                ))}
                                </div>
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                     <Dialog>
                        <DialogTrigger asChild><button className="hover:text-primary">{t('Support')}</button></DialogTrigger>
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
                     <Dialog>
                        <DialogTrigger asChild><button className="hover:text-primary">{t('Join Marketing Team')}</button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2"><Trophy/> {t('Join the Marketing Team')}</DialogTitle>
                                <DialogDescription>
                                    {t('Supercharge your earnings by joining our official Marketing Partner program.')}
                                </DialogDescription>
                            </DialogHeader>
                            <Card className="bg-primary/5 border-primary/20 mt-4">
                                <CardContent className="p-6 text-sm space-y-4">
                                    <p>{t('Our Marketing Partner Program unlocks a powerful 20-level deep referral network. As a marketer, you earn a 3% commission from every game played by a vast network of players, creating a significant passive income stream.')}</p>
                                    <p className="text-muted-foreground">{t('If you are a community builder with a vision for growth, we want you on our team. Apply now to get started.')}</p>
                                     <Button asChild className="w-full">
                                        <Link href="/marketing/register">{t('Apply to be a Marketer')}</Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        </DialogContent>
                    </Dialog>
                </nav>
                <div className="flex items-center gap-2">
                     <LanguageSwitcher />
                     <Button variant="outline" asChild>
                        <Link href="/login">{t('Sign In')}</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/register">{t('Sign Up')}</Link>
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
                                <Dialog>
                                    <DialogTrigger asChild><button className="hover:text-primary text-left">{t('About Us')}</button></DialogTrigger>
                                     <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2"><Info/> {t('About Nexbattle')}</DialogTitle>
                                            <DialogDescription>{t('The ultimate platform where skill meets investment.')}</DialogDescription>
                                        </DialogHeader>
                                        <ScrollArea className="h-[60vh] p-4">
                                            <div className="space-y-6">
                                            {aboutSections.map(section => (
                                                <div key={section.title}>
                                                    <h3 className="font-semibold text-lg flex items-center gap-3 mb-2 text-primary">
                                                        <section.icon className="w-5 h-5"/>
                                                        {t(section.title)}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">{t(section.content)}</p>
                                                    {section.link && (
                                                        <Link href={section.link} className="text-primary font-semibold hover:underline mt-2 inline-block text-sm">
                                                            {t(section.linkText as string)} &rarr;
                                                        </Link>
                                                    )}
                                                </div>
                                            ))}
                                            </div>
                                        </ScrollArea>
                                    </DialogContent>
                                </Dialog>
                                <Dialog>
                                    <DialogTrigger asChild><button className="hover:text-primary text-left">{t('Support')}</button></DialogTrigger>
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
                                <Dialog>
                                    <DialogTrigger asChild><button className="hover:text-primary text-left">{t('Join Marketing Team')}</button></DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2"><Trophy/> {t('Join the Marketing Team')}</DialogTitle>
                                            <DialogDescription>
                                                {t('Supercharge your earnings by joining our official Marketing Partner program.')}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <Card className="bg-primary/5 border-primary/20 mt-4">
                                            <CardContent className="p-6 text-sm space-y-4">
                                                <p>{t('Our Marketing Partner Program unlocks a powerful 20-level deep referral network. As a marketer, you earn a 3% commission from every game played by a vast network of players, creating a significant passive income stream.')}</p>
                                                <p className="text-muted-foreground">{t('If you are a community builder with a vision for growth, we want you on our team. Apply now to get started.')}</p>
                                                 <Button asChild className="w-full">
                                                    <Link href="/marketing/register">{t('Apply to be a Marketer')}</Link>
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </DialogContent>
                                </Dialog>
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
  }
