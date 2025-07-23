
'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment, onSnapshot, writeBatch, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useAuth } from './auth-context';
import { useParams, useRouter } from 'next/navigation';

type PlayerColor = 'w' | 'b';
type Winner = 'p1' | 'p2' | 'draw' | null;
type Piece = { type: string; color: 'w' | 'b' };
type Move = { turn: number; white?: string; black?: string };
type GameOverReason = 'checkmate' | 'timeout' | 'resign' | 'draw' | null;

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
        method: GameOverReason
    };
    draw?: boolean;
    payoutProcessed?: boolean;
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
    gameOverReason: GameOverReason;
    moveHistory: Move[];
    moveCount: number;
    boardState: any | null;
    capturedByPlayer: Piece[];
    capturedByBot: Piece[];
}

interface GameContextType extends GameState {
    setupGame: (color: PlayerColor, time: number, diff: string) => void;
    switchTurn: (boardState: any, move?: string, capturedPiece?: Piece) => void;
    setWinner: (winner: Winner, boardState: any, method?: GameOverReason) => void;
    resetGame: () => void;
    loadGameState: (state: GameState) => void;
    isMounted: boolean;
    isMultiplayer: boolean;
    resign: () => void;
    showResignModal: boolean;
    setShowResignModal: (show: boolean) => void;
    handleResignConfirm: () => void;
    payoutAmount: number | null;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children, gameType }: { children: React.ReactNode, gameType: 'chess' | 'checkers' }) => {
    const { id: roomId } = useParams();
    const router = useRouter();
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
            gameOverReason: null,
            moveHistory: [],
            moveCount: 0,
            boardState: null,
            capturedByPlayer: [],
            capturedByBot: [],
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
    const [room, setRoom] = useState<GameRoom | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [showResignModal, setShowResignModal] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState<number | null>(null);
    
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

    const handlePayout = useCallback(async () => {
        const roomRef = doc(db, 'game_rooms', roomId as string);
        const roomDoc = await getDoc(roomRef);
        const currentRoom = roomDoc.data() as GameRoom;
        
        if (!currentRoom || !currentRoom.player2 || currentRoom.payoutProcessed) return;

        const creatorRef = doc(db, 'users', currentRoom.createdBy.uid);
        const joinerRef = doc(db, 'users', currentRoom.player2.uid);
        const batch = writeBatch(db);
        const wager = currentRoom.wager;
        const now = serverTimestamp();
    
        let creatorPayout = 0;
        let joinerPayout = 0;
        let creatorDesc = '';
        let joinerDesc = '';
    
        if (currentRoom.draw) {
            creatorPayout = wager * 0.9;
            joinerPayout = wager * 0.9;
            creatorDesc = `Draw refund for ${currentRoom.gameType} game vs ${currentRoom.player2.name}`;
            joinerDesc = `Draw refund for ${currentRoom.gameType} game vs ${currentRoom.createdBy.name}`;
        } else if (currentRoom.winner) {
            const winnerIsCreator = currentRoom.winner.uid === currentRoom.createdBy.uid;
            const winnerName = winnerIsCreator ? currentRoom.createdBy.name : currentRoom.player2.name;
            const loserName = winnerIsCreator ? currentRoom.player2.name : currentRoom.createdBy.name;
    
            if (currentRoom.winner.method === 'resign') {
                const winnerPayoutAmount = wager * 1.05;
                const loserPayoutAmount = wager * 0.75;
                creatorPayout = winnerIsCreator ? winnerPayoutAmount : loserPayoutAmount;
                joinerPayout = winnerIsCreator ? loserPayoutAmount : winnerPayoutAmount;
                creatorDesc = winnerIsCreator ? `Forfeit win vs ${loserName}` : `Forfeit refund vs ${winnerName}`;
                joinerDesc = winnerIsCreator ? `Forfeit refund vs ${winnerName}` : `Forfeit win vs ${loserName}`;
            } else { // 'checkmate' or 'timeout'
                const winnerPayoutAmount = wager * 1.8;
                creatorPayout = winnerIsCreator ? winnerPayoutAmount : 0;
                joinerPayout = winnerIsCreator ? 0 : winnerPayoutAmount;
                const reason = currentRoom.winner.method === 'checkmate' ? 'Win by checkmate' : 'Win by time';
                creatorDesc = winnerIsCreator ? `${reason} vs ${loserName}` : `Loss vs ${winnerName}`;
                joinerDesc = winnerIsCreator ? `Loss vs ${winnerName}` : `${reason} vs ${loserName}`;
            }
        }
    
        if (user?.uid === currentRoom.createdBy.uid) setPayoutAmount(creatorPayout);
        if (user?.uid === currentRoom.player2.uid) setPayoutAmount(joinerPayout);
    
        if (creatorPayout > 0) {
            batch.update(creatorRef, { balance: increment(creatorPayout) });
            batch.set(doc(collection(db, 'transactions')), {
                userId: currentRoom.createdBy.uid, type: 'payout', amount: creatorPayout, status: 'completed',
                description: creatorDesc, gameRoomId: roomId, createdAt: now
            });
        }
        if (joinerPayout > 0) {
            batch.update(joinerRef, { balance: increment(joinerPayout) });
            batch.set(doc(collection(db, 'transactions')), {
                userId: currentRoom.player2.uid, type: 'payout', amount: joinerPayout, status: 'completed',
                description: joinerDesc, gameRoomId: roomId, createdAt: now
            });
        }
        
        batch.update(roomRef, { payoutProcessed: true });
    
        try {
            await batch.commit();
        } catch (error) {
            console.error("Payout failed:", error)
        }
    }, [user, roomId]);


    const setWinner = useCallback(async (winner: Winner, boardState?: any, method: GameOverReason = 'checkmate') => {
        if (gameState.gameOver || !room) return;
        stopTimer();
        
        if (isMultiplayer) {
            const roomRef = doc(db, 'game_rooms', room.id);
            const currentRoomDoc = await getDoc(roomRef);
            if(currentRoomDoc.exists() && currentRoomDoc.data().status === 'completed') return;
            
            let updatePayload: any = { status: 'completed' };

            if(winner === 'draw') {
                updatePayload.draw = true;
            } else {
                let winnerId;
                if(winner === 'p1') {
                    winnerId = user?.uid;
                } else { 
                    winnerId = room.players.find(p => p !== user?.uid);
                }
                
                if (winnerId) {
                    updatePayload.winner = { uid: winnerId, method };
                }
            }
            
            await updateDoc(roomRef, updatePayload);
        } else {
            updateAndSaveState({ winner, gameOver: true, gameOverReason: method }, boardState);
        }
    }, [stopTimer, updateAndSaveState, isMultiplayer, user, gameState.gameOver, room]);


    // Multiplayer state sync and timer
    useEffect(() => {
        if (!isMultiplayer || !roomId || !user) {
            setIsMounted(true);
            return;
        }
    
        const roomRef = doc(db, 'game_rooms', roomId as string);
        const unsubscribe = onSnapshot(roomRef, (docSnap) => {
            if (!docSnap.exists()) return;
            const roomData = { id: docSnap.id, ...docSnap.data() } as GameRoom;
            setRoom(roomData);

            if (roomData.status === 'waiting') {
                return;
            }
    
            if (roomData.status === 'completed' && !gameState.gameOver) {
                stopTimer();
                const winnerIsMe = roomData.winner ? roomData.winner.uid === user.uid : false;
                
                 setGameState(prevState => ({
                    ...prevState,
                    boardState: roomData.boardState,
                    gameOver: true,
                    winner: roomData.draw ? 'draw' : (winnerIsMe ? 'p1' : 'p2'),
                    gameOverReason: roomData.draw ? 'draw' : roomData.winner?.method || null,
                }));
                handlePayout();
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
                p2Time: !isCreator ? roomData.p1Time : roomData.p2Time,
                turnStartTime: roomData.turnStartTime?.toMillis() || Date.now(),
            }));
            
            if (!isMounted) setIsMounted(true);
        });
    
        return () => {
            unsubscribe();
            stopTimer();
        };
    
    }, [isMultiplayer, roomId, user, isMounted, stopTimer, handlePayout, gameState.gameOver]);


     // Timer countdown for visual feedback
    useEffect(() => {
        stopTimer();
        if (!isMounted || gameState.gameOver || !gameState.turnStartTime) {
            return;
        }
        
        intervalRef.current = setInterval(() => {
            const isMyTurn = gameState.currentPlayer === gameState.playerColor;
            const elapsed = (Date.now() - gameState.turnStartTime!) / 1000;
            
            const currentP1Time = isMultiplayer ? gameState.p1Time : gameState.timeLimit;
            const currentP2Time = isMultiplayer ? gameState.p2Time : gameState.timeLimit;
            
            if (isMyTurn) {
                const newTime = currentP1Time - elapsed;
                 if (newTime <= 0) {
                     setGameState(p => ({...p, p1Time: 0}));
                     setWinner('p2', gameState.boardState, 'timeout');
                     stopTimer();
                 } else {
                    setGameState(p => ({...p, p1Time: newTime}));
                }
            } else {
                const newTime = currentP2Time - elapsed;
                if (newTime <= 0) {
                    setGameState(p => ({...p, p2Time: 0}));
                    setWinner('p1', gameState.boardState, 'timeout');
                    stopTimer();
                } else {
                   setGameState(p => ({...p, p2Time: newTime}));
               }
            }
        }, 1000);
    
        return () => stopTimer();
    
    }, [isMounted, gameState.gameOver, gameState.turnStartTime, gameState.currentPlayer, gameState.playerColor, stopTimer, setWinner, gameState.boardState, isMultiplayer, gameState.p1Time, gameState.p2Time, gameState.timeLimit]);


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
            gameOverReason: null,
            capturedByPlayer: [],
            capturedByBot: [],
            moveHistory: [],
            moveCount: 0,
            boardState: null,
        };
        updateAndSaveState(newState);
    };

    const switchTurn = async (boardState: any, move?: string, capturedPiece?: Piece) => {
        if (gameState.gameOver || !room) return;

        if (isMultiplayer) {
            const roomRef = doc(db, 'game_rooms', room.id);
            const isCreator = room.createdBy.uid === user?.uid;
            
            let newMoveHistory = [...(room.moveHistory || [])];
            if (move) {
                if (room.currentPlayer === 'w') {
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
            const elapsedSeconds = room.turnStartTime ? (now - room.turnStartTime.toMillis()) / 1000 : 0;
            const creatorIsCurrent = room.currentPlayer === room.createdBy.color;

            const newP1Time = creatorIsCurrent ? room.p1Time - elapsedSeconds : room.p1Time;
            const newP2Time = !creatorIsCurrent ? room.p2Time - elapsedSeconds : room.p2Time;

            const updatePayload: any = {
                boardState,
                currentPlayer: room.currentPlayer === 'w' ? 'b' : 'w',
                moveHistory: newMoveHistory,
                turnStartTime: serverTimestamp(),
                p1Time: newP1Time,
                p2Time: newP2Time,
            };
            
            if (capturedPiece) {
                if (room.currentPlayer === room.createdBy.color) {
                    updatePayload.capturedByP1 = [...(room.capturedByP1 || []), capturedPiece];
                } else {
                    updatePayload.capturedByP2 = [...(room.capturedByP2 || []), capturedPiece];
                }
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
        if (gameState.gameOver || !room) return;
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
        setRoom(null);
        setPayoutAmount(null);
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
        payoutAmount
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

    