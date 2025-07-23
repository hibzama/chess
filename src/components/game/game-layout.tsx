
'use client'

import Link from 'next/link';
import { ArrowLeft, History, Users, Settings, Crown, Flag, Wallet, Bell } from 'lucide-react';
import PlayerInfo from './player-info';
import MoveHistory from './move-history';
import { Button } from '@/components/ui/button';
import { useGame } from '@/context/game-context';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { CapturedPieces } from './captured-pieces';
import { GameInfo } from './game-info';
import { formatTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';

type GameLayoutProps = {
  children: React.ReactNode;
  gameType: 'Chess' | 'Checkers';
  headerContent?: React.ReactNode;
};

const GameOverDisplay = () => {
    const { winner, gameOverReason, isMultiplayer, payoutAmount } = useGame();
    const router = useRouter();
    const USDT_RATE = 310;

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
                    title = winner === 'p1' ? "🎉 You Won on Time! 🎉" : `😥 You Lost 😥`;
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

    const { title, description } = getWinnerMessage();

    return (
        <Card className="w-full max-w-lg text-center p-8 bg-card/70 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <CardHeader className="items-center">
                 <div className="p-4 rounded-full bg-primary/10 mb-2">
                    <Crown className="w-12 h-12 text-primary" />
                </div>
                <CardTitle className="text-2xl">{title}</CardTitle>
                <CardDescription>
                   {description}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isMultiplayer && payoutAmount !== null && payoutAmount >= 0 && (
                    <div className="p-3 rounded-md bg-secondary text-secondary-foreground font-semibold flex items-center justify-center gap-2">
                        <Wallet className="w-5 h-5"/> Wallet Return: LKR {payoutAmount.toFixed(2)} (~{(payoutAmount / USDT_RATE).toFixed(2)} USDT)
                    </div>
                )}
            </CardContent>
            <CardContent>
                <Button className="w-full" onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
            </CardContent>
        </Card>
    )
}

export default function GameLayout({ children, gameType, headerContent }: GameLayoutProps) {
  const { isMultiplayer, p1Time, p2Time, gameOver, resetGame, playerColor, currentPlayer, isMounted, resign, roomWager } = useGame();
  const { user, userData } = useAuth();
  const router = useRouter();
  const USDT_RATE = 310;
  const [isResignConfirmOpen, setIsResignConfirmOpen] = useState(false);
  
  const equipment = gameType === 'Chess' ? userData?.equipment?.chess : userData?.equipment?.checkers;

  useEffect(() => {
    // This effect runs when the component unmounts.
    // If a game is over, we reset the state when leaving the page.
    return () => {
      if (gameOver) {
        resetGame();
      }
    };
  }, [gameOver, resetGame]);

  const handleResign = () => {
    setIsResignConfirmOpen(false);
    resign();
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
        <div className="flex items-center gap-4">
            <div className="hidden sm:block">
                <Link href="/dashboard/wallet">
                    <Card className="bg-card/50 border-primary/20 hover:bg-primary/5 transition-colors">
                        <CardContent className="p-2 flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-primary"/>
                            <div>
                            {userData?.balance !== undefined ? (
                                <>
                                 <p className="text-sm font-bold text-primary">LKR {userData.balance.toFixed(2)}</p>
                                 <p className="text-xs text-muted-foreground">~{(userData.balance / USDT_RATE).toFixed(2)} USDT</p>
                                </>
                            ) : (
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-16"/>
                                    <Skeleton className="h-3 w-12"/>
                                </div>
                            )}
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
            <Button variant="ghost" size="icon"><Bell /></Button>
            <Button variant="ghost" size="icon"><Settings /></Button>
            <Avatar>
                <AvatarImage src="https://placehold.co/40x40.png" data-ai-hint="avatar" />
                <AvatarFallback>{userData ? `${userData.firstName.charAt(0)}${userData.lastName.charAt(0)}` : '...'}</AvatarFallback>
            </Avatar>
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
            {gameOver ? (
                <GameOverDisplay />
            ) : (
                <>
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
                </>
            )}

            <div className="lg:hidden w-full space-y-4 mt-4">
                 {isMultiplayer ? (
                    <>
                        <CapturedPieces pieceStyle={equipment?.pieceStyle} />
                        <Card>
                            <CardContent className="p-4">
                                <Button variant="destructive" className="w-full" onClick={() => setIsResignConfirmOpen(true)} disabled={gameOver}>
                                    <Flag className="w-4 h-4 mr-2" />
                                    Resign
                                </Button>
                            </CardContent>
                        </Card>
                    </>
                 ) : (
                    <GameInfo />
                 )}
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
                        <Button variant="destructive" className="w-full" onClick={() => setIsResignConfirmOpen(true)} disabled={gameOver}>
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
    
    <AlertDialog open={isResignConfirmOpen} onOpenChange={setIsResignConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to resign?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                    <div>
                        {isMultiplayer && roomWager > 0 ? (
                            <div className="space-y-2 text-left pt-4">
                                <div>Resigning will forfeit the match.</div>
                                <ul className="list-disc pl-5 text-sm">
                                    <li><span className="font-bold text-destructive">You will receive a 75% refund</span> of your wager (LKR {(roomWager * 0.75).toFixed(2)}).</li>
                                    <li><span className="font-bold text-green-500">Your opponent will receive a 105% payout</span> of their wager (LKR {(roomWager * 1.05).toFixed(2)}).</li>
                                </ul>
                            </div>
                        ) : (
                            <div>This is a practice match, so no funds will be lost.</div>
                        )}
                    </div>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResign}>Confirm Resignation</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
