
'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

type PlayerColor = 'w' | 'b';
type Winner = 'p1' | 'p2' | 'draw' | null;
type Piece = { type: string; color: 'w' | 'b' };

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
    moveHistory: any[];
}

interface GameContextType extends GameState {
    setupGame: (color: PlayerColor, time: number, diff: string) => void;
    switchTurn: (boardState: any, move?: any, capturedPiece?: Piece) => void;
    setWinner: (winner: Winner, boardState: any) => void;
    resetGame: () => void;
    player1Time: number;
    player2Time: number;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const initialGameState: GameState = {
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
};

const getLocalStorageKey = (gameType: 'chess' | 'checkers') => `game_state_${gameType}`;

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
    const [gameState, setGameState] = useState<GameState>(initialGameState);
    const [player1Time, setPlayer1Time] = useState(gameState.p1Time);
    const [player2Time, setPlayer2Time] = useState(gameState.p2Time);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // This is a placeholder. In a real app, you'd know which game is active.
    const activeGameType = typeof window !== 'undefined' && window.location.pathname.includes('checkers') ? 'checkers' : 'chess';
    const storageKey = getLocalStorageKey(activeGameType);

    useEffect(() => {
        try {
            const savedState = localStorage.getItem(storageKey);
            if (savedState) {
                const parsedState: GameState = JSON.parse(savedState);
                setGameState(parsedState);
                setPlayer1Time(parsedState.p1Time);
                setPlayer2Time(parsedState.p2Time);
            }
        } catch (error) {
            console.error("Failed to parse game state from localStorage", error);
        }
    }, [storageKey]);

    const updateAndSaveState = useCallback((newState: Partial<GameState>, boardState?: any) => {
        setGameState(prevState => {
            const updatedState = { ...prevState, ...newState };
            const stateToSave = { ...updatedState, board: boardState };
            localStorage.setItem(storageKey, JSON.stringify(stateToSave));
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
        stopTimer();
        if (gameState.gameOver || !gameState.turnStartTime) return;

        const p1IsCurrent = (gameState.playerColor === 'w' && gameState.currentPlayer === 'w') || (gameState.playerColor === 'b' && gameState.currentPlayer === 'b');

        const tick = () => {
            const now = Date.now();
            const elapsed = Math.floor((now - (gameState.turnStartTime || now)) / 1000);
            
            if (p1IsCurrent) {
                const newTime = gameState.p1Time - elapsed;
                setPlayer1Time(newTime);
                if (newTime <= 0) {
                    setWinner(gameState.playerColor === 'w' ? 'p2' : 'p1');
                }
            } else {
                const newTime = gameState.p2Time - elapsed;
                setPlayer2Time(newTime);
                 if (newTime <= 0) {
                    setWinner(gameState.playerColor === 'b' ? 'p2' : 'p1');
                }
            }
        };
        
        tick(); // Initial tick to update immediately
        intervalRef.current = setInterval(tick, 1000);

        return () => stopTimer();

    }, [gameState.currentPlayer, gameState.turnStartTime, gameState.gameOver, gameState.playerColor, gameState.p1Time, gameState.p2Time, stopTimer, setWinner]);


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
        };
        setPlayer1Time(time);
        setPlayer2Time(time);
        updateAndSaveState(newState);
    };

    const switchTurn = (boardState: any, move?: any, capturedPiece?: Piece) => {
        if (gameState.gameOver) return;

        const now = Date.now();
        const elapsed = Math.floor((now - (gameState.turnStartTime || now)) / 1000);
        const p1IsCurrent = (gameState.playerColor === 'w' && gameState.currentPlayer === 'w') || (gameState.playerColor === 'b' && gameState.currentPlayer === 'b');
        
        let newP1Time = gameState.p1Time;
        let newP2Time = gameState.p2Time;
        let newMoveHistory = [...gameState.moveHistory];
        let newCapturedByPlayer = gameState.capturedByPlayer ? [...gameState.capturedByPlayer] : [];
        let newCapturedByBot = gameState.capturedByBot ? [...gameState.capturedByBot] : [];

        if (p1IsCurrent) {
            newP1Time -= elapsed;
            if (move) {
                if(newMoveHistory.length === 0 || newMoveHistory[newMoveHistory.length-1].black) {
                     newMoveHistory.push({turn: newMoveHistory.length + 1, white: move});
                } else {
                    newMoveHistory[newMoveHistory.length - 1].white = move;
                }
            }
            if(capturedPiece) newCapturedByPlayer.push(capturedPiece);

        } else { // Bot's turn
            newP2Time -= elapsed;
             if (move) {
                if(newMoveHistory.length === 0 || newMoveHistory[newMoveHistory.length-1].black) {
                     newMoveHistory.push({turn: newMoveHistory.length + 1, black: move});
                } else {
                    newMoveHistory[newMoveHistory.length - 1].black = move;
                }
            }
            if(capturedPiece) newCapturedByBot.push(capturedPiece);
        }

        const nextPlayer = gameState.currentPlayer === 'w' ? 'b' : 'w';
        updateAndSaveState({
            currentPlayer: nextPlayer,
            turnStartTime: now,
            p1Time: newP1Time,
            p2Time: newP2Time,
            moveHistory: newMoveHistory,
            capturedByPlayer: newCapturedByPlayer,
            capturedByBot: newCapturedByBot,
        }, boardState);
    };

    const resetGame = () => {
        localStorage.removeItem(storageKey);
        setGameState(initialGameState);
        setPlayer1Time(initialGameState.p1Time);
        setPlayer2Time(initialGameState.p2Time);
        stopTimer();
    };

    return (
        <GameContext.Provider value={{ ...gameState, player1Time, player2Time, setupGame, switchTurn, setWinner, resetGame }}>
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
