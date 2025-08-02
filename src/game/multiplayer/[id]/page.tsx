'use client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Gamepad2, Info, Flag, DollarSign, Trophy } from 'lucide-react';
import { useGame } from '@/context/game-context';
import { Button } from '../ui/button';
import { useEffect, useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { useAuth } from '@/context/auth-context';
import { Separator } from '../ui/separator';

export function GameInfo() {
    const { playerColor, moveCount, resign, isMultiplayer, room, user, roomWager } = useGame();
    const { userData } = useAuth();
    const [isClient, setIsClient] = useState(false);
    const [isResignConfirmOpen, setIsResignConfirmOpen] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleResign = () => {
        setIsResignConfirmOpen(false);
        resign();
    }
    
    const opponentData = isMultiplayer && room && room.player2 ? (room.createdBy.uid === user?.uid ? room.player2 : room.createdBy) : null;
    const opponentName = isMultiplayer && opponentData ? opponentData.name : 'Bot';
    
    const winnerReturn = roomWager * 1.8;

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
                    <span className="font-medium">{opponentName}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total Moves:</span>
                    <span className="font-medium">{isClient ? moveCount : 0}</span>
                </div>
                 {isMultiplayer && roomWager > 0 && (
                    <>
                        <Separator/>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5"><DollarSign className="w-4 h-4"/> Player Investment:</span>
                            <span className="font-medium">LKR {roomWager.toFixed(2)}</span>
                        </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5"><Trophy className="w-4 h-4"/> Winner's Return:</span>
                            <span className="font-medium text-green-400">LKR {winnerReturn.toFixed(2)}</span>
                        </div>
                    </>
                 )}
                 {!isMultiplayer && (
                    <Button variant="destructive" className="w-full" onClick={() => setIsResignConfirmOpen(true)}>
                        <Flag className="w-4 h-4 mr-2" />
                        Resign
                    </Button>
                 )}
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
        </>
    );
}