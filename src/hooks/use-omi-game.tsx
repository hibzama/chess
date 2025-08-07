
'use client';
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

// Types
type Suit = 's' | 'h' | 'd' | 'c';
type Rank = 'a' | 'k' | 'q' | 'j' | 't' | '9' | '8' | '7';
type Card = `${Suit}${Rank}`;
type Player = { id: number; name: string; hand: Card[]; isBot: boolean };
type Trick = { player: number; card: Card }[];
type Scores = { team1: number; team2: number; tricks1: number; tricks2: number };
type GamePhase = 'dealing' | 'trumping' | 'playing' | 'scoring' | 'finished';

interface OmiGameState {
    phase: GamePhase;
    players: Player[];
    deck: Card[];
    trick: Trick;
    trumpSuit: Suit | null;
    leadSuit: Suit | null;
    currentPlayerIndex: number;
    dealerIndex: number;
    trumpCaller: number | null;
    scores: Scores;
}

const SUITS: Suit[] = ['s', 'h', 'd', 'c'];
const RANKS: Rank[] = ['a', 'k', 'q', 'j', 't', '9', '8', '7'];
const RANK_VALUE: Record<Rank, number> = { 'a': 8, 'k': 7, 'q': 6, 'j': 5, 't': 4, '9': 3, '8': 2, '7': 1 };

const createDeck = (): Card[] => {
    const cards: Card[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            cards.push(`${suit}${rank}`);
        }
    }
    return cards;
};

const shuffleDeck = (deck: Card[]): Card[] => {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

const useOmiGameLogic = () => {
    const [gameState, setGameState] = useState<OmiGameState | null>(null);

    const initializeGame = useCallback((dealerIdx = Math.floor(Math.random() * 4), scores: {team1: number, team2: number} = { team1: 0, team2: 0 }) => {
        const players: Player[] = [
            { id: 0, name: 'You', hand: [], isBot: false },
            { id: 1, name: 'Bot 1', hand: [], isBot: true },
            { id: 2, name: 'Partner', hand: [], isBot: true },
            { id: 3, name: 'Bot 2', hand: [], isBot: true },
        ];
        
        setGameState({
            phase: 'dealing',
            players,
            deck: shuffleDeck(createDeck()),
            trick: [],
            trumpSuit: null,
            leadSuit: null,
            currentPlayerIndex: (dealerIdx + 1) % 4,
            dealerIndex: dealerIdx,
            trumpCaller: null,
            scores: { ...scores, tricks1: 0, tricks2: 0 },
        });
    }, []);

    useEffect(() => {
        if (!gameState) {
            initializeGame();
        }
    }, [initializeGame, gameState]);

    const handleNewGame = useCallback(() => {
        initializeGame();
    }, [initializeGame]);

    const getPlayableCardsForPlayer = (hand: Card[], leadSuit: Suit | null): Card[] => {
        if (!leadSuit) return hand;
        const hasLeadSuit = hand.some(card => card.startsWith(leadSuit));
        if (hasLeadSuit) {
            return hand.filter(card => card.startsWith(leadSuit));
        }
        return hand; // Can play any card
    };
    
    const getBotMove = useCallback((player: Player, currentTrick: Trick, leadSuit: Suit | null, trumpSuit: Suit | null): Card => {
        const playableCards = getPlayableCardsForPlayer(player.hand, leadSuit);
        // This is a very basic bot logic. A more advanced bot would be needed for a real challenge.
        return playableCards[0];
    }, []);

    const endTrick = useCallback(() => {
        setGameState(currentState => {
            if (!currentState || currentState.trick.length !== 4) return currentState;

            const { trick, trumpSuit } = currentState;
            let winningPlay = trick[0];
            const leadSuitOfTrick = trick[0].card[0] as Suit;

            for (let i = 1; i < trick.length; i++) {
                const currentPlay = trick[i];
                const winningSuit = winningPlay.card[0] as Suit;
                const currentSuit = currentPlay.card[0] as Suit;
                const winningRank = RANK_VALUE[winningPlay.card[1] as Rank];
                const currentRank = RANK_VALUE[currentPlay.card[1] as Rank];

                if (winningSuit === trumpSuit) {
                    if (currentSuit === trumpSuit && currentRank > winningRank) {
                        winningPlay = currentPlay;
                    }
                } else {
                    if (currentSuit === trumpSuit) {
                        winningPlay = currentPlay;
                    } else if (currentSuit === leadSuitOfTrick && currentRank > winningRank) {
                        winningPlay = currentPlay;
                    }
                }
            }

            const winnerId = winningPlay.player;
            const newScores = { ...currentState.scores };
            if (winnerId === 0 || winnerId === 2) {
                newScores.tricks1++;
            } else {
                newScores.tricks2++;
            }

            let nextPhase: GamePhase = 'playing';
            if (currentState.players[0].hand.length === 0) {
                nextPhase = 'scoring';
            }
            
            setTimeout(() => {
                setGameState(gs => {
                    if (!gs) return null;
                    const finalState = { ...gs, trick: [], currentPlayerIndex: winnerId, leadSuit: null, phase: nextPhase, scores: newScores };
                    
                    if (finalState.phase === 'scoring') {
                        const { trumpCaller, scores } = finalState;
                        const newOverallScores = { team1: scores.team1, team2: scores.team2 };
                        
                        if(trumpCaller === null) {
                            initializeGame((finalState.dealerIndex + 1) % 4, newOverallScores);
                            return null;
                        }
                        
                        const callingTeamIs1 = trumpCaller === 0 || trumpCaller === 2;
                        
                        if (callingTeamIs1) {
                            if (scores.tricks1 >= 5) newOverallScores.team1++;
                            else newOverallScores.team2 += 2; // Kapothi
                        } else {
                            if (scores.tricks2 >= 5) newOverallScores.team2++;
                            else newOverallScores.team1 += 2; // Kapothi
                        }
                        
                        if (newOverallScores.team1 >= 10 || newOverallScores.team2 >= 10) {
                            return { ...finalState, scores: newOverallScores, phase: 'finished' };
                        } else {
                            const newDealer = (finalState.dealerIndex + 1) % 4;
                            initializeGame(newDealer, newOverallScores);
                            return null;
                        }
                    }
                    
                    return finalState;
                });
            }, 1500);

            // This state update is to show who won before clearing
            return { ...currentState, scores: newScores, currentPlayerIndex: winnerId, leadSuit: null };
        });
    }, [initializeGame]);

    useEffect(() => {
        if (!gameState) return;
        const { phase, players, currentPlayerIndex, trick, leadSuit, trumpSuit, dealerIndex } = gameState;

        if (phase === 'dealing') {
            const { deck } = gameState;
            const newPlayers = JSON.parse(JSON.stringify(players));
            const newDeck = [...deck];
            for (let i = 0; i < 4; i++) {
                for (let p = 0; p < 4; p++) {
                    newPlayers[p].hand.push(newDeck.pop()!);
                }
            }
            setGameState(gs => ({ ...gs!, phase: 'trumping', players: newPlayers, deck: newDeck }));
            return;
        }

        if (phase === 'playing' && trick.length === 4) {
            endTrick();
            return;
        }

        if (players[currentPlayerIndex]?.isBot) {
            const timeout = setTimeout(() => {
                if (phase === 'trumping') {
                    // Bot trumping logic
                    const botPlayer = players[currentPlayerIndex];
                    // Very basic: just pass for now
                    handlePass();
                } else if (phase === 'playing') {
                    const botPlayer = players[currentPlayerIndex];
                    const cardToPlay = getBotMove(botPlayer, trick, leadSuit, trumpSuit);
                    handlePlayCard(cardToPlay);
                }
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [gameState?.phase, gameState?.trick.length, gameState?.currentPlayerIndex, endTrick, getBotMove]);

    const handleSelectTrump = (suit: Suit) => {
        setGameState(gs => {
            if (!gs || gs.phase !== 'trumping') return gs;
            const newDeck = [...gs.deck];
            const newPlayers = JSON.parse(JSON.stringify(gs.players));
            for(let i=0; i < 4; i++) {
                for(let p=0; p < 4; p++) {
                    if (newDeck.length > 0) {
                        newPlayers[p].hand.push(newDeck.pop()!);
                    }
                }
            }
            return { ...gs, phase: 'playing', trumpSuit: suit, trumpCaller: gs.currentPlayerIndex, players: newPlayers, deck: newDeck };
        });
    };

    const handlePass = () => {
        setGameState(gs => {
            if (!gs || gs.phase !== 'trumping') return gs;
            const nextPlayer = (gs.currentPlayerIndex + 1) % 4;
            if (nextPlayer === (gs.dealerIndex + 1) % 4) {
                // All players passed, redeal
                initializeGame((gs.dealerIndex + 1) % 4, {team1: gs.scores.team1, team2: gs.scores.team2});
                return null;
            }
            return { ...gs, currentPlayerIndex: nextPlayer };
        });
    };
    
    const handlePlayCard = (card: Card) => {
        setGameState(gs => {
            if (!gs || gs.phase !== 'playing' || gs.trick.length === 4) return gs;
            
            const player = gs.players[gs.currentPlayerIndex];
            const newHand = player.hand.filter(c => c !== card);
            const newPlayers = [...gs.players];
            newPlayers[gs.currentPlayerIndex] = { ...player, hand: newHand };

            const newTrick = [...gs.trick, { player: gs.currentPlayerIndex, card }];
            let newLeadSuit = gs.leadSuit;
            if (newTrick.length === 1) {
                newLeadSuit = card[0] as Suit;
            }
            
            return { 
                ...gs, 
                players: newPlayers, 
                trick: newTrick, 
                leadSuit: newLeadSuit, 
                currentPlayerIndex: (gs.currentPlayerIndex + 1) % 4 
            };
        });
    };

    return {
        gameState,
        actions: {
            handlePlayCard,
            handleSelectTrump,
            handlePass,
            handleNewGame,
        },
    };
};

const OmiGameContext = createContext<ReturnType<typeof useOmiGameLogic> | undefined>(undefined);

export const OmiGameProvider = ({ children }: { children: React.ReactNode }) => {
    const game = useOmiGameLogic();
    return (
        <OmiGameContext.Provider value={game}>
            {children}
        </OmiGameContext.Provider>
    );
};

export const useOmiGame = () => {
    const context = useContext(OmiGameContext);
    if (!context) {
        throw new Error('useOmiGame must be used within an OmiGameProvider');
    }
    return context;
};
