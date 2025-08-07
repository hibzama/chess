
'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useOmiGame, OmiGameProvider } from '@/hooks/use-omi-game';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowLeft, Spade, Heart, Diamond, Club, Repeat, Trophy } from 'lucide-react';
import Link from 'next/link';

const suitIcons: { [key: string]: React.ReactNode } = {
    s: <Spade className="w-full h-full fill-current text-foreground" />,
    h: <Heart className="w-full h-full fill-current text-red-500" />,
    d: <Diamond className="w-full h-full fill-current text-red-500" />,
    c: <Club className="w-full h-full fill-current text-foreground" />,
};

const suitColors = {
    s: 'text-foreground',
    h: 'text-red-500',
    d: 'text-red-500',
    c: 'text-foreground',
}

const CardPips = ({ rank, suit }: { rank: string, suit: string }) => {
    const numericRank = parseInt(rank, 10);
    const Icon = suitIcons[suit];

    if (isNaN(numericRank) || numericRank < 7 || numericRank > 9) { // A, K, Q, J, T
        return (
            <div className={cn("absolute inset-0 flex items-center justify-center", suitColors[suit])}>
                <span className="text-8xl font-bold opacity-10">{rank.toUpperCase()}</span>
            </div>
        );
    }
    
    // Specific layouts for 7, 8, 9
    const pipLayouts: { [key: number]: string[] } = {
        7: ['col-span-1 row-start-1', 'col-span-1 row-start-1', 'col-start-2 row-start-2', 'col-span-1 row-start-4', 'col-span-1 row-start-4', 'col-start-2 row-start-5', 'col-start-2 row-start-5'],
        8: ['col-span-1 row-start-1', 'col-span-1 row-start-1', 'col-start-2 row-start-2', 'col-start-2 row-start-2', 'col-span-1 row-start-5', 'col-span-1 row-start-5', 'col-start-2 row-start-4', 'col-start-2 row-start-4'],
        9: ['col-span-1 row-start-1', 'col-span-1 row-start-1', 'col-span-1 row-start-2', 'col-span-1 row-start-2', 'col-start-2 row-start-3', 'col-span-1 row-start-4', 'col-span-1 row-start-4', 'col-span-1 row-start-5', 'col-span-1 row-start-5'],
    };

    const gridClass = 'grid-cols-3 grid-rows-5';
    
    return (
        <div className={cn("absolute inset-y-8 inset-x-2 grid place-items-center", gridClass)}>
            {(pipLayouts[numericRank] || []).map((pos, i) => (
                <div key={i} className={cn("w-4 h-4", pos, suitColors[suit])}>{Icon}</div>
            ))}
        </div>
    )
}

const PlayingCard = ({ card, onPlay, isPlayable, isCurrentUser, style }: { card: string, onPlay?: (card: string) => void, isPlayable?: boolean, isCurrentUser?: boolean, style?: React.CSSProperties }) => {
    const [suit, rank] = card.split('');
    const Icon = suitIcons[suit];
    const colorClass = suitColors[suit];

    return (
        <motion.div
            layoutId={`card-${card}`}
            onClick={() => isPlayable && onPlay && onPlay(card)}
            className={cn(
                "w-24 h-36 bg-white rounded-lg shadow-md flex flex-col p-1 border-2 relative transition-all duration-300",
                isCurrentUser && "cursor-pointer",
                isPlayable ? "border-primary hover:-translate-y-4 hover:shadow-primary/30" : "border-black/20",
                !isPlayable && isCurrentUser && "cursor-not-allowed opacity-60"
            )}
            style={style}
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.5, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
             <div className={cn("absolute top-1 left-1 text-center font-bold", colorClass)}>
                <span>{rank.toUpperCase()}</span>
                <div className="w-4 h-4 mx-auto">{Icon}</div>
            </div>
            <CardPips rank={rank} suit={suit}/>
             <div className={cn("absolute bottom-1 right-1 text-center font-bold rotate-180", colorClass)}>
                <span>{rank.toUpperCase()}</span>
                <div className="w-4 h-4 mx-auto">{Icon}</div>
            </div>
        </motion.div>
    );
};

const PlayerDisplay = ({ player, position, isDealer }) => {
    return (
        <div className={cn("absolute flex flex-col items-center gap-2", position)}>
            <div className="relative">
                 <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center font-bold text-xl shadow-inner border-2 border-white/50">{player.name.charAt(0)}</div>
                {player.hand.length > 0 && 
                    <div className="absolute -top-2 -right-2 text-xs font-bold bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center border-2 border-background">
                        {player.hand.length}
                    </div>
                }
            </div>
            <div className="flex flex-col items-center">
                <div className="font-semibold text-sm text-white bg-black/50 rounded-md px-2 py-1 shadow-lg">{player.name}</div>
                 {isDealer && <div className="text-xs mt-1 bg-yellow-400 text-black rounded-full px-2 py-0.5 font-bold">Dealer</div>}
            </div>
        </div>
    );
};

const TrickArea = ({ trick }) => {
    const basePositions = [
        { bottom: '1rem', left: '50%', transform: 'translateX(-50%) rotate(0deg)' }, // Player 0 (You)
        { left: '1rem', top: '50%', transform: 'translateY(-50%) rotate(90deg)' }, // Player 1 (Left)
        { top: '1rem', left: '50%', transform: 'translateX(-50%) rotate(0deg)' }, // Player 2 (Partner)
        { right: '1rem', top: '50%', transform: 'translateY(-50%) rotate(-90deg)' }, // Player 3 (Right)
    ];

    return (
        <div className="relative w-full h-full">
            <AnimatePresence>
                {trick.map((play, index) => (
                    <motion.div
                        key={play.card}
                        layoutId={`card-${play.card}`}
                        className="absolute"
                        style={{ ...basePositions[play.player], zIndex: index }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                    >
                         <PlayingCard card={play.card} />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

const TrumpSelector = ({ onSelectTrump, onPass }) => (
    <Dialog open={true}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Call Trump or Pass?</DialogTitle>
                <DialogDescription>Based on your first 4 cards, select a trump suit or pass the turn.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
                {Object.entries(suitIcons).map(([suit, icon]) => (
                    <Button key={suit} variant="outline" className="h-20" onClick={() => onSelectTrump(suit as 's'|'h'|'d'|'c')}>
                        <div className="w-8 h-8">{icon}</div>
                    </Button>
                ))}
            </div>
            <Button variant="destructive" onClick={onPass}>Pass</Button>
        </DialogContent>
    </Dialog>
);

const GameHeader = ({ scores, trumpSuit }) => (
    <div className="w-full max-w-lg mx-auto p-2 bg-black/40 rounded-full flex items-center justify-between text-white shadow-lg backdrop-blur-sm">
        <div className="text-center px-4">
            <div className="font-bold text-2xl">{scores.team1}</div>
            <div className="text-xs opacity-80">Your Team</div>
        </div>
        <div className="flex flex-col items-center">
             <div className="font-bold text-sm">Tricks</div>
             <div className="flex gap-4 items-center">
                <span className="text-2xl font-bold">{scores.tricks1}</span>
                <div className="w-10 h-10 p-1.5 bg-card rounded-full shadow-inner">{trumpSuit ? suitIcons[trumpSuit] : '?'}</div>
                <span className="text-2xl font-bold">{scores.tricks2}</span>
             </div>
        </div>
        <div className="text-center px-4">
             <div className="font-bold text-2xl">{scores.team2}</div>
             <div className="text-xs opacity-80">Opponents</div>
        </div>
    </div>
);


const OmiGameUI = () => {
    const { gameState, actions } = useOmiGame();

    if (!gameState) return <div className="text-center text-white">Loading game...</div>;
    
    const { phase, players, trick, scores, trumpSuit, leadSuit, currentPlayerIndex, dealerIndex } = gameState;
    const { handlePlayCard, handleSelectTrump, handlePass } = actions;
    
    const userPlayer = players[0];
    const isUserTurn = currentPlayerIndex === 0;

    const getPlayableCards = () => {
        if (!isUserTurn) return new Set();
        const hand = userPlayer.hand;
        if (!leadSuit) return new Set(hand); // Can play any card if leading
        const hasLeadSuit = hand.some(card => card.startsWith(leadSuit as string));
        if (hasLeadSuit) {
            return new Set(hand.filter(card => card.startsWith(leadSuit as string)));
        }
        return new Set(hand); // Can play any card if no lead suit
    };

    const playableCards = getPlayableCards();
    
    return (
        <div className="flex flex-col h-full w-full items-center justify-between p-4 overflow-hidden">
            {phase === 'trumping' && isUserTurn && (
                <TrumpSelector onSelectTrump={handleSelectTrump} onPass={handlePass} />
            )}
             {phase === 'finished' && (
                <Dialog open={true}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center justify-center gap-2"><Trophy className="text-yellow-400"/> Game Over!</DialogTitle>
                            <DialogDescription className="text-center text-lg">
                                {scores.team1 >= 10 ? "Your Team Wins!" : "Bot Team Wins!"}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="text-center text-4xl font-bold">
                            {scores.team1} - {scores.team2}
                        </div>
                        <Button onClick={actions.handleNewGame}><Repeat className="mr-2" /> Play Again</Button>
                    </DialogContent>
                </Dialog>
            )}

            <GameHeader scores={scores} trumpSuit={trumpSuit} />

            <div className="relative flex-1 w-full flex items-center justify-center my-4">
                 <PlayerDisplay player={players[2]} position="top-0 left-1/2 -translate-x-1/2" isDealer={dealerIndex === 2} />
                 <PlayerDisplay player={players[1]} position="left-0 top-1/2 -translate-y-1/2" isDealer={dealerIndex === 1} />
                 <PlayerDisplay player={players[3]} position="right-0 top-1/2 -translate-y-1/2" isDealer={dealerIndex === 3} />

                 <div className="absolute w-[450px] h-[300px] bg-green-800/80 rounded-3xl border-8 border-yellow-900 shadow-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <TrickArea trick={trick} />
                </div>
                 {isUserTurn && <div className="absolute -bottom-8 text-xs bg-green-400 text-black rounded-full px-3 py-1 font-bold animate-pulse shadow-lg">Your Turn...</div>}
            </div>

            <div className="relative w-full h-48 flex justify-center items-end">
                <PlayerDisplay player={players[0]} position="bottom-44 left-1/2 -translate-x-1/2" isDealer={dealerIndex === 0} />
                <div className="relative w-full h-48 flex justify-center items-center -bottom-8">
                     <AnimatePresence>
                        {userPlayer.hand.map((card, i) => {
                             const handSize = userPlayer.hand.length;
                             const isEven = handSize % 2 === 0;
                             const midIndex = Math.floor(handSize / 2);
                             const position = i - midIndex;
                             const xOffset = isEven ? (position + 0.5) * 35 : position * 35;
                             const rotation = isEven ? (position + 0.5) * 5 : position * 5;
                            
                            return (
                                <div
                                    key={card}
                                    className="absolute origin-bottom"
                                    style={{
                                        left: '50%',
                                        transform: `translateX(${xOffset}px) rotate(${rotation}deg)`,
                                        zIndex: i,
                                    }}
                                >
                                    <PlayingCard
                                        card={card}
                                        onPlay={handlePlayCard}
                                        isPlayable={playableCards.has(card)}
                                        isCurrentUser={true}
                                    />
                                </div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default function OmiPage() {
    return (
        <OmiGameProvider>
            <div className="w-full max-w-lg mx-auto flex flex-col h-[calc(100vh-2rem)] bg-purple-900 rounded-2xl shadow-2xl border-4 border-black bg-[url('https://www.transparenttextures.com/patterns/brick-wall.png')]">
                <div className="p-2">
                    <Link href="/practice" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Exit Game</span>
                    </Link>
                </div>
                 <OmiGameUI />
            </div>
        </OmiGameProvider>
    );
}
