
'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

type PlayerColor = 'w' | 'b';
type Winner = 'p1' | 'p2' | 'draw' | null;
type Piece = { type: string; color: 'w' | 'b' };
type Move = { turn: number; white?: string; black?: string };

interface GameState {
    playerColor: PlayerColor;
    timeLimit: number;
    difficulty: string;
    p1Time: number;
    p2Time: number;
    currentPlayer: PlayerColor;
    turnStartTime: number | null;
    gameOver: boolean;
    winner: Winner;
    capturedByPlayer: Piece[];
    capturedByBot: Piece[];
    moveHistory: Move[];
    moveCount: number;
    boardState: any | null;
}

interface GameContextType extends GameState {
    setupGame: (color: PlayerColor, time: number, diff: string) => void;
    switchTurn: (boardState: any, move?: string, capturedPiece?: Piece) => void;
    setWinner: (winner: Winner, boardState: any) => void;
    resetGame: () => void;
    player1Time: number;
    player2Time: number;
    loadGameState: (state: GameState) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children, gameType }: { children: React.ReactNode, gameType: 'chess' | 'checkers' }) => {
    const storageKey = `game_state_${gameType}`;
    
    const getInitialState = useCallback((): GameState => {
        const defaultState: GameState = {
            playerColor: 'w',
            timeLimit: 900,
            difficulty: 'intermediate',
            p1Time: 900,
            p2Time: 900,
            currentPlayer: 'w',
            turnStartTime: null,
            gameOver: false,
            winner: null,
            capturedByPlayer: [],
            capturedByBot: [],
            moveHistory: [],
            moveCount: 0,
            boardState: null,
        };
        try {
            const savedState = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
            if (savedState) {
                const parsed = JSON.parse(savedState);
                parsed.p1Time = Number(parsed.p1Time) || defaultState.p1Time;
                parsed.p2Time = Number(parsed.p2Time) || defaultState.p2Time;
                return { ...defaultState, ...parsed, turnStartTime: Date.now() }; // Recalculate start time
            }
        } catch (error) {
            console.error("Failed to parse game state from localStorage", error);
        }
        return defaultState;
    }, [storageKey]);

    const [gameState, setGameState] = useState<GameState>(getInitialState());
    const [player1Time, setPlayer1Time] = useState(gameState.p1Time);
    const [player2Time, setPlayer2Time] = useState(gameState.p2Time);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const savedState = getInitialState();
        setGameState(savedState);
        setPlayer1Time(savedState.p1Time);
        setPlayer2Time(savedState.p2Time);
    }, [getInitialState]);


    const updateAndSaveState = useCallback((newState: Partial<GameState>, boardState?: any) => {
        setGameState(prevState => {
            const updatedState = { ...prevState, ...newState };
            if (typeof window !== 'undefined') {
                const stateToSave = { ...updatedState, boardState: boardState || updatedState.boardState };
                localStorage.setItem(storageKey, JSON.stringify(stateToSave));
            }
            return updatedState;
        });
    }, [storageKey]);

    const stopTimer = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const setWinner = useCallback((winner: Winner, boardState?: any) => {
        stopTimer();
        updateAndSaveState({ winner, gameOver: true }, boardState);
    }, [stopTimer, updateAndSaveState]);


    useEffect(() => {
        if (!isMounted || gameState.gameOver || !gameState.turnStartTime) {
            stopTimer();
            return;
        }

        const p1IsCurrent = (gameState.playerColor === gameState.currentPlayer);

        const tick = () => {
            const now = Date.now();
            const elapsed = Math.floor((now - (gameState.turnStartTime || now)) / 1000);
            
            if (p1IsCurrent) {
                const newTime = gameState.p1Time - elapsed;
                setPlayer1Time(newTime > 0 ? newTime : 0);
                if (newTime <= 0) {
                    setWinner('p2', gameState.boardState); 
                }
            } else {
                const newTime = gameState.p2Time - elapsed;
                setPlayer2Time(newTime > 0 ? newTime : 0);
                 if (newTime <= 0) {
                    setWinner('p1', gameState.boardState); 
                }
            }
        };
        
        intervalRef.current = setInterval(tick, 1000);

        return () => stopTimer();

    }, [isMounted, gameState.currentPlayer, gameState.turnStartTime, gameState.gameOver, gameState.playerColor, gameState.p1Time, gameState.p2Time, stopTimer, setWinner, gameState.boardState]);

    const loadGameState = (state: GameState) => {
        setGameState(state);
        setPlayer1Time(state.p1Time);
        setPlayer2Time(state.p2Time);
    };

    const setupGame = (color: PlayerColor, time: number, diff: string) => {
        const newState: GameState = {
            playerColor: color,
            timeLimit: time,
            difficulty: diff,
            p1Time: time,
            p2Time: time,
            currentPlayer: 'w',
            turnStartTime: Date.now(),
            gameOver: false,
            winner: null,
            capturedByPlayer: [],
            capturedByBot: [],
            moveHistory: [],
            moveCount: 0,
            boardState: null,
        };
        setPlayer1Time(time);
        setPlayer2Time(time);
        updateAndSaveState(newState);
    };

    const switchTurn = (boardState: any, move?: string, capturedPiece?: Piece) => {
        if (gameState.gameOver) return;

        setGameState(prevState => {
            const now = Date.now();
            const elapsed = prevState.turnStartTime ? Math.floor((now - prevState.turnStartTime) / 1000) : 0;
            
            const p1IsCurrent = (prevState.playerColor === prevState.currentPlayer);
    
            let newP1Time = p1IsCurrent ? prevState.p1Time - elapsed : prevState.p1Time;
            let newP2Time = !p1IsCurrent ? prevState.p2Time - elapsed : prevState.p2Time;
            
            setPlayer1Time(newP1Time);
            setPlayer2Time(newP2Time);
    
            let newMoveHistory = [...prevState.moveHistory];
            let newMoveCount = prevState.moveCount + 1;
            
            if (move) {
                if (prevState.currentPlayer === 'w') {
                    newMoveHistory.push({ turn: Math.floor(newMoveCount / 2) + 1, white: move });
                } else {
                    const lastMove = newMoveHistory[newMoveHistory.length - 1];
                    if (lastMove && !lastMove.black) {
                        lastMove.black = move;
                    } else {
                        // This case should ideally not happen in a normal game flow
                        newMoveHistory.push({ turn: Math.floor(newMoveCount / 2), black: move });
                    }
                }
            }
    
            const newCapturedByPlayer = capturedPiece && !p1IsCurrent ? [...prevState.capturedByPlayer, capturedPiece] : prevState.capturedByPlayer;
            const newCapturedByBot = capturedPiece && p1IsCurrent ? [...prevState.capturedByBot, capturedPiece] : prevState.capturedByBot;
    
            const nextPlayer = prevState.currentPlayer === 'w' ? 'b' : 'w';
            
            const updatedState = { 
                ...prevState,
                currentPlayer: nextPlayer,
                turnStartTime: now,
                p1Time: newP1Time,
                p2Time: newP2Time,
                moveHistory: newMoveHistory,
                moveCount: newMoveCount,
                capturedByPlayer: newCapturedByPlayer,
                capturedByBot: newCapturedByBot,
                boardState, // always save the latest board state
            };

            if (typeof window !== 'undefined') {
                localStorage.setItem(storageKey, JSON.stringify(updatedState));
            }

            return updatedState;
        });
    };

    const resetGame = () => {
        if(typeof window !== 'undefined') {
          localStorage.removeItem(storageKey);
        }
        const defaultState: GameState = {
            playerColor: 'w',
            timeLimit: 900,
            difficulty: 'intermediate',
            p1Time: 900,
            p2Time: 900,
            currentPlayer: 'w',
            turnStartTime: null,
            gameOver: false,
            winner: null,
            capturedByPlayer: [],
            capturedByBot: [],
            moveHistory: [],
            moveCount: 0,
            boardState: null,
        };
        setGameState(defaultState);
        setPlayer1Time(defaultState.p1Time);
        setPlayer2Time(defaultState.p2Time);
        stopTimer();
    };

    const contextValue = {
        ...gameState,
        player1Time: isMounted ? player1Time : gameState.timeLimit,
        player2Time: isMounted ? player2Time : gameState.timeLimit,
        setupGame,
        switchTurn,
        setWinner,
        resetGame,
        loadGameState
    };

    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
}

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
}
