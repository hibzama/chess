'use client'
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LifeBuoy, Phone, Mail, Megaphone, Info, Users, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Logo = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 28"
      fill="currentColor"
      className="w-24 h-7 text-primary"
    >
      <path d="M14 0C6.268 0 0 6.268 0 14s6.268 14 14 14c4.695 0 8.826-2.28 11.458-5.795a1 1 0 00-1.464-1.362A12 12 0 1114 2a1 1 0 000-2zM42.857 0h14.286v28h-14.286V0zM64.285 0h14.286v28h-14.286V0zM85.714 0h14.286v28H85.714V0z" />
    </svg>
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
        <Dialog>
            <div className="flex flex-col min-h-screen">
                <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm">
                    <div className="container mx-auto flex h-16 items-center justify-between px-4">
                         <Link href="/" className="flex items-center gap-2 font-bold">
                            <Logo />
                        </Link>
                         <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                            <DialogTrigger asChild><button className="hover:text-primary">About Us</button></DialogTrigger>
                            <DialogTrigger asChild><button className="hover:text-primary">Support</button></DialogTrigger>
                            <DialogTrigger asChild><button className="hover:text-primary">Join Marketing Team</button></DialogTrigger>
                        </nav>
                        <div className="flex items-center gap-2">
                             <Button variant="outline" asChild>
                                <Link href="/login">Sign In</Link>
                            </Button>
                            <Button asChild>
                                <Link href="/register">Sign Up</Link>
                            </Button>
                        </div>
                    </div>
                </header>
                <main className="flex-1 pt-16">
                    {children}
                </main>
            </div>
             <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Info/> About Nexbattle</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 text-sm text-muted-foreground">
                    <p>Nexbattle is the ultimate online arena where strategy, skill, and stakes collide. We provide a secure and engaging platform for Chess and Checkers enthusiasts to compete for real rewards, fostering a global community of strategic thinkers.</p>
                    <p>Earn by winning games, referring friends, or joining our exclusive marketing team for deep referral networks and higher commissions.</p>
                </div>
            </DialogContent>
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
    )
  }
