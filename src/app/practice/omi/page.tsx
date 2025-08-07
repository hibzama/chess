
'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useOmiGame, OmiGameProvider } from '@/hooks/use-omi-game';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowLeft, Spade, Heart, Diamond, Club, Repeat, Trophy } from 'lucide-react';
import Link from 'next/link';

const suitIcons = {
    s: <Spade className="w-full h-full fill-current" />,
    h: <Heart className="w-full h-full fill-current text-red-500" />,
    d: <Diamond className="w-full h-full fill-current text-red-500" />,
    c: <Club className="w-full h-full fill-current" />,
};

const PlayingCard = ({ card, onPlay, isPlayable, isCurrentUser }) => {
    const [suit, rank] = card.split('');
    const Icon = suitIcons[suit];

    return (
        <motion.div
            layoutId={card}
            onClick={() => isPlayable && onPlay(card)}
            className={cn(
                "w-20 h-28 bg-card rounded-lg shadow-md flex flex-col justify-between p-2 border-2 border-border relative transition-all duration-300",
                isCurrentUser && "cursor-pointer",
                isPlayable ? "hover:border-primary hover:-translate-y-2 hover:shadow-primary/30" : (isCurrentUser && "cursor-not-allowed opacity-60")
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
        >
            <div className="flex items-start justify-start">
                <span className="text-xl font-bold">{rank.toUpperCase()}</span>
                <div className="w-5 h-5 ml-1">{Icon}</div>
            </div>
            <div className="flex items-center justify-center">
                <div className="w-8 h-8">{Icon}</div>
            </div>
            <div className="flex items-end justify-end rotate-180">
                <span className="text-xl font-bold">{rank.toUpperCase()}</span>
                <div className="w-5 h-5 ml-1">{Icon}</div>
            </div>
        </motion.div>
    );
};

const PlayerDisplay = ({ player, position, isCurrent, isDealer }) => {
    return (
        <div className={cn("absolute flex flex-col items-center", position)}>
             <AnimatePresence>
                {isCurrent && (
                     <motion.div
                        className="px-2 py-1 bg-primary text-primary-foreground rounded-full text-xs mb-1"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                     >
                        Thinking...
                     </motion.div>
                )}
            </AnimatePresence>
            <div className={cn("p-2 bg-card/80 backdrop-blur-sm rounded-lg shadow-lg border-2", isCurrent ? 'border-primary' : 'border-transparent')}>
                <div className="text-center font-semibold text-sm">{player.name}</div>
                {isDealer && <div className="text-xs text-center text-primary">(Dealer)</div>}
            </div>
        </div>
    );
};

const TrickArea = ({ trick, leadSuit }) => {
    const positions = ['bottom-0 left-1/2 -translate-x-1/2', 'left-0 top-1/2 -translate-y-1/2', 'top-0 left-1/2 -translate-x-1/2', 'right-0 top-1/2 -translate-y-1/2'];
    return (
        <div className="relative w-72 h-48">
            <AnimatePresence>
                {trick.map((play, index) => (
                    <motion.div
                        key={play.player}
                        layoutId={play.card}
                        className={cn("absolute", positions[play.player])}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                    >
                         <PlayingCard card={play.card} onPlay={() => {}} isPlayable={false} isCurrentUser={false} />
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
        <div className="flex flex-col h-full w-full items-center justify-between p-4 bg-background/50 rounded-lg">
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

            {/* Top Player (Partner) */}
            <div className="relative w-full flex justify-center">
                 <PlayerDisplay player={players[2]} position="top-0" isCurrent={currentPlayerIndex === 2} isDealer={dealerIndex === 2}/>
                 <div className="flex gap-2 justify-center">
                    {players[2].hand.map((_, i) => <div key={i} className="w-10 h-16 bg-card rounded border-2 border-border shadow-md" />)}
                 </div>
            </div>

            <div className="flex w-full justify-between items-center my-4">
                {/* Left Player */}
                <div className="relative h-full flex items-center">
                    <PlayerDisplay player={players[1]} position="left-0" isCurrent={currentPlayerIndex === 1} isDealer={dealerIndex === 1}/>
                    <div className="flex flex-col gap-2">
                        {players[1].hand.map((_, i) => <div key={i} className="w-16 h-10 bg-card rounded border-2 border-border shadow-md" />)}
                    </div>
                </div>

                {/* Trick Area & Score */}
                <div className="flex flex-col items-center gap-4">
                    <TrickArea trick={trick} leadSuit={leadSuit} />
                    <Card>
                        <CardHeader className="p-2">
                             <CardTitle className="text-sm text-center">Tricks Won</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 flex gap-4 text-center">
                            <div>
                                <div className="font-bold text-lg">{scores.tricks1}</div>
                                <div className="text-xs">You/Partner</div>
                            </div>
                            <div>
                                <div className="font-bold text-lg">{scores.tricks2}</div>
                                <div className="text-xs">Opponents</div>
                            </div>
                        </CardContent>
                    </Card>
                    {trumpSuit && (
                         <div className="flex items-center gap-2">
                            <span className="text-sm">Trump:</span>
                            <div className="w-6 h-6">{suitIcons[trumpSuit]}</div>
                        </div>
                    )}
                </div>

                {/* Right Player */}
                <div className="relative h-full flex items-center">
                    <PlayerDisplay player={players[3]} position="right-0" isCurrent={currentPlayerIndex === 3} isDealer={dealerIndex === 3}/>
                    <div className="flex flex-col gap-2">
                        {players[3].hand.map((_, i) => <div key={i} className="w-16 h-10 bg-card rounded border-2 border-border shadow-md" />)}
                    </div>
                </div>
            </div>

            {/* User Player */}
            <div className="relative w-full flex justify-center">
                 <PlayerDisplay player={players[0]} position="bottom-0" isCurrent={currentPlayerIndex === 0} isDealer={dealerIndex === 0}/>
                <div className="flex gap-2 justify-center">
                     <AnimatePresence>
                        {userPlayer.hand.map(card => (
                            <PlayingCard key={card} card={card} onPlay={handlePlayCard} isPlayable={playableCards.has(card)} isCurrentUser={true} />
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default function OmiPage() {
    return (
        <OmiGameProvider>
            <div className="w-full max-w-7xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
                <div className="w-full max-w-5xl mb-4 self-center">
                    <Link href="/practice" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Practice Arena</span>
                    </Link>
                </div>
                 <OmiGameUI />
            </div>
        </OmiGameProvider>
    );
}
