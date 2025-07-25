
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Sword, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {

    const settingsOptions = [
        {
            title: "Profile Settings",
            description: "Manage your avatar, view your game statistics, and check your rank progression.",
            icon: User,
            href: "/dashboard/profile"
        },
        {
            title: "Game Equipment",
            description: "Customize the look of your chess and checkers pieces and boards.",
            icon: Sword,
            href: "/dashboard/equipment"
        }
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your account and game preferences.</p>
            </div>

            <div className="space-y-6 max-w-2xl">
                {settingsOptions.map((option) => (
                    <Card key={option.title}>
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <option.icon className="w-6 h-6 text-primary"/>
                            </div>
                            <div className="flex-1">
                                <CardTitle>{option.title}</CardTitle>
                                <CardDescription>{option.description}</CardDescription>
                            </div>
                            <Button asChild variant="ghost" size="icon">
                                <Link href={option.href}>
                                    <ArrowRight />
                                </Link>
                            </Button>
                        </CardHeader>
                    </Card>
                ))}
            </div>
        </div>
    )
}

