'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import CheckersBoard from "@/components/game/checkers-board";
import { GameProvider } from "@/context/game-context";

export default function PositionAdvantagePage() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <Card className="lg:col-span-1">
                <CardHeader>
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full w-fit">
                            <Zap className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Position Advantage</CardTitle>
                            <CardDescription>Find the move to gain control.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Sometimes the best move isn't a capture. Find the single move that strengthens your control of the board, limits your opponent's options, and sets you up for future captures.
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
