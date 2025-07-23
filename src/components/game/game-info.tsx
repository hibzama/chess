
'use client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Gamepad2, Info, Flag } from 'lucide-react';
import { useGame } from '@/context/game-context';
import { Button } from '../ui/button';
import { useEffect, useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';

export function GameInfo() {
    const { playerColor, moveCount, resign } = useGame();
    const [isClient, setIsClient] = useState(false);
    const [isResignConfirmOpen, setIsResignConfirmOpen] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleResign = () => {
        setIsResignConfirmOpen(false);
        resign();
    }

    return (
        <>
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
                 <Button variant="destructive" className="w-full" onClick={() => setIsResignConfirmOpen(true)}>
                    <Flag className="w-4 h-4 mr-2" />
                    Resign
                </Button>
            </CardContent>
        </Card>
         <AlertDialog open={isResignConfirmOpen} onOpenChange={setIsResignConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to resign?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This is a practice match, so no funds will be lost.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResign}>Resign</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}
