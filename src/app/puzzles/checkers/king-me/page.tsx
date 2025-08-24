'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Crown } from "lucide-react";
import CheckersBoard from "@/components/game/checkers-board";
import { GameProvider } from "@/context/game-context";

export default function KingMePage() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <Card className="lg:col-span-1">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full w-fit">
                            <Crown className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <CardTitle>King Me</CardTitle>
                            <CardDescription>Find the path to promotion.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        The goal is simple: find the series of moves that allows one of your pieces to reach the final rank and become a powerful King. Analyze the board and clear your path to victory.
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
