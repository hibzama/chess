
'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/use-translation';
import { DollarSign, Network, Megaphone, Sword, Trophy, Info } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/context/theme-context';
import { Skeleton } from '@/components/ui/skeleton';

const TranslatedText = ({ text }: { text: string }) => {
    const translated = useTranslation(text);
    return <>{translated}</>;
};

export default function AboutPage() {
    const { theme, loading } = useTheme();

    if (loading || !theme) {
        return (
            <div className="space-y-12">
                <div className="text-center">
                    <Skeleton className="h-10 w-1/2 mx-auto" />
                    <Skeleton className="h-5 w-3/4 mx-auto mt-2" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
                </div>
            </div>
        )
    }

    const sections = theme.aboutContent.split('## ').slice(1).map(section => {
        const [title, ...contentParts] = section.split('\n');
        const content = contentParts.join('\n').trim();
        const icons: { [key: string]: React.ElementType } = {
            "Our Mission": Sword,
            "Multiplayer Rules & Payouts": DollarSign,
            "Standard Referral System": Network,
            "Marketing Partner System": Megaphone,
            "Ranking & Leaderboards": Trophy,
        };
        const link = content.includes('/marketing/register') ? '/marketing/register' : undefined;
        const linkText = link ? 'Apply to be a Marketer' : undefined;
        return { title: title.trim(), content, icon: icons[title.trim()] || Info, link, linkText };
    });


    return (
        <div className="space-y-12">
             <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight"><TranslatedText text="About Nexbattle" /></h1>
                <p className="text-muted-foreground mt-2"><TranslatedText text="The ultimate platform where skill meets investment." /></p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {sections.map(section => (
                    <Card key={section.title} className="bg-card/50 border-primary/10">
                        <CardHeader className="flex flex-row items-start gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg mt-1">
                                <section.icon className="w-6 h-6 text-primary"/>
                            </div>
                            <div>
                                <CardTitle><TranslatedText text={section.title} /></CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                           <p className="text-muted-foreground whitespace-pre-line"><TranslatedText text={section.content} /></p>
                           {section.link && (
                               <Link href={section.link} className="text-primary font-semibold hover:underline mt-4 inline-block">
                                    <TranslatedText text={section.linkText as string} /> &rarr;
                               </Link>
                           )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
