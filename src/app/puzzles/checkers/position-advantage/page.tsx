
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";

export default function PositionAdvantagePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
                        <Zap className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle>Position Advantage</CardTitle>
                    <CardDescription>This puzzle mode is under construction. Check back soon!</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Puzzles designed to teach you winning board positions are on the way.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/puzzles"><ArrowLeft className="mr-2"/> Back to Puzzles</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
