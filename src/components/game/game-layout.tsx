

'use client'

import Link from 'next/link';
import { ArrowLeft, History, Users, Settings, Crown, Flag, Wallet, Bell, Trophy, Frown, Handshake, Sword } from 'lucide-react';
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
    const { user } = useAuth();
    const { winner, gameOverReason, isMultiplayer, payoutAmount, room } = useGame();
    const router = useRouter();
    const USDT_RATE = 310;

    const handleReturn = () => {
        router.push('/dashboard');
    }

    const getWinnerMessage = () => {
        let title = "Game Over";
        let description = "The game has concluded.";
        let icon = <Crown className="w-12 h-12 text-primary" />;

        const playerResigned = room?.winner?.resignerId === user?.uid;
        
        if (playerResigned) {
            title = "You Resigned";
            description = "You chose to resign the match.";
            icon = <Flag className="w-12 h-12 text-muted-foreground" />;
        } else if (winner === 'draw') {
            title = "It's a Draw!";
            description = "The game has ended in a draw by agreement or stalemate.";
            icon = <Handshake className="w-12 h-12 text-yellow-400" />;
        } else if (winner === 'p1') {
            title = "Congratulations, You Win!";
            icon = <Trophy className="w-12 h-12 text-yellow-400" />;
            switch (gameOverReason) {
                case 'checkmate': description = isMultiplayer ? "You won by checkmate. Well played!" : "You checkmated the bot. Well played!"; break;
                case 'timeout': description = isMultiplayer ? "You won on time as your opponent ran out." : "The bot ran out of time."; break;
                case 'resign': description = isMultiplayer ? "Your opponent has resigned the game." : "The bot has resigned."; break;
                case 'piece-capture': description = isMultiplayer ? "You captured all your opponent's pieces!" : "You captured all the bot's pieces!"; break;
                default: description = "You have won the game!";
            }
        } else {
            title = "Bad Luck, You Lost";
            icon = <Frown className="w-12 h-12 text-destructive" />;
             switch (gameOverReason) {
                case 'checkmate': description = isMultiplayer ? "Your opponent has checkmated you." : "The bot has checkmated you."; break;
                case 'timeout': description = isMultiplayer ? "You lost because you ran out of time." : "You ran out of time."; break;
                case 'resign': description = isMultiplayer ? "You have resigned the game." : "You have resigned the game against the bot."; break;
                case 'piece-capture': description = isMultiplayer ? "Your opponent captured all your pieces." : "The bot captured all your pieces."; break;
                default: description = "You have lost the game.";
            }
        }
        return { title, description, icon };
    }

    const { title, description, icon } = getWinnerMessage();

    return (
        <Card className="w-full max-w-lg text-center p-8 bg-card/70 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <CardHeader className="items-center">
                 <div className="p-4 rounded-full bg-primary/10 mb-2">
                    {icon}
                </div>
                <CardTitle className="text-2xl">{title}</CardTitle>
                <CardDescription>
                   {description}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isMultiplayer && payoutAmount !== null && payoutAmount >= 0 && (
                     <div className="p-3 rounded-md bg-secondary text-secondary-foreground font-semibold flex items-center justify-center gap-2">
                        <Wallet className="w-5 h-5"/> 
                        <div>
                             <p>Wallet Return: LKR {payoutAmount.toFixed(2)}</p>
                             <p className="text-xs text-muted-foreground">~{(payoutAmount / USDT_RATE).toFixed(2)} USDT</p>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardContent>
                <Button className="w-full" onClick={handleReturn}>Return to Dashboard</Button>
            </CardContent>
        </Card>
    )
}

export default function GameLayout({ children, gameType, headerContent }: GameLayoutProps) {
  const { isMultiplayer, p1Time, p2Time, gameOver, resign, playerColor, currentPlayer, isMounted, roomWager, resetGame } = useGame();
  const { user, userData } = useAuth();
  const router = useRouter();
  const USDT_RATE = 310;
  const [isResignConfirmOpen, setIsResignConfirmOpen] = useState(false);
  
  const equipment = gameType === 'Chess' ? userData?.equipment?.chess : userData?.equipment?.checkers;

  const handleResign = () => {
    setIsResignConfirmOpen(false);
    resign();
  }

  const isP1Turn = isMounted && ((playerColor === 'w' && currentPlayer === 'w') || (playerColor === 'b' && currentPlayer === 'b'));
  const turnText = isP1Turn ? 'Your Turn' : "Opponent's Turn";
  
  return (
    <>
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
                <div className="flex items-center justify-center w-full h-full min-h-[50vh]">
                    <GameOverDisplay />
                </div>
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
