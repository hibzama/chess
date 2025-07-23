
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
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children, gameType }: { children: React.ReactNode, gameType: 'chess' | 'checkers' }) => {
    const storageKey = `game_state_${gameType}`;

    const getInitialState = (): GameState => {
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
                return { ...defaultState, ...parsed };
            }
        } catch (error) {
            console.error("Failed to parse game state from localStorage", error);
        }
        return defaultState;
    }

    const [gameState, setGameState] = useState<GameState>(getInitialState());
    const [player1Time, setPlayer1Time] = useState(gameState.p1Time);
    const [player2Time, setPlayer2Time] = useState(gameState.p2Time);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);


    const updateAndSaveState = useCallback((newState: Partial<GameState>, boardState?: any) => {
        setGameState(prevState => {
            const updatedState = { ...prevState, ...newState };
            const stateToSave = { ...updatedState, boardState: boardState || updatedState.boardState };
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
        
        tick(); 
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
            moveCount: 0,
            boardState: null,
        };
        setPlayer1Time(time);
        setPlayer2Time(time);
        updateAndSaveState(newState);
    };

    const switchTurn = (boardState: any, move?: string, capturedPiece?: Piece) => {
        if (gameState.gameOver) return;

        const now = Date.now();
        const elapsed = gameState.turnStartTime ? Math.floor((now - gameState.turnStartTime) / 1000) : 0;
        
        const p1IsCurrent = (gameState.playerColor === gameState.currentPlayer);

        let newP1Time = gameState.p1Time;
        let newP2Time = gameState.p2Time;
        
        if (p1IsCurrent) {
            newP1Time -= elapsed;
        } else {
            newP2Time -= elapsed;
        }
        
        setPlayer1Time(newP1Time);
        setPlayer2Time(newP2Time);

        let newMoveHistory = [...gameState.moveHistory];
        let newMoveCount = gameState.moveCount + 1;
        
        if (move) {
            if (gameState.currentPlayer === 'w') {
                newMoveHistory.push({ turn: Math.floor(newMoveCount / 2) + 1, white: move });
            } else {
                const lastMove = newMoveHistory[newMoveHistory.length - 1];
                if (lastMove && !lastMove.black) {
                    lastMove.black = move;
                } else {
                    newMoveHistory.push({ turn: Math.floor(newMoveCount / 2) + 1, black: move });
                }
            }
        }

        const newCapturedByPlayer = capturedPiece && !p1IsCurrent ? [...gameState.capturedByPlayer, capturedPiece] : gameState.capturedByPlayer;
        const newCapturedByBot = capturedPiece && p1IsCurrent ? [...gameState.capturedByBot, capturedPiece] : gameState.capturedByBot;

        const nextPlayer = gameState.currentPlayer === 'w' ? 'b' : 'w';
        updateAndSaveState({
            currentPlayer: nextPlayer,
            turnStartTime: now,
            p1Time: newP1Time,
            p2Time: newP2Time,
            moveHistory: newMoveHistory,
            moveCount: newMoveCount,
            capturedByPlayer: newCapturedByPlayer,
            capturedByBot: newCapturedByBot,
        }, boardState);
    };

    const resetGame = () => {
        localStorage.removeItem(storageKey);
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
