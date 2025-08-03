

'use client'

import Link from 'next/link';
import { ArrowLeft, History, Users, Settings, Crown, Flag, Wallet, Bell, Trophy, Frown, Handshake, Sword, MessageSquare } from 'lucide-react';
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
import GameChat from './game-chat';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import Image from 'next/image';


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

        const isWinner = (winner === 'p1' && !isMultiplayer) || (isMultiplayer && user?.uid === room?.winner?.uid);
        const isLoser = (winner === 'p2' && !isMultiplayer) || (isMultiplayer && user?.uid !== room?.winner?.uid && !room?.draw);

        if (gameOverReason === 'resign') {
             const wasITheResigner = user?.uid === room?.winner?.resignerId;
             if (wasITheResigner) {
                title = "You Resigned";
                description = "You chose to resign the match.";
                icon = <Flag className="w-12 h-12 text-muted-foreground" />;
             } else {
                title = "Congratulations, You Win!";
                description = "Your opponent has resigned the game.";
                icon = <Trophy className="w-12 h-12 text-yellow-400" />;
             }
        } else if (isWinner) {
            title = "Congratulations, You Win!";
            icon = <Trophy className="w-12 h-12 text-yellow-400" />;
            switch (gameOverReason) {
                case 'checkmate': description = "You won by checkmate. Well played!"; break;
                case 'timeout': description = "You won on time as your opponent ran out."; break;
                case 'piece-capture': description = "You captured all your opponent's pieces!"; break;
                default: description = "You have won the game!";
            }
        } else if (isLoser) {
            title = "Bad Luck, You Lost";
            icon = <Frown className="w-12 h-12 text-destructive" />;
            switch (gameOverReason) {
                case 'checkmate': description = "Your opponent has checkmated you."; break;
                case 'timeout': description = "You lost because you ran out of time."; break;
                case 'piece-capture': description = "Your opponent captured all your pieces."; break;
                default: description = "You have lost the game.";
            }
        } else if (room?.draw || winner === 'draw') {
            title = "It's a Draw!";
            description = "The game has ended in a draw by agreement or stalemate.";
            icon = <Handshake className="w-12 h-12 text-yellow-400" />;
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

const ResignationDialogContent = ({ roomWager, pieceCount }: { roomWager: number, pieceCount: number }) => {
    
    let refundRate = 0;
    if (pieceCount >= 6) refundRate = 0.50;
    else if (pieceCount >= 3) refundRate = 0.35;
    else refundRate = 0.25;

    const refundAmount = roomWager * refundRate;
    const opponentPayout = roomWager * 1.30;

    return (
        <div className="space-y-2 text-left pt-4">
            <div>Resigning will forfeit the match.</div>
            <ul className="list-disc pl-5 text-sm">
                <li><span className="font-bold text-destructive">You will receive a {refundRate * 100}% refund</span> of your wager (LKR {refundAmount.toFixed(2)}).</li>
                <li><span className="font-bold text-green-500">Your opponent will receive a 130% payout</span> of their wager (LKR {opponentPayout.toFixed(2)}).</li>
            </ul>
        </div>
    )
}

export default function GameLayout({ children, gameType, headerContent }: GameLayoutProps) {
  const { isMultiplayer, p1Time, p2Time, gameOver, resign, playerColor, currentPlayer, isMounted, roomWager, resetGame, room, playerPieceCount } = useGame();
  const { user, userData } = useAuth();
  const router = useRouter();
  const [isResignConfirmOpen, setIsResignConfirmOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const equipment = gameType === 'Chess' ? userData?.equipment?.chess : userData?.equipment?.checkers;

  const handleResign = () => {
    setIsResignConfirmOpen(false);
    resign();
  }

  const isP1Turn = isMounted && ((playerColor === 'w' && currentPlayer === 'w') || (playerColor === 'b' && currentPlayer === 'b'));
  const turnText = isP1Turn ? 'Your Turn' : "Opponent's Turn";
  
  const opponentData = isMultiplayer ? (room?.createdBy.uid === user?.uid ? room.player2 : room?.createdBy) : null;


  return (
    <>
    <div className="absolute inset-0 z-0">
        <Image
          src="https://allnews.ltd/wp-content/uploads/2025/07/beautiful-gradient-background_52683-82960.avif"
          alt="background"
          fill
          className="object-cover opacity-30"
          data-ai-hint="gradient abstract"
        />
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
    </div>
    <main className="relative z-10 flex-1 w-full grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] xl:grid-cols-[340px_auto_340px] gap-6 p-4 md:p-6 md:pb-8 pb-24">
        {/* Left Column */}
        <div className="hidden lg:grid grid-rows-[auto,1fr] gap-6">
            <PlayerInfo
              playerName={userData ? `${userData.firstName} (You)`: "Player 1 (You)"}
              avatarSrc={userData?.photoURL}
            />
             <MoveHistory />
        </div>

        {/* Center Column */}
        <div className="flex flex-col items-center justify-center min-h-0 gap-4">
            <div className="hidden md:block w-full">
             {headerContent}
            </div>
            {gameOver ? (
                <div className="flex items-center justify-center w-full h-full min-h-[50vh]">
                    <GameOverDisplay />
                </div>
            ) : (
                <>
                    <div className="w-full flex justify-between items-center px-2">
                        <div className={cn("p-2 rounded-lg text-center", !isP1Turn && "bg-primary")}>
                            <p className="font-semibold">{opponentData?.name ?? "Opponent"}</p>
                            {isMounted ? <p className="text-2xl font-bold">{formatTime(Math.ceil(p2Time))}</p> : <Skeleton className="h-8 w-24 mt-1"/>}
                        </div>
                        <div className={cn("p-2 rounded-lg text-center", isP1Turn && "bg-primary")}>
                            <p className="font-semibold">You</p>
                            {isMounted ? <p className="text-2xl font-bold">{formatTime(Math.ceil(p1Time))}</p> : <Skeleton className="h-8 w-24 mt-1"/>}
                        </div>
                    </div>
                    {children}
                    <div className="text-center font-semibold text-lg p-2 rounded-md bg-card border">
                        Current Turn: <span className="text-primary">{turnText}</span>
                    </div>
                </>
            )}

            <div className="lg:hidden w-full space-y-4 mt-4">
                <GameInfo />
                <CapturedPieces pieceStyle={equipment?.pieceStyle} />
                {isMultiplayer && (
                    <Card>
                        <CardContent className="p-4">
                            <Button variant="destructive" className="w-full" onClick={() => setIsResignConfirmOpen(true)} disabled={gameOver}>
                                <Flag className="w-4 h-4 mr-2" />
                                Resign
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>

        {/* Right Column */}
        <aside className="hidden lg:grid grid-rows-[auto,auto,auto,1fr] gap-6">
            <PlayerInfo
              playerName={opponentData?.name ?? "Opponent"}
              avatarSrc={opponentData?.photoURL}
            />
            <GameInfo />
            <CapturedPieces pieceStyle={equipment?.pieceStyle} />
             {isMultiplayer && (
                 <Card>
                    <CardContent className="p-4 space-y-2">
                         <Popover open={isChatOpen} onOpenChange={setIsChatOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full">
                                    <MessageSquare className="w-4 h-4 mr-2" /> Game Chat
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 h-96 p-0 flex flex-col">
                                <GameChat onClose={() => setIsChatOpen(false)} />
                            </PopoverContent>
                        </Popover>
                        <Button variant="destructive" className="w-full" onClick={() => setIsResignConfirmOpen(true)} disabled={gameOver}>
                            <Flag className="w-4 h-4 mr-2" />
                            Resign
                        </Button>
                    </CardContent>
                </Card>
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
                           <ResignationDialogContent roomWager={roomWager} pieceCount={playerPieceCount} />
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

     {isMultiplayer && !gameOver && (
         <Popover open={isChatOpen} onOpenChange={setIsChatOpen}>
            <PopoverTrigger asChild>
                <button className="fixed bottom-24 right-6 w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-lg hover:bg-primary/90 transition-transform hover:scale-105 z-40 lg:hidden">
                    <MessageSquare className="w-8 h-8"/>
                    <span className="sr-only">Open Chat</span>
                </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-80 h-96 p-0 flex flex-col mr-4 mb-2">
                 <GameChat onClose={() => setIsChatOpen(false)} />
            </PopoverContent>
         </Popover>
      )}
    </>
  );
}
