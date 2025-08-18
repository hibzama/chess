'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Megaphone, Users, DollarSign, Layers, ShieldCheck, CheckCircle } from 'lucide-react';

export default function ReferralProgramPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3"><Megaphone/> Referral Program</h1>
                <p className="text-muted-foreground">Learn how to maximize your earnings by growing the Nexbattle community.</p>
            </div>

            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShieldCheck/> Become a Marketing Partner</CardTitle>
                    <CardDescription>
                        Ready to take your earnings to the next level? Our Marketing Partner program is designed for dedicated community builders. Unlock a deep referral network and earn significant commissions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/marketing/register">Apply to Join the Marketing Team</Link>
                    </Button>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>The Marketing System</CardTitle>
                        <CardDescription>How our powerful 20-level system works.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-4">
                            <Users className="w-8 h-8 text-primary mt-1"/>
                            <div>
                                <h3 className="font-semibold">Level 1: Direct Referrals</h3>
                                <p className="text-sm text-muted-foreground">
                                    When you become a marketer, you get a unique <span className="font-semibold text-primary">`mref`</span> link. Anyone who signs up with this link becomes your direct Level 1 referral.
                                </p>
                            </div>
                        </div>
                         <div className="flex items-start gap-4">
                            <Layers className="w-8 h-8 text-primary mt-1"/>
                            <div>
                                <h3 className="font-semibold">Levels 2-20: Building Your Network</h3>
                                <p className="text-sm text-muted-foreground">
                                    Your network grows when anyone in your chain refers new players using their bonus referral links (<span className="font-semibold text-primary">`aref`</span>). These new players are added to your network, up to 20 levels deep.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Commission Structure</CardTitle>
                        <CardDescription>Simple and profitable commissions.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="flex items-start gap-4">
                            <DollarSign className="w-8 h-8 text-primary mt-1"/>
                            <div>
                                <h3 className="font-semibold">3% Commission</h3>
                                <p className="text-sm text-muted-foreground">
                                    You earn a 3% commission from the wager of <span className="font-bold">every player</span> in your 20-level network, every time they play a game.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <CheckCircle className="w-8 h-8 text-primary mt-1"/>
                            <div>
                                <h3 className="font-semibold">Double Commission</h3>
                                <p className="text-sm text-muted-foreground">
                                    If two players from your own network play against each other, you earn commission from <span className="font-bold">both</span> players, totaling 6% for that single game.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
