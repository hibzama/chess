
'use client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Gamepad2, Info, Flag } from 'lucide-react';
import { useGame } from '@/context/game-context';
import { Button } from '../ui/button';
import { useEffect, useState } from 'react';

export function GameInfo() {
    const { playerColor, moveCount, resign } = useGame();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Info className="w-5 h-5"/>
                    Game Info
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Your Color:</span>
                    <span className="font-medium capitalize">{playerColor === 'w' ? 'White' : 'Black'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Opponent:</span>
                    <span className="font-medium">Bot</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total Moves:</span>
                    <span className="font-medium">{isClient ? moveCount : 0}</span>
                </div>
                 <Button variant="destructive" className="w-full" onClick={resign}>
                    <Flag className="w-4 h-4 mr-2" />
                    Resign
                </Button>
            </CardContent>
        </Card>
    );
}
