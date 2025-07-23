
'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

type PlayerColor = 'w' | 'b';
type GameStatus = 'playing' | 'gameover';
type Winner = 'p1' | 'p2' | 'draw' | null;

interface GameContextType {
    playerColor: PlayerColor;
    timeLimit: number;
    difficulty: string;
    player1Time: number | null;
    player2Time: number | null;
    currentPlayer: PlayerColor;
    gameOver: boolean;
    winner: Winner;
    setupGame: (color: PlayerColor, time: number, diff: string) => void;
    switchTurn: () => void;
    setWinner: (winner: Winner) => void;
    resetGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
    const [playerColor, setPlayerColor] = useState<PlayerColor>('w');
    const [timeLimit, setTimeLimit] = useState(900); // in seconds
    const [difficulty, setDifficulty] = useState('intermediate');

    const [player1Time, setPlayer1Time] = useState<number | null>(null);
    const [player2Time, setPlayer2Time] = useState<number | null>(null);

    const [currentPlayer, setCurrentPlayer] = useState<PlayerColor>('w');
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinnerState] = useState<Winner>(null);
    
    const p1IntervalRef = useRef<NodeJS.Timeout | null>(null);
    const p2IntervalRef = useRef<NodeJS.Timeout | null>(null);

    const stopTimers = useCallback(() => {
        if (p1IntervalRef.current) clearInterval(p1IntervalRef.current);
        if (p2IntervalRef.current) clearInterval(p2IntervalRef.current);
    }, []);

    const setWinner = useCallback((newWinner: Winner) => {
        if (gameOver) return;
        setGameOver(true);
        setWinnerState(newWinner);
        stopTimers();
    }, [gameOver, stopTimers]);
    
    const startTimer = useCallback((player: 'p1' | 'p2') => {
        const intervalRef = player === 'p1' ? p1IntervalRef : p2IntervalRef;
        const setTime = player === 'p1' ? setPlayer1Time : setPlayer2Time;
        const opponent = player === 'p1' ? 'p2' : 'p1';
        
        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
            setTime(prevTime => {
                if (prevTime === null || prevTime <= 1) {
                    clearInterval(intervalRef.current!);
                    setWinner(opponent);
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);
    }, [setWinner]);


    const switchTurn = useCallback(() => {
        const nextPlayer = currentPlayer === 'w' ? 'b' : 'w';
        setCurrentPlayer(nextPlayer);
    }, [currentPlayer]);

    useEffect(() => {
        if (gameOver) {
            stopTimers();
            return;
        }

        stopTimers();
        const p1IsWhite = playerColor === 'w';

        if ((currentPlayer === 'w' && p1IsWhite) || (currentPlayer === 'b' && !p1IsWhite)) {
            startTimer('p1');
        } else {
            startTimer('p2');
        }

    }, [currentPlayer, gameOver, playerColor, startTimer, stopTimers]);


    const setupGame = (color: PlayerColor, time: number, diff: string) => {
        setPlayerColor(color);
        setTimeLimit(time);
        setDifficulty(diff);
        setPlayer1Time(time);
        setPlayer2Time(time);
        setCurrentPlayer('w');
        setGameOver(false);
        setWinnerState(null);
    };
    
    const resetGame = () => {
        setPlayerColor('w');
        setTimeLimit(900);
        setDifficulty('intermediate');
        setPlayer1Time(null);
        setPlayer2Time(null);
        setCurrentPlayer('w');
        setGameOver(false);
        setWinnerState(null);
        stopTimers();
    }


    return (
        <GameContext.Provider value={{ playerColor, timeLimit, difficulty, player1Time, player2Time, currentPlayer, gameOver, winner, setupGame, switchTurn, setWinner, resetGame }}>
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
