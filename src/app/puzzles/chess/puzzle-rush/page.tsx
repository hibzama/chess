'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import ChessBoard from "@/components/game/chess-board";
import { GameProvider } from "@/context/game-context";

export default function PuzzleRushPage() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <Card className="lg:col-span-1">
                <CardHeader>
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full w-fit">
                            <Zap className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Puzzle Rush</CardTitle>
                            <CardDescription>Solve puzzles against the clock.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Test your tactical speed and accuracy. Solve as many puzzles as you can within the time limit. The puzzles get harder as you go. Three strikes and you're out!
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
                 <GameProvider gameType="chess">
                    <ChessBoard />
                </GameProvider>
            </div>
        </div>
    )
}
