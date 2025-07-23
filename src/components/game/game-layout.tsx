
'use client'

import Link from 'next/link';
import { ArrowLeft, History, Users, Settings, Crown, Flag, Wallet } from 'lucide-react';
import PlayerInfo from './player-info';
import MoveHistory from './move-history';
import { Button } from '@/components/ui/button';
import { useGame } from '@/context/game-context';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { CapturedPieces } from './captured-pieces';
import { GameInfo } from './game-info';
import { formatTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

type GameLayoutProps = {
  children: React.ReactNode;
  gameType: 'Chess' | 'Checkers';
  headerContent?: React.ReactNode;
};

export default function GameLayout({ children, gameType, headerContent }: GameLayoutProps) {
  const { p1Time, p2Time, winner, gameOver, gameOverReason, resetGame, playerColor, currentPlayer, isMounted, resign, showResignModal, setShowResignModal, handleResignConfirm, isMultiplayer, payoutAmount } = useGame();
  const { user, userData } = useAuth();
  const router = useRouter();
  const USDT_RATE = 310;
  
  const equipment = gameType === 'Chess' ? userData?.equipment?.chess : userData?.equipment?.checkers;

  const handleCloseDialog = () => {
    resetGame();
    router.push('/dashboard');
  };

  const getWinnerMessage = () => {
    let title = "Game Over";
    let description = "The game has concluded.";
    
    if (isMultiplayer) {
         switch(gameOverReason) {
            case 'draw':
                title = "It's a Draw!";
                description = "The game has ended in a draw by agreement or stalemate.";
                break;
            case 'checkmate':
                 title = winner === 'p1' ? "🎉 You Won! 🎉" : `😥 You Lost 😥`;
                 description = winner === 'p1' ? `You beat your opponent by checkmate.` : `Your opponent has checkmated you.`;
                 break;
            case 'timeout':
                 title = winner === 'p1' ? "🎉 You Won on Time! 🎉" : `😥 You Lost on Time 😥`;
                 description = winner === 'p1' ? `Your opponent ran out of time.` : "You ran out of time.";
                 break;
            case 'resign':
                 title = winner === 'p1' ? "🎉 Opponent Resigned! 🎉" : `😥 You Resigned 😥`;
                 description = winner === 'p1' ? `Your opponent has resigned the game.` : "You have resigned the game.";
                 break;
            default:
                 if (winner === 'p1') {
                    title = "🎉 You Won! 🎉";
                    description = "You have won the game.";
                 } else if (winner === 'p2') {
                    title = "😥 You Lost 😥";
                    description = "You have lost the game.";
                 }
                 break;
        }
    } else { // Practice Mode messages
        switch(gameOverReason) {
            case 'draw':
                title = "It's a Draw!";
                description = "The game has ended in a draw by agreement or stalemate.";
                break;
            case 'checkmate':
                title = winner === 'p1' ? "🎉 You Won! 🎉" : `😥 You Lost 😥`;
                description = winner === 'p1' ? `You checkmated the bot. Well played!` : `The bot has checkmated you.`;
                break;
            case 'timeout':
                title = winner === 'p1' ? "🎉 You Won on Time! 🎉" : `😥 You Lost on Time 😥`;
                description = winner === 'p1' ? `The bot ran out of time.` : "You ran out of time.";
                break;
            case 'resign':
                 title = "You Resigned";
                 description = "You have resigned the game against the bot.";
                 break;
            default:
                 if (winner === 'p1') {
                    title = "🎉 You Won! 🎉";
                 } else if (winner === 'p2') {
                    title = "😥 You Lost 😥";
                 }
                 break;
        }
    }

    return { title, description };
  }
  
  const isP1Turn = isMounted && ((playerColor === 'w' && currentPlayer === 'w') || (playerColor === 'b' && currentPlayer === 'b'));
  const turnText = isP1Turn ? 'Your Turn' : "Opponent's Turn";
  

  return (
    <>
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 px-4 lg:px-6 h-16 flex items-center justify-between border-b bg-background/80 backdrop-blur-sm">
        <Link href={isMultiplayer ? "/lobby" : "/practice"} passHref>
          <Button variant="ghost" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Lobby</span>
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
        <div className="hidden lg:grid grid-rows-[auto,1fr] gap-6">
            <PlayerInfo
              playerName={userData ? `${userData.firstName} (You)`: "Player 1 (You)"}
              avatarSrc="https://placehold.co/100x100.png"
              data-ai-hint="player avatar"
            />
             <MoveHistory />
        </div>

        {/* Center Column */}
        <div className="flex flex-col items-center justify-center min-h-0 gap-4">
            {headerContent}
             <div className="w-full flex justify-between items-center px-2">
                <div className={cn("p-2 rounded-lg text-center", !isP1Turn && "bg-primary")}>
                    <p className="font-semibold">Opponent</p>
                    <p className="text-2xl font-bold">{formatTime(Math.ceil(p2Time))}</p>
                </div>
                 <div className={cn("p-2 rounded-lg text-center", isP1Turn && "bg-primary")}>
                    <p className="font-semibold">You</p>
                    <p className="text-2xl font-bold">{formatTime(Math.ceil(p1Time))}</p>
                </div>
            </div>
            {children}
            <div className="text-center font-semibold text-lg p-2 rounded-md bg-card border">
                Current Turn: <span className="text-primary">{turnText}</span>
            </div>
        </div>

        {/* Right Column */}
        <aside className="hidden lg:grid grid-rows-[auto,auto,1fr] gap-6">
            <PlayerInfo
              playerName="Opponent"
              avatarSrc="https://placehold.co/100x100.png"
              data-ai-hint="gamer portrait"
            />
            <CapturedPieces pieceStyle={equipment?.pieceStyle} />
             {isMultiplayer ? (
                 <Card>
                    <CardContent className="p-4">
                        <Button variant="destructive" className="w-full" onClick={() => setShowResignModal(true)}>
                            <Flag className="w-4 h-4 mr-2" />
                            Resign
                        </Button>
                    </CardContent>
                </Card>
             ) : (
                <GameInfo />
             )}
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
                <AlertDialogDescription asChild>
                    <div className="text-sm text-muted-foreground space-y-2">
                        <div>{getWinnerMessage().description}</div>
                        {isMultiplayer && payoutAmount !== null && payoutAmount > 0 && (
                            <div className="p-3 rounded-md bg-secondary text-secondary-foreground font-semibold flex items-center justify-center gap-2">
                                <Wallet className="w-5 h-5"/> Wallet Return: LKR {payoutAmount.toFixed(2)} (~{(payoutAmount / USDT_RATE).toFixed(2)} USDT)
                            </div>
                        )}
                    </div>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <Button className="w-full" onClick={handleCloseDialog}>Return to Dashboard</Button>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={showResignModal} onOpenChange={setShowResignModal}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to resign?</AlertDialogTitle>
            <AlertDialogDescription>
                If you resign, you will forfeit the match. You will receive a 75% refund of your wager, and your opponent will receive a 105% payout.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResignConfirm}>Confirm Resignation</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
