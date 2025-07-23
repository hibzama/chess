
'use client'

import Link from 'next/link';
import { Crown, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { useGame } from '@/context/game-context';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import React from 'react';
import { formatTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { getPieceIcon } from '@/lib/get-piece-icon';

type GameLayoutProps = {
  children: React.ReactNode;
  gameType: 'Chess' | 'Checkers';
};


const CapturedPieces = () => {
    const { capturedByPlayer, capturedByBot } = useGame();

    return (
        <Card className="w-full h-full bg-card/50 border-none shadow-none">
            <CardHeader>
                <CardTitle>Captured Pieces</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <h3 className="text-sm font-semibold mb-2">You captured ({capturedByPlayer.length}):</h3>
                    <div className="flex flex-wrap gap-2 p-2 bg-black/20 rounded-md min-h-[50px]">
                        {capturedByPlayer.length === 0 ? <p className="text-xs text-muted-foreground self-center px-2">None</p> :
                            capturedByPlayer.map((p, i) => (
                                <svg key={i} viewBox="0 0 45 45" className="w-8 h-8">
                                    {getPieceIcon(p.type, p.color === 'w' ? '#f8fafc' : '#0f172a')}
                                </svg>
                            ))
                        }
                    </div>
                </div>
                 <div>
                    <h3 className="text-sm font-semibold mb-2">Opponent captured ({capturedByBot.length}):</h3>
                    <div className="flex flex-wrap gap-2 p-2 bg-black/20 rounded-md min-h-[50px]">
                        {capturedByBot.length === 0 ? <p className="text-xs text-muted-foreground self-center px-2">None</p> :
                            capturedByBot.map((p, i) => (
                                <svg key={i} viewBox="0 0 45 45" className="w-8 h-8">
                                    {getPieceIcon(p.type, p.color === 'w' ? '#f8fafc' : '#0f172a')}
                                </svg>
                            ))
                        }
                    </div>
                </div>
                <Link href="/practice" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-4">
                    <ArrowLeft className="w-4 h-4"/> Back to Setup
                </Link>
            </CardContent>
        </Card>
    )
}

const GameInfo = ({gameType}: {gameType: string}) => {
    const { moveHistory, gameOver, winner } = useGame();
    const router = useRouter();
    const playerColor = useGame().playerColor;

    const getStatus = () => {
        if (gameOver) {
            if(winner === 'draw') return "Draw";
            return "Finished";
        }
        return "Playing";
    }

    return (
         <Card className="w-full h-full bg-card/50 border-none shadow-none">
            <CardHeader>
                <CardTitle>Game Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Your Color:</span>
                    <span className="font-medium capitalize">{playerColor === 'w' ? 'White' : 'Black'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Opponent:</span>
                    <span className="font-medium">{gameType} Bot</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Moves:</span>
                    <span className="font-medium">{moveHistory.length}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-medium">{getStatus()}</span>
                </div>

                <Button variant="destructive" className="w-full mt-4 !bg-red-600 hover:!bg-red-700" onClick={() => router.push('/practice')}>
                    Resign
                </Button>
            </CardContent>
        </Card>
    )
}


export default function GameLayout({ children, gameType }: GameLayoutProps) {
  const { player1Time, player2Time, winner, gameOver, resetGame, playerColor, currentPlayer, timeLimit } = useGame();
  const router = useRouter();

  const handleCloseDialog = () => {
    resetGame();
    router.push('/practice');
  }

  const getWinnerMessage = () => {
    if (winner === 'draw') return { title: "Game Over", description: "The game has ended in a draw."};

    const player1Won = winner === 'p1';

    return player1Won 
        ? { title: "🎉 Congratulations! You Win! 🎉", description: "Your brilliant strategy paid off. Well played!" }
        : { title: "😥 Better Luck Next Time 😥", description: "The bot has won this time. Keep practicing!" };
  }
  
  const isP1Turn = (playerColor === 'w' && currentPlayer === 'w') || (playerColor === 'b' && currentPlayer === 'b');
  
  return (
    <>
    <div className="flex flex-col min-h-screen bg-background text-foreground p-4 md:p-6 lg:p-8">
      
        <header className="text-center mb-4">
            <h1 className="text-2xl font-bold">You ({playerColor === 'w' ? "White" : "Black"}) vs {gameType} Bot</h1>
            <p className="text-muted-foreground text-sm">Balanced gameplay • {timeLimit/60} minutes per player</p>
        </header>

      <main className="flex-1 w-full grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] xl:grid-cols-[320px_1fr_320px] gap-6">
        <aside className="hidden lg:flex flex-col gap-6">
            <CapturedPieces/>
        </aside>

        <div className="flex flex-col items-center justify-center min-h-0 gap-4">
             {/* Timers */}
            <div className="w-full flex justify-between items-center max-w-[75vh] lg:max-w-lg">
                <div className={cn("p-3 rounded-lg transition-all", !isP1Turn && "bg-primary/10")}>
                    <p className="text-sm font-semibold">Opponent</p>
                    <p className="text-2xl font-bold">{formatTime(player2Time)}</p>
                </div>
                 <div className={cn("p-3 rounded-lg transition-all text-right", isP1Turn && "bg-primary text-primary-foreground")}>
                    <p className="text-sm font-semibold">You</p>
                    <p className="text-2xl font-bold">{formatTime(player1Time)}</p>
                </div>
            </div>
            
            {/* Game Board */}
            {children}
            
            {/* Current Turn */}
            <div className="text-center">
                <p className="font-bold text-lg">Current Turn: <span className="capitalize">{currentPlayer === 'w' ? 'White' : 'Black'}</span></p>
                <p className="text-muted-foreground text-sm">{isP1Turn ? "Your turn" : "Opponent's turn"}</p>
            </div>
        </div>

        <aside className="hidden lg:flex flex-col gap-6">
            <GameInfo gameType={gameType} />
        </aside>
      </main>
    </div>
    
    <AlertDialog open={gameOver}>
        <AlertDialogContent>
            <AlertDialogHeader className="items-center text-center">
            <div className="p-4 rounded-full bg-primary/10 mb-2">
                <Crown className="w-12 h-12 text-primary" />
            </div>
            <AlertDialogTitle className="text-2xl">{getWinnerMessage().title}</AlertDialogTitle>
            <AlertDialogDescription>
                {getWinnerMessage().description}
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogAction onClick={handleCloseDialog}>Play Again</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
