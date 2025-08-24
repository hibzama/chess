
'use client';

import { useTheme } from "@/context/theme-context";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import { useTranslation } from "@/hooks/use-translation";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LifeBuoy, Phone, MessageSquare, Mail } from "lucide-react";


const TelegramIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
)

const Logo = () => {
    const { theme } = useTheme();
    if (theme?.logoUrl && theme.id !== 'chess_king') { // Only for default theme for now
        return <Image src={theme.logoUrl} alt="Logo" width={120} height={40} />;
    }
    return (
        <div className="flex items-center gap-2">
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
            <h1 className="text-xl font-bold text-primary">Nexbattle</h1>
        </div>
    );
};

const Header = () => {
    const { theme } = useTheme();
    const t = useTranslation;
    const supportDetails = theme?.supportDetails;

    return (
        <Dialog>
            <header className="py-4 px-4 md:px-8 flex justify-between items-center bg-background/80 backdrop-blur-sm sticky top-0 z-40 border-b">
                <Link href="/"><Logo /></Link>
                <nav className="hidden md:flex items-center gap-6">
                    <Link href="/about" className="text-sm font-medium hover:text-primary transition-colors">{t('About')}</Link>
                    <DialogTrigger asChild>
                        <Button variant="link" className="text-sm font-medium hover:text-primary transition-colors">{t('Support')}</Button>
                    </DialogTrigger>
                </nav>
                <div className="flex items-center gap-4">
                    <Button variant="outline" asChild><Link href="/login">{t('Login')}</Link></Button>
                    <Button asChild><Link href="/register">{t('Register')}</Link></Button>
                </div>
            </header>
             {supportDetails && (
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><LifeBuoy/> {t('Contact Support')}</DialogTitle>
                        <DialogDescription>
                            {t('Have an issue? Reach out to us through any of the channels below.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Button asChild className="w-full justify-start gap-3" variant="outline">
                            <a href={`tel:${supportDetails.phone}`}><Phone /> {supportDetails.phone}</a>
                        </Button>
                        <Button asChild className="w-full justify-start gap-3" variant="outline">
                            <a href={`https://wa.me/${supportDetails.whatsapp}`} target="_blank" rel="noopener noreferrer"><MessageSquare/> {t('WhatsApp')}</a>
                        </Button>
                        <Button asChild className="w-full justify-start gap-3" variant="outline">
                            <a href={`https://t.me/${supportDetails.telegram}`} target="_blank" rel="noopener noreferrer"><TelegramIcon/> {t('Telegram')}</a>
                        </Button>
                        <Button asChild className="w-full justify-start gap-3" variant="outline">
                            <a href={`mailto:${supportDetails.email}`}><Mail/> {supportDetails.email}</a>
                        </Button>
                    </div>
                </DialogContent>
             )}
        </Dialog>
    )
}


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

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            {children}
        </div>
    );
  }
