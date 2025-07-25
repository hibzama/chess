import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, GitNetwork, Megaphone, Sword, Trophy } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {

    const sections = [
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
            icon: GitNetwork,
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
