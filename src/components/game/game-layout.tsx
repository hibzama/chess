
'use client'

import Link from 'next/link';
import { ArrowLeft, History, Users, Settings, Crown } from 'lucide-react';
import PlayerInfo from './player-info';
import MoveHistory from './move-history';
import { Button } from '@/components/ui/button';
import { useGame } from '@/context/game-context';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import React from 'react';
import { useAuth } from '@/context/auth-context';
import { CapturedPieces } from './captured-pieces';
import { GameInfo } from './game-info';
import { formatTime } from '@/lib/time';
import { cn } from '@/lib/utils';

type GameLayoutProps = {
  children: React.ReactNode;
  gameType: 'Chess' | 'Checkers';
};

export default function GameLayout({ children, gameType }: GameLayoutProps) {
  const { player1Time, player2Time, winner, gameOver, resetGame, playerColor, currentPlayer, isMounted } = useGame();
  const { userData } = useAuth();
  const router = useRouter();

  const equipment = gameType === 'Chess' ? userData?.equipment?.chess : userData?.equipment?.checkers;


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
  
  const isP1Turn = isMounted && ((playerColor === 'w' && currentPlayer === 'w') || (playerColor === 'b' && currentPlayer === 'b'));
  const isP2Turn = isMounted && ((playerColor === 'w' && currentPlayer === 'b') || (playerColor === 'b' && currentPlayer === 'w'));
  const turnText = isP1Turn ? 'Your Turn' : "Opponent's Turn";

  return (
    <>
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 px-4 lg:px-6 h-16 flex items-center justify-between border-b bg-background/80 backdrop-blur-sm">
        <Link href="/practice" passHref>
          <Button variant="ghost" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Practice</span>
          </Button>
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-primary">{gameType} Match</h1>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Game Settings</span>
            </Button>
        </div>
      </header>
      <main className="flex-1 w-full grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] xl:grid-cols-[340px_auto_340px] gap-6 p-4 md:p-6">
        {/* Left Column */}
        <aside className="flex flex-col gap-6">
            <PlayerInfo
              playerName={userData ? `${userData.firstName} (You)`: "Player 1 (You)"}
              avatarSrc="https://placehold.co/100x100.png"
              data-ai-hint="player avatar"
            />
            <CapturedPieces pieceStyle={equipment?.pieceStyle} />
        </aside>

        {/* Center Column */}
        <div className="flex flex-col items-center justify-center min-h-0 gap-4">
             <div className="w-full flex justify-between items-center px-2">
                <div className={cn("p-2 rounded-lg text-center", !isP1Turn && "bg-primary")}>
                    <p className="font-semibold">Opponent</p>
                    <p className="text-2xl font-bold">{formatTime(player2Time)}</p>
                </div>
                 <div className={cn("p-2 rounded-lg text-center", isP1Turn && "bg-primary")}>
                    <p className="font-semibold">You</p>
                    <p className="text-2xl font-bold">{formatTime(player1Time)}</p>
                </div>
            </div>
            {children}
            <div className="text-center font-semibold text-lg p-2 rounded-md bg-card border">
                Current Turn: <span className="text-primary">{turnText}</span>
            </div>
        </div>

        {/* Right Column */}
        <aside className="flex flex-col gap-6">
            <PlayerInfo
              playerName="Opponent (Bot)"
              avatarSrc="https://placehold.co/100x100.png"
              data-ai-hint="gamer portrait"
            />
            <GameInfo />
            <MoveHistory />
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
