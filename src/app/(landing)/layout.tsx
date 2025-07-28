'use client'
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LifeBuoy, Phone, Mail, Megaphone, Info, Users, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
            <path d="M12 3v1" />
            <path d="M12 20v1" />
            <path d="m5 7 1-1" />
            <path d="m18 18 1-1" />
            <path d="m5 17 1 1" />
            <path d="m18 6-1 1" />
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
    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-r from-[#2a003f] to-[#340064] text-white">
            <header className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
                 <Link href="/" className="flex items-center gap-2 font-bold">
                    <Logo />
                </Link>
                 <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                    <Dialog>
                        <DialogTrigger asChild><button className="hover:text-primary">About Us</button></DialogTrigger>
                         <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2"><Info/> About Nexbattle</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4 text-sm text-muted-foreground">
                                <p>Nexbattle is the ultimate online arena where strategy, skill, and stakes collide. We provide a secure and engaging platform for Chess and Checkers enthusiasts to compete for real rewards, fostering a global community of strategic thinkers.</p>
                                <p>Earn by winning games, referring friends, or joining our exclusive marketing team for deep referral networks and higher commissions.</p>
                            </div>
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
                </div>
            </header>
            <main className="flex-1">
                {children}
            </main>
        </div>
    )
  }
