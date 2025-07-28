'use client'
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LifeBuoy, Phone, Mail } from "lucide-react";

const Logo = () => (
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
                            <span>Nexbattle</span>
                        </Link>
                         <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                            <Link href="/" className="hover:text-primary">Home</Link>
                            <Link href="/about" className="hover:text-primary">About Us</Link>
                             <DialogTrigger asChild>
                                <button className="hover:text-primary">Marketing</button>
                            </DialogTrigger>
                             <DialogTrigger asChild>
                                <button className="hover:text-primary">Support</button>
                            </DialogTrigger>
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
    )
  }
