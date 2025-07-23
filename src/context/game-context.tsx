
'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment, onSnapshot, writeBatch, collection, serverTimestamp, Timestamp } from 'firestore';
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
    p1Time: number;
    p2Time: number;
    turnStartTime: Timestamp;
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
    p1Time: number; // User's time
    p2Time: number; // Opponent's time
    currentPlayer: PlayerColor;
    turnStartTime: number | null; // as JS timestamp
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
                return { ...defaultState, ...parsed, turnStartTime: Date.now() }; // Recalculate start time
            }
        } catch (error) {
            console.error("Failed to parse game state from localStorage", error);
        }
        return defaultState;
    }, [storageKey, isMultiplayer]);

    const [gameState, setGameState] = useState<GameState>(getInitialState());
    const [isMounted, setIsMounted] = useState(false);
    const [showResignModal, setShowResignModal] = useState(false);
    
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

            let winnerPayout: number;
            let loserPayout = 0;
            let winnerDesc: string;
            let loserDesc = `Loss for ${room.gameType} game vs ${winnerName}`;

            if(room.winner.method === 'resign' || room.winner.method === 'timeout') {
                winnerPayout = wager * (room.winner.method === 'resign' ? 1.05 : 1.8);
                loserPayout = wager * (room.winner.method === 'resign' ? 0.75 : 0);
                winnerDesc = room.winner.method === 'resign' ? `Forfeit win for ${room.gameType} game vs ${loserName}` : `Win by time for ${room.gameType} game vs ${loserName}`;
                if (room.winner.method === 'resign') {
                    loserDesc = `Forfeit refund for ${room.gameType} game vs ${winnerName}`;
                }
            } else { // 'checkmate'
                 winnerPayout = wager * 1.8;
            	 winnerDesc = `Winnings for ${room.gameType} game vs ${loserName}`;
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
    }, [gameType]);


    const setWinner = useCallback(async (winner: Winner, boardState?: any, method: 'checkmate' | 'timeout' | 'resign' = 'checkmate') => {
        if (gameState.gameOver) return;
        stopTimer();
        updateAndSaveState({ winner, gameOver: true }, boardState);

        if (isMultiplayer && roomId && user) {
            const roomRef = doc(db, 'game_rooms', roomId as string);
            const roomSnap = await getDoc(roomRef);
            if (!roomSnap.exists() || roomSnap.data().status === 'completed') return;
            const roomData = {id: roomSnap.id, ...roomSnap.data()} as GameRoom;
            
            let updatePayload: Partial<GameRoom> = { status: 'completed' };

            if(winner === 'draw') {
                updatePayload.draw = true;
            } else {
                const winnerId = (winner === 'p1') 
                    ? user.uid 
                    : roomData.players.find(p => p !== user.uid);
                
                if (winnerId) {
                    updatePayload.winner = { uid: winnerId, method };
                }
            }
            
            await updateDoc(roomRef, updatePayload);
            handlePayout({ ...roomData, ...updatePayload });
        }
    }, [stopTimer, updateAndSaveState, isMultiplayer, roomId, user, gameState.gameOver, handlePayout]);


    // Multiplayer state sync and timer
    useEffect(() => {
        if (!isMultiplayer || !roomId || !user) {
            setIsMounted(true);
            return;
        }
    
        const roomRef = doc(db, 'game_rooms', roomId as string);
        const unsubscribe = onSnapshot(roomRef, (docSnap) => {
            if (!docSnap.exists()) return;
            const roomData = docSnap.data() as GameRoom;

            if (roomData.status === 'waiting') {
                return; // Don't sync game state until game is in progress
            }
    
            if (roomData.status === 'completed') {
                stopTimer();
                const winnerIsP1 = roomData.winner ? roomData.winner.uid === user.uid : false;
                 setGameState(prevState => ({
                    ...prevState,
                    gameOver: true,
                    winner: roomData.draw ? 'draw' : (winnerIsP1 ? 'p1' : 'p2'),
                }));
                return;
            }

            const isCreator = roomData.createdBy.uid === user.uid;
            const pColor = isCreator ? roomData.createdBy.color : roomData.player2!.color;
    
            setGameState(prevState => ({
                ...prevState,
                playerColor: pColor,
                boardState: roomData.boardState,
                moveHistory: roomData.moveHistory || [],
                currentPlayer: roomData.currentPlayer,
                capturedByPlayer: isCreator ? roomData.capturedByP2 || [] : roomData.capturedByP1 || [],
                capturedByBot: isCreator ? roomData.capturedByP1 || [] : roomData.capturedByP2 || [],
                p1Time: isCreator ? roomData.p1Time : roomData.p2Time,
                p2Time: isCreator ? roomData.p2Time : roomData.p1Time,
                turnStartTime: roomData.turnStartTime ? roomData.turnStartTime.toMillis() : Date.now(),
            }));
            
            if (!isMounted) setIsMounted(true);
        });
    
        return () => {
            unsubscribe();
            stopTimer();
        };
    
    }, [isMultiplayer, roomId, user, isMounted, stopTimer]);


     // Timer logic
    useEffect(() => {
        stopTimer();
        if (!isMounted || gameState.gameOver || !gameState.turnStartTime) {
            return;
        }
        
        intervalRef.current = setInterval(() => {
            const now = Date.now();
            const elapsed = (now - gameState.turnStartTime!) / 1000;
            const isMyTurn = gameState.currentPlayer === gameState.playerColor;

            let myTime, opponentTime;
             if (isMultiplayer) {
                // In multiplayer, p1Time is always "my" time from the state
                myTime = gameState.p1Time - (isMyTurn ? elapsed : 0);
                opponentTime = gameState.p2Time - (!isMyTurn ? elapsed : 0);
             } else {
                 // Practice mode timer updates every second regardless of whose turn
                myTime = gameState.playerColor === gameState.currentPlayer ? gameState.p1Time - 1 : gameState.p1Time;
                opponentTime = gameState.playerColor !== gameState.currentPlayer ? gameState.p2Time - 1 : gameState.p2Time;
             }

            if (myTime <= 0) {
                setWinner('p2', gameState.boardState, 'timeout');
            } else if (opponentTime <= 0) {
                setWinner('p1', gameState.boardState, 'timeout');
            }
            
            if(!isMultiplayer) {
                updateAndSaveState({ p1Time: myTime, p2Time: opponentTime });
            }

        }, 1000);
    
        return () => stopTimer();
    
    }, [isMounted, gameState.gameOver, gameState.turnStartTime, gameState.currentPlayer, gameState.playerColor, stopTimer, setWinner, gameState.boardState, isMultiplayer, updateAndSaveState, gameState.p1Time, gameState.p2Time]);


    const loadGameState = (state: GameState) => {
        setGameState(state);
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
             
            const now = Date.now();
            const elapsedSeconds = (now - roomData.turnStartTime.toMillis()) / 1000;

            let timeToUpdate, otherTimeField;
            if (isCreator) {
                timeToUpdate = roomData.currentPlayer === roomData.createdBy.color ? 'p1Time' : 'p2Time';
                otherTimeField = timeToUpdate === 'p1Time' ? 'p2Time' : 'p1Time';
            } else {
                timeToUpdate = roomData.currentPlayer === roomData.player2!.color ? 'p2Time' : 'p1Time';
                otherTimeField = timeToUpdate === 'p2Time' ? 'p1Time' : 'p2Time';
            }
            const newTime = roomData[timeToUpdate as keyof GameRoom] as number - elapsedSeconds;


            const updatePayload: any = {
                boardState,
                currentPlayer: roomData.currentPlayer === 'w' ? 'b' : 'w',
                moveHistory: newMoveHistory,
                turnStartTime: serverTimestamp(),
                [timeToUpdate]: newTime,
            };
            
            if (capturedPiece) {
                // if I am creator and my color is current player color, I captured a piece for p1
                const myColor = isCreator ? roomData.createdBy.color : roomData.player2?.color;
                const capturedField = myColor === roomData.currentPlayer ? 'capturedByP1' : 'capturedByP2';
                updatePayload[capturedField] = [...(roomData[capturedField] || []), capturedPiece];
            }

            await updateDoc(roomRef, updatePayload);
            return;
        }

        // Practice mode logic
        const p1IsCurrent = (gameState.playerColor === gameState.currentPlayer);
        let newMoveHistory = [...gameState.moveHistory];
        let newMoveCount = gameState.moveCount + 1;
        
        if (move) {
            if (gameState.currentPlayer === 'w') {
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

        const newCapturedByPlayer = capturedPiece && !p1IsCurrent ? [...gameState.capturedByPlayer, capturedPiece] : gameState.capturedByPlayer;
        const newCapturedByBot = capturedPiece && p1IsCurrent ? [...gameState.capturedByBot, capturedPiece] : gameState.capturedByBot;

        const nextPlayer = gameState.currentPlayer === 'w' ? 'b' : 'w';
        
        updateAndSaveState({ 
            currentPlayer: nextPlayer,
            turnStartTime: Date.now(),
            moveHistory: newMoveHistory,
            moveCount: newMoveCount,
            capturedByPlayer: newCapturedByPlayer,
            capturedByBot: newCapturedByBot,
        }, boardState);
    };

    const handleResignConfirm = async () => {
        setShowResignModal(false);
        if (gameState.gameOver) return;
        setWinner('p2', gameState.boardState, 'resign');
    };
    
    const resign = () => {
        if(isMultiplayer) {
            setShowResignModal(true);
        } else {
            // Practice mode resign
            setWinner('p2', gameState.boardState, 'checkmate');
        }
    }


    const resetGame = () => {
        if(typeof window !== 'undefined' && !isMultiplayer) {
          localStorage.removeItem(storageKey);
        }
        const defaultState: GameState = getInitialState();
        setGameState(defaultState);
        stopTimer();
    };

    const contextValue = {
        ...gameState,
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
