import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Network, Megaphone, Sword, Trophy } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {

    const sections = [
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
        <div className="space-y-12">
             <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight">About Nexbattle</h1>
                <p className="text-muted-foreground mt-2">The ultimate platform where skill meets investment.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {sections.map(section => (
                    <Card key={section.title} className="bg-card/50 border-primary/10">
                        <CardHeader className="flex flex-row items-start gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg mt-1">
                                <section.icon className="w-6 h-6 text-primary"/>
                            </div>
                            <div>
                                <CardTitle>{section.title}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                           <p className="text-muted-foreground">{section.content}</p>
                           {section.link && (
                               <Link href={section.link} className="text-primary font-semibold hover:underline mt-4 inline-block">
                                    {section.linkText} &rarr;
                               </Link>
                           )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
