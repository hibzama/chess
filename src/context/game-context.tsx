
'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment, onSnapshot, writeBatch, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './auth-context';
import { useParams } from 'next/navigation';

type PlayerColor = 'w' | 'b';
type Winner = 'p1' | 'p2' | 'draw' | null;
type Piece = { type: string; color: 'w' | 'b' };
type Move = { turn: number; white?: string; black?: string };

interface GameRoom {
    id: string;
    wager: number;
    gameType: 'chess' | 'checkers';
    boardState: any;
    moveHistory: Move[];
    capturedByP1: Piece[]; // player who created the room
    capturedByP2: Piece[]; // player who joined
    currentPlayer: PlayerColor;
    createdBy: { uid: string; color: PlayerColor; name: string; };
    player2?: { uid: string; color: PlayerColor, name: string; };
    players: string[];
    status: 'waiting' | 'in-progress' | 'completed';
    winner?: {
        uid: string,
        method: 'checkmate' | 'timeout' | 'resign'
    };
    draw?: boolean;
}

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
    isMounted: boolean;
    isMultiplayer: boolean;
    resign: () => void;
    showResignModal: boolean;
    setShowResignModal: (show: boolean) => void;
    handleResignConfirm: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children, gameType }: { children: React.ReactNode, gameType: 'chess' | 'checkers' }) => {
    const { id: roomId } = useParams();
    const isMultiplayer = !!roomId;
    const { user } = useAuth();
    
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
        if(isMultiplayer) return defaultState; // Multiplayer uses firestore state
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
    }, [storageKey, isMultiplayer]);

    const [gameState, setGameState] = useState<GameState>(getInitialState());
    const [player1Time, setPlayer1Time] = useState(gameState.p1Time);
    const [player2Time, setPlayer2Time] = useState(gameState.p2Time);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [showResignModal, setShowResignModal] = useState(false);


    const updateAndSaveState = useCallback((newState: Partial<GameState>, boardState?: any) => {
        setGameState(prevState => {
            const updatedState = { ...prevState, ...newState };
            if (!isMultiplayer && typeof window !== 'undefined') {
                const stateToSave = { ...updatedState, boardState: boardState || updatedState.boardState };
                localStorage.setItem(storageKey, JSON.stringify(stateToSave));
            }
            return updatedState;
        });
    }, [storageKey, isMultiplayer]);


    // Multiplayer state sync
    useEffect(() => {
        if (!isMultiplayer || !roomId || !user) {
            setIsMounted(true); // Still need to mount for practice mode
            return;
        };

        const roomRef = doc(db, 'game_rooms', roomId as string);
        const unsubscribe = onSnapshot(roomRef, (docSnap) => {
            if (docSnap.exists()) {
                const roomData = docSnap.data() as GameRoom;
                const isCreator = roomData.createdBy.uid === user.uid;

                const pColor = isCreator ? roomData.createdBy.color : roomData.player2!.color;
                const creatorIsP1 = roomData.createdBy.uid === user.uid;

                setGameState(prevState => ({
                    ...prevState,
                    playerColor: pColor,
                    boardState: roomData.boardState,
                    moveHistory: roomData.moveHistory || [],
                    currentPlayer: roomData.currentPlayer,
                    capturedByPlayer: creatorIsP1 ? roomData.capturedByP2 : roomData.capturedByP1,
                    capturedByBot: creatorIsP1 ? roomData.capturedByP1 : roomData.capturedByP2, // "Bot" here means opponent
                    gameOver: roomData.status === 'completed',
                    winner: roomData.winner ? (roomData.winner.uid === user.uid ? 'p1' : 'p2') : (roomData.draw ? 'draw' : null),
                }));
                 setIsMounted(true);
            }
        });
        
        return () => unsubscribe();

    }, [isMultiplayer, roomId, user]);

    
    const stopTimer = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    
    const handlePayout = useCallback(async (room: GameRoom) => {
        const creatorRef = doc(db, 'users', room.createdBy.uid);
        const joinerRef = doc(db, 'users', room.player2!.uid);
        const batch = writeBatch(db);
        const wager = room.wager;
        const now = serverTimestamp();
    
        if (room.draw) {
            const payoutAmount = wager * 0.9;
            batch.update(creatorRef, { balance: increment(payoutAmount) });
            batch.update(joinerRef, { balance: increment(payoutAmount) });
            
            // Log transactions for both players
            batch.set(doc(collection(db, 'transactions')), {
                userId: room.createdBy.uid, type: 'payout', amount: payoutAmount, status: 'completed',
                description: `Draw refund for ${room.gameType} game vs ${room.player2?.name}`, gameRoomId: room.id, createdAt: now
            });
            batch.set(doc(collection(db, 'transactions')), {
                userId: room.player2!.uid, type: 'payout', amount: payoutAmount, status: 'completed',
                description: `Draw refund for ${room.gameType} game vs ${room.createdBy.name}`, gameRoomId: room.id, createdAt: now
            });

        } else if (room.winner) {
            const winnerIsCreator = room.winner.uid === room.createdBy.uid;
            const winnerRef = winnerIsCreator ? creatorRef : joinerRef;
            const loserRef = winnerIsCreator ? joinerRef : creatorRef;
            const winnerId = room.winner.uid;
            const loserId = room.players.find(p => p !== winnerId)!;
            const winnerName = winnerIsCreator ? room.createdBy.name : room.player2!.name;
            const loserName = winnerIsCreator ? room.player2!.name : room.createdBy.name;

            let winnerPayout = wager * 1.8;
            let loserPayout = 0;
            let winnerDesc = `Winnings for ${room.gameType} game vs ${loserName}`;
            let loserDesc = `Loss for ${room.gameType} game vs ${winnerName}`;

            if(room.winner.method === 'resign') {
                winnerPayout = wager * 1.05;
                loserPayout = wager * 0.75;
                winnerDesc = `Forfeit win for ${room.gameType} game vs ${loserName}`;
                loserDesc = `Forfeit refund for ${room.gameType} game vs ${winnerName}`;
            }
            
            batch.update(winnerRef, { balance: increment(winnerPayout) });
            batch.set(doc(collection(db, 'transactions')), {
                userId: winnerId, type: 'payout', amount: winnerPayout, status: 'completed',
                description: winnerDesc, gameRoomId: room.id, createdAt: now
            });

            if (loserPayout > 0) {
                 batch.update(loserRef, { balance: increment(loserPayout) });
                 batch.set(doc(collection(db, 'transactions')), {
                    userId: loserId, type: 'payout', amount: loserPayout, status: 'completed',
                    description: loserDesc, gameRoomId: room.id, createdAt: now
                });
            }
        }
        await batch.commit();
    }, []);


    const setWinner = useCallback(async (winner: Winner, boardState?: any) => {
        if (gameState.gameOver) return;
        stopTimer();
        updateAndSaveState({ winner, gameOver: true }, boardState);

        if (isMultiplayer && roomId) {
            const roomRef = doc(db, 'game_rooms', roomId as string);
            const roomSnap = await getDoc(roomRef);
            if (!roomSnap.exists()) return;
            const roomData = roomSnap.data() as GameRoom;
            
            let updatePayload: Partial<GameRoom> = { status: 'completed' };

            if(winner === 'draw') {
                updatePayload.draw = true;
            } else {
                const winnerId = (winner === 'p1' && user) ? user.uid : roomData.players.find(p => p !== user?.uid);
                if (winnerId) {
                    updatePayload.winner = { uid: winnerId, method: 'checkmate' };
                }
            }
            
            await updateDoc(roomRef, updatePayload);
            handlePayout({ ...roomData, ...updatePayload });
        }
    }, [stopTimer, updateAndSaveState, isMultiplayer, roomId, user, gameState.gameOver, handlePayout]);


    useEffect(() => {
        if (isMultiplayer || !isMounted || gameState.gameOver || !gameState.turnStartTime) {
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

    }, [isMounted, gameState.currentPlayer, gameState.turnStartTime, gameState.gameOver, gameState.playerColor, gameState.p1Time, gameState.p2Time, stopTimer, setWinner, gameState.boardState, isMultiplayer]);

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

    const switchTurn = async (boardState: any, move?: string, capturedPiece?: Piece) => {
        if (gameState.gameOver) return;

        if (isMultiplayer && roomId) {
            const roomRef = doc(db, 'game_rooms', roomId as string);
            const roomSnap = await getDoc(roomRef);
            if (!roomSnap.exists()) return;
            const roomData = roomSnap.data() as GameRoom;

            const isCreator = roomData.createdBy.uid === user?.uid;
            
            let newMoveHistory = [...(roomData.moveHistory || [])];
            if (move) {
                if (roomData.currentPlayer === 'w') {
                    newMoveHistory.push({ turn: Math.floor(newMoveHistory.length) + 1, white: move });
                } else {
                    const lastMove = newMoveHistory[newMoveHistory.length - 1];
                    if (lastMove && !lastMove.black) {
                        lastMove.black = move;
                    } else {
                         newMoveHistory.push({ turn: Math.floor(newMoveHistory.length) + 1, black: move });
                    }
                }
            }

            const updatePayload: Partial<GameRoom> = {
                boardState,
                currentPlayer: roomData.currentPlayer === 'w' ? 'b' : 'w',
                moveHistory: newMoveHistory
            };
            
            if (capturedPiece) {
                if(isCreator) { // creator is p1
                    updatePayload.capturedByP1 = [...(roomData.capturedByP1 || []), capturedPiece];
                } else { // joiner is p2
                    updatePayload.capturedByP2 = [...(roomData.capturedByP2 || []), capturedPiece];
                }
            }

            await updateDoc(roomRef, updatePayload);
            return;
        }

        // Practice mode logic
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
                    newMoveHistory.push({ turn: Math.floor((newMoveCount-1) / 2) + 1, white: move });
                } else {
                    const lastMoveIndex = newMoveHistory.length - 1;
                    if (lastMoveIndex >= 0 && !newMoveHistory[lastMoveIndex].black) {
                        newMoveHistory[lastMoveIndex] = { ...newMoveHistory[lastMoveIndex], black: move };
                    } else {
                        newMoveHistory.push({ turn: Math.floor((newMoveCount-1) / 2) + 1, black: move });
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
                boardState,
            };

            if (typeof window !== 'undefined') {
                localStorage.setItem(storageKey, JSON.stringify(updatedState));
            }

            return updatedState;
        });
    };

    const handleResignConfirm = async () => {
        setShowResignModal(false);
        if (gameState.gameOver) return;
        
        stopTimer();
        updateAndSaveState({ winner: 'p2', gameOver: true });
    
        if (isMultiplayer && roomId && user) {
            const roomRef = doc(db, 'game_rooms', roomId as string);
            const roomSnap = await getDoc(roomRef);
            if (!roomSnap.exists()) return;
            const roomData = roomSnap.data() as GameRoom;
    
            const winnerId = roomData.players.find(p => p !== user.uid);
            
            if (winnerId) {
                const updatePayload: Partial<GameRoom> = {
                    status: 'completed',
                    winner: { uid: winnerId, method: 'resign' }
                };
                await updateDoc(roomRef, updatePayload);
                handlePayout({ ...roomData, ...updatePayload });
            }
        }
    };
    
    const resign = () => {
        if(isMultiplayer) {
            setShowResignModal(true);
        } else {
            // Practice mode resign
            setWinner('p2', gameState.boardState);
        }
    }


    const resetGame = () => {
        if(typeof window !== 'undefined' && !isMultiplayer) {
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
        isMounted,
        setupGame,
        switchTurn,
        setWinner,
        resetGame,
        loadGameState,
        isMultiplayer,
        resign,
        showResignModal,
        setShowResignModal,
        handleResignConfirm,
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
