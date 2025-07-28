
'use client'
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LifeBuoy, Phone, Mail, Megaphone, Info, Users, Trophy, Menu } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, Network, Sword } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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

    const aboutSections = [
        {
            title: "Our Mission",
            content: "Nexbattle is the ultimate online arena where strategy, skill, and stakes collide. We provide a secure and engaging platform for Chess and Checkers enthusiasts to compete for real rewards, fostering a global community of strategic thinkers.",
            icon: Sword,
        },
        {
            title: "How to Earn",
            content: "In our Multiplayer Mode, you invest a wager from your wallet into each match. Victorious players receive an 180% return on their investment. Games ending in a draw result in a 90% refund to both players. To ensure fair play, players who resign receive a 75% refund, while their opponent gets a 105% payout.",
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
        <div className="flex flex-col min-h-screen bg-gradient-to-r from-[#2a003f] to-[#340064] text-white relative">
            <div 
                className="absolute inset-0 z-0 opacity-10"
                style={{
                    backgroundImage: `
                        radial-gradient(circle at top left, hsl(var(--primary) / 0.2), transparent 30%),
                        radial-gradient(circle at bottom right, hsl(var(--accent) / 0.2), transparent 30%)
                    `
                }}
            />
            <div 
                className="absolute inset-0 z-0 opacity-[0.03]"
                style={{
                    backgroundImage: `
                        repeating-linear-gradient(0deg, transparent, transparent 49px, hsl(var(--primary)) 50px),
                        repeating-linear-gradient(90deg, transparent, transparent 49px, hsl(var(--primary)) 50px)
                    `,
                    backgroundSize: '50px 50px'
                }}
            />

            <header className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6 relative z-10">
                 <Link href="/" className="flex items-center gap-2 font-bold">
                    <Logo />
                </Link>
                 <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                    <Dialog>
                        <DialogTrigger asChild><button className="hover:text-primary">About Us</button></DialogTrigger>
                         <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2"><Info/> About Nexbattle</DialogTitle>
                                <DialogDescription>The ultimate platform where skill meets investment.</DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-[60vh] p-4">
                                <div className="space-y-6">
                                {aboutSections.map(section => (
                                    <div key={section.title}>
                                        <h3 className="font-semibold text-lg flex items-center gap-3 mb-2 text-primary">
                                            <section.icon className="w-5 h-5"/>
                                            {section.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">{section.content}</p>
                                        {section.link && (
                                            <Link href={section.link} className="text-primary font-semibold hover:underline mt-2 inline-block text-sm">
                                                {section.linkText} &rarr;
                                            </Link>
                                        )}
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
                                <DialogDescription>
                                    Have an issue? Reach out to us through any of the channels below.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <Button asChild className="w-full justify-start gap-3" variant="outline">
                                    <a href="tel:+94742974001"><Phone /> +94 74 297 4001</a>
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
                        <DialogTrigger asChild><button className="hover:text-primary">Join Marketing Team</button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2"><Trophy/> Join the Marketing Team</DialogTitle>
                                <DialogDescription>
                                    Supercharge your earnings by joining our official Marketing Partner program.
                                </DialogDescription>
                            </DialogHeader>
                            <Card className="bg-primary/5 border-primary/20 mt-4">
                                <CardContent className="p-6 text-sm space-y-4">
                                    <p>Our Marketing Partner Program unlocks a powerful 20-level deep referral network. As a marketer, you earn a 3% commission from every game played by a vast network of players, creating a significant passive income stream.</p>
                                    <p className="text-muted-foreground">If you are a community builder with a vision for growth, we want you on our team. Apply now to get started.</p>
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
                                <Dialog>
                                    <DialogTrigger asChild><button className="hover:text-primary text-left">About Us</button></DialogTrigger>
                                     <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2"><Info/> About Nexbattle</DialogTitle>
                                            <DialogDescription>The ultimate platform where skill meets investment.</DialogDescription>
                                        </DialogHeader>
                                        <ScrollArea className="h-[60vh] p-4">
                                            <div className="space-y-6">
                                            {aboutSections.map(section => (
                                                <div key={section.title}>
                                                    <h3 className="font-semibold text-lg flex items-center gap-3 mb-2 text-primary">
                                                        <section.icon className="w-5 h-5"/>
                                                        {section.title}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">{section.content}</p>
                                                    {section.link && (
                                                        <Link href={section.link} className="text-primary font-semibold hover:underline mt-2 inline-block text-sm">
                                                            {section.linkText} &rarr;
                                                        </Link>
                                                    )}
                                                </div>
                                            ))}
                                            </div>
                                        </ScrollArea>
                                    </DialogContent>
                                </Dialog>
                                <Dialog>
                                    <DialogTrigger asChild><button className="hover:text-primary text-left">Support</button></DialogTrigger>
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
                                                <a href="https://t.me/nexbattle_help" target="_blank" rel="noopener noreferrer"><TelegramIcon/> Telegram</a>
                                            </Button>
                                            <Button asChild className="w-full justify-start gap-3" variant="outline">
                                                <a href="mailto:nexbattlehelp@gmail.com"><Mail/> nexbattlehelp@gmail.com</a>
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                                <Dialog>
                                    <DialogTrigger asChild><button className="hover:text-primary text-left">Join Marketing Team</button></DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2"><Trophy/> Join the Marketing Team</DialogTitle>
                                            <DialogDescription>
                                                Supercharge your earnings by joining our official Marketing Partner program.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <Card className="bg-primary/5 border-primary/20 mt-4">
                                            <CardContent className="p-6 text-sm space-y-4">
                                                <p>Our Marketing Partner Program unlocks a powerful 20-level deep referral network. As a marketer, you earn a 3% commission from every game played by a vast network of players, creating a significant passive income stream.</p>
                                                <p className="text-muted-foreground">If you are a community builder with a vision for growth, we want you on our team. Apply now to get started.</p>
                                                 <Button asChild className="w-full">
                                                    <Link href="/marketing/register">Apply to be a Marketer</Link>
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
            <main className="flex-1 relative z-10">
                {children}
            </main>
        </div>
    )
  }

    