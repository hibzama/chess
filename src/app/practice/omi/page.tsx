
'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useOmiGame, OmiGameProvider } from '@/hooks/use-omi-game';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowLeft, Spade, Heart, Diamond, Club, Repeat, Trophy, Crown } from 'lucide-react';
import Link from 'next/link';

const suitIcons = {
    s: <Spade className="w-full h-full fill-current text-foreground" />,
    h: <Heart className="w-full h-full fill-current text-red-500" />,
    d: <Diamond className="w-full h-full fill-current text-red-500" />,
    c: <Club className="w-full h-full fill-current text-foreground" />,
};

const PlayingCard = ({ card, onPlay, isPlayable, isCurrentUser, style = {}, layoutId }) => {
    const [suit, rank] = card.split('');
    const Icon = suitIcons[suit];

    return (
        <motion.div
            layoutId={layoutId}
            onClick={() => isPlayable && onPlay(card)}
            className={cn(
                "w-24 h-36 bg-card rounded-xl shadow-lg flex flex-col justify-between p-2 border-2 border-border relative transition-all duration-300",
                isCurrentUser && "cursor-pointer",
                isPlayable ? "hover:border-primary hover:-translate-y-4 hover:shadow-primary/30" : (isCurrentUser && "cursor-not-allowed opacity-70")
            )}
            style={style}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
            <div className="flex items-start justify-start">
                <span className="text-2xl font-bold">{rank.toUpperCase()}</span>
                <div className="w-5 h-5 ml-1">{Icon}</div>
            </div>
            <div className="flex items-center justify-center">
                <div className="w-10 h-10">{Icon}</div>
            </div>
            <div className="flex items-end justify-end rotate-180">
                <span className="text-2xl font-bold">{rank.toUpperCase()}</span>
                <div className="w-5 h-5 ml-1">{Icon}</div>
            </div>
        </motion.div>
    );
};


const PlayerDisplay = ({ player, position, isCurrent, isDealer, handSize }) => {
    return (
        <div className={cn("absolute flex flex-col items-center gap-2", position)}>
            <div className="flex items-center gap-2">
                 <div className="relative">
                     <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center font-bold text-xl shadow-inner">{player.name.charAt(0)}</div>
                     {handSize > 0 && <div className="absolute -top-1 -right-1 text-xs font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">{handSize}</div>}
                 </div>
                 <div className="flex flex-col items-start">
                    <div className="text-center font-semibold text-sm text-white bg-black/30 rounded-md px-2 py-1">{player.name}</div>
                    <div className="flex gap-1 mt-1">
                        {isDealer && <div className="text-xs bg-yellow-400 text-black rounded-full px-2 py-0.5">Dealer</div>}
                        {isCurrent && <div className="text-xs bg-green-400 text-black rounded-full px-2 py-0.5 animate-pulse">Playing...</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const TrickArea = ({ trick }) => {
    const trickPositions = [
        { bottom: 'calc(50% - 4.5rem)', left: '50%', transform: 'translateX(-50%) rotate(0deg)' }, // Player 0 (You)
        { left: 'calc(50% - 9rem)', top: '50%', transform: 'translateY(-50%) rotate(90deg)' }, // Player 1 (Left)
        { top: 'calc(50% - 4.5rem)', left: '50%', transform: 'translateX(-50%) rotate(180deg)' }, // Player 2 (Partner)
        { right: 'calc(50% - 9rem)', top: '50%', transform: 'translateY(-50%) rotate(-90deg)' }, // Player 3 (Right)
    ];

    return (
        <div className="relative w-full h-full">
            <AnimatePresence>
                {trick.map((play) => (
                    <motion.div
                        key={play.player}
                        layoutId={`trick-${play.card}`}
                        className="absolute"
                        style={trickPositions[play.player]}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                    >
                         <PlayingCard card={play.card} onPlay={() => {}} isPlayable={false} isCurrentUser={false} layoutId={null} />
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
                    <Button key={suit} variant="outline" className="h-20" onClick={() => onSelectTrump(suit)}>
                        <div className="w-8 h-8">{icon}</div>
                    </Button>
                ))}
            </div>
            <Button variant="destructive" onClick={onPass}>Pass</Button>
        </DialogContent>
    </Dialog>
);

const GameHeader = ({ scores, trumpSuit }) => (
    <div className="w-full max-w-lg mx-auto p-2 bg-black/30 rounded-full flex items-center justify-between text-white shadow-lg">
        <div className="text-center">
            <div className="font-bold text-2xl">{scores.team1}</div>
            <div className="text-xs">Your Team</div>
        </div>
        <div className="flex flex-col items-center">
             <div className="font-bold text-lg">Tricks</div>
             <div className="flex gap-4">
                <span className="text-xl">{scores.tricks1}</span>
                <div className="w-8 h-8 p-1 bg-card rounded-full">{trumpSuit ? suitIcons[trumpSuit] : '?'}</div>
                <span className="text-xl">{scores.tricks2}</span>
             </div>
        </div>
        <div className="text-center">
             <div className="font-bold text-2xl">{scores.team2}</div>
             <div className="text-xs">Opponents</div>
        </div>
    </div>
);


const OmiGameUI = () => {
    const { gameState, actions } = useOmiGame();

    if (!gameState) return <div className="text-center">Loading game...</div>;
    
    const { phase, players, trick, scores, trumpSuit, leadSuit, currentPlayerIndex, dealerIndex } = gameState;
    const { handlePlayCard, handleSelectTrump, handlePass } = actions;
    
    const userPlayer = players[0];
    const isUserTurn = currentPlayerIndex === 0;

    const getPlayableCards = () => {
        if (!isUserTurn) return new Set();
        const hand = userPlayer.hand;
        const hasLeadSuit = hand.some(card => card.startsWith(leadSuit));
        if (!leadSuit || !hasLeadSuit) return new Set(hand);
        return new Set(hand.filter(card => card.startsWith(leadSuit)));
    };

    const playableCards = getPlayableCards();
    
    return (
        <div className="flex flex-col h-full w-full items-center justify-between p-4 bg-green-800 bg-opacity-50 overflow-hidden">
            {phase === 'trumping' && isUserTurn && (
                <TrumpSelector onSelectTrump={handleSelectTrump} onPass={handlePass} />
            )}
             {phase === 'finished' && (
                <Dialog open={true}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center justify-center gap-2"><Trophy className="text-yellow-400"/> Game Over!</DialogTitle>
                            <DialogDescription className="text-center text-lg">
                                {scores.team1 > scores.team2 ? "Your Team Wins!" : "Bot Team Wins!"}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="text-center text-4xl font-bold">
                            {scores.team1} - {scores.team2}
                        </div>
                        <Button onClick={actions.handleNewGame}><Repeat className="mr-2" /> Play Again</Button>
                    </DialogContent>
                </Dialog>
            )}

            {/* Header */}
            <GameHeader scores={scores} trumpSuit={trumpSuit} />

            {/* Players & Table */}
            <div className="relative flex-1 w-full flex items-center justify-center my-4">
                 {/* Table */}
                <div className="absolute w-[450px] h-[300px] bg-yellow-800 rounded-3xl border-4 border-yellow-900 shadow-2xl">
                     <TrickArea trick={trick} />
                </div>
                 {/* Bots */}
                <PlayerDisplay player={players[2]} position="top-4 left-1/2 -translate-x-1/2" isCurrent={currentPlayerIndex === 2} isDealer={dealerIndex === 2} handSize={players[2].hand.length} />
                <PlayerDisplay player={players[1]} position="left-4 top-1/2 -translate-y-1/2" isCurrent={currentPlayerIndex === 1} isDealer={dealerIndex === 1} handSize={players[1].hand.length} />
                <PlayerDisplay player={players[3]} position="right-4 top-1/2 -translate-y-1/2" isCurrent={currentPlayerIndex === 3} isDealer={dealerIndex === 3} handSize={players[3].hand.length} />
            </div>


            {/* User Player Hand */}
            <div className="relative w-full h-48 flex justify-center items-end">
                 <PlayerDisplay player={players[0]} position="bottom-[10rem] left-1/2 -translate-x-1/2" isCurrent={currentPlayerIndex === 0} isDealer={dealerIndex === 0} handSize={0} />
                 <div className="relative w-full h-48 flex justify-center items-end">
                    {userPlayer.hand.map((card, i) => {
                        const handSize = userPlayer.hand.length;
                        const anglePerCard = Math.min(10, 80 / handSize);
                        const totalAngle = (handSize - 1) * anglePerCard;
                        const rotation = (i * anglePerCard) - (totalAngle / 2);
                        
                        return (
                            <div
                                key={card}
                                className="absolute bottom-0"
                                style={{
                                    transform: `rotate(${rotation}deg)`,
                                    transformOrigin: `50% 25rem`, // Pivot from a point far below the cards
                                    zIndex: i,
                                }}
                            >
                                <PlayingCard
                                    card={card}
                                    onPlay={handlePlayCard}
                                    isPlayable={playableCards.has(card)}
                                    isCurrentUser={true}
                                    layoutId={`trick-${card}`}
                                />
                             </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

export default function OmiPage() {
    return (
        <OmiGameProvider>
            <div className="w-full max-w-lg mx-auto flex flex-col h-[calc(100vh-2rem)] bg-green-900 rounded-2xl shadow-2xl border-4 border-black">
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
