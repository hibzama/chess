'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Target } from "lucide-react";
import CheckersBoard from "@/components/game/checkers-board";
import { GameProvider } from "@/context/game-context";

export default function ForcedCapturePage() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <Card className="lg:col-span-1">
                <CardHeader>
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full w-fit">
                            <Target className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Forced Capture</CardTitle>
                            <CardDescription>Find the best sequence of jumps.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        In checkers, captures are mandatory. Use this rule to your advantage by finding a sequence of moves that forces your opponent to make a capture, setting up a powerful counter-attack for you.
                    </p>
                </CardContent>
                 <CardFooter className="flex-col items-start gap-4">
                    <Button variant="outline" className="w-full">Next Puzzle</Button>
                    <Button asChild variant="ghost" className="w-full justify-start text-muted-foreground">
                        <Link href="/puzzles"><ArrowLeft className="mr-2"/> Back to Puzzles</Link>
                    </Button>
                </CardFooter>
            </Card>
            <div className="lg:col-span-2">
                 <GameProvider gameType="checkers">
                    <CheckersBoard />
                </GameProvider>
            </div>
        </div>
    )
}
