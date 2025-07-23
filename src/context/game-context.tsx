
'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment, onSnapshot, writeBatch, collection, serverTimestamp, Timestamp, runTransaction } from 'firebase/firestore';
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
    p1Time: number; // Stored as seconds remaining at last turn
    p2Time: number; // Stored as seconds remaining at last turn
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
    payoutTransactionId?: string; // To ensure idempotency
}

interface GameState {
    playerColor: PlayerColor;
    timeLimit: number;
    difficulty: string;
    p1Time: number; // User's time
    p2Time: number; // Opponent's time
    currentPlayer: PlayerColor;
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
    setWinner: (winnerId: string | 'draw' | null, boardState: any, method?: GameOverReason) => void;
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
                return { ...defaultState, ...parsed };
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
        if (!roomId || !user) return;
    
        try {
            await runTransaction(db, async (transaction) => {
                const roomRef = doc(db, 'game_rooms', roomId);
                const roomDoc = await transaction.get(roomRef);
    
                if (!roomDoc.exists()) {
                    throw "Room does not exist!";
                }
    
                const currentRoom = roomDoc.data() as GameRoom;
    
                // Idempotency check: If payout is already processed, do nothing.
                if (currentRoom.payoutTransactionId) {
                    return;
                }
                 if (!currentRoom.player2) {
                    // This can happen in a race condition if a room is cancelled.
                    return;
                }
    
                const creatorRef = doc(db, 'users', currentRoom.createdBy.uid);
                const joinerRef = doc(db, 'users', currentRoom.player2.uid);
                
                const wager = currentRoom.wager;
                const now = serverTimestamp();
                const payoutTxId = doc(collection(db, 'transactions')).id; // Generate a unique ID for this payout operation

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
    
                if (user.uid === currentRoom.createdBy.uid) setPayoutAmount(creatorPayout);
                if (user.uid === currentRoom.player2?.uid) setPayoutAmount(joinerPayout);
    
                if (creatorPayout > 0) {
                    transaction.update(creatorRef, { balance: increment(creatorPayout) });
                    transaction.set(doc(collection(db, 'transactions')), {
                        userId: currentRoom.createdBy.uid, type: 'payout', amount: creatorPayout, status: 'completed',
                        description: creatorDesc, gameRoomId: roomId, createdAt: now, payoutTxId: payoutTxId
                    });
                }
                if (joinerPayout > 0) {
                    transaction.update(joinerRef, { balance: increment(joinerPayout) });
                    transaction.set(doc(collection(db, 'transactions')), {
                        userId: currentRoom.player2.uid, type: 'payout', amount: joinerPayout, status: 'completed',
                        description: joinerDesc, gameRoomId: roomId, createdAt: now, payoutTxId: payoutTxId
                    });
                }
                
                // Mark payout as processed
                transaction.update(roomRef, { payoutTransactionId: payoutTxId });
            });
    
        } catch (error) {
            console.error("Payout Transaction failed:", error);
        }
    }, [user, roomId]);


    const setWinner = useCallback(async (winnerId: string | 'draw' | null, boardState?: any, method: GameOverReason = 'checkmate') => {
        if (gameState.gameOver) return;
        stopTimer();
        
        if (isMultiplayer && room) {
            const roomRef = doc(db, 'game_rooms', room.id);
            const currentRoomDoc = await getDoc(roomRef);
            if(!currentRoomDoc.exists() || currentRoomDoc.data().status === 'completed') return;
            
            let updatePayload: any = { status: 'completed' };

            if(winnerId === 'draw') {
                updatePayload.draw = true;
                updatePayload.winner = { method: 'draw' }; // ensure method is set for draw
            } else if (winnerId) {
                updatePayload.winner = { uid: winnerId, method };
            }
            
            await updateDoc(roomRef, updatePayload);
        } else { // Practice mode
            const winner = winnerId === user?.uid ? 'p1' : 'p2';
            updateAndSaveState({ winner, gameOver: true, gameOverReason: method }, boardState);
        }
    }, [stopTimer, updateAndSaveState, isMultiplayer, user, gameState, room]);


    // Multiplayer state sync
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
            
            const elapsed = roomData.turnStartTime ? (Timestamp.now().toMillis() - roomData.turnStartTime.toMillis()) / 1000 : 0;
            const currentIsCreator = roomData.currentPlayer === roomData.createdBy.color;

            const p1ServerTime = currentIsCreator ? Math.max(0, roomData.p1Time - elapsed) : roomData.p1Time;
            const p2ServerTime = !currentIsCreator ? Math.max(0, roomData.p2Time - elapsed) : roomData.p2Time;
            
            let currentBoardState = roomData.boardState;
            if (gameType === 'checkers' && typeof currentBoardState === 'string') {
                try {
                    currentBoardState = { board: JSON.parse(currentBoardState) };
                } catch (e) {
                    console.error("Failed to parse checkers board state from string", e);
                    currentBoardState = { board: [] }; // Set a default to avoid crash
                }
            }

            setGameState(prevState => ({
                ...prevState,
                playerColor: pColor,
                boardState: currentBoardState,
                moveHistory: roomData.moveHistory || [],
                currentPlayer: roomData.currentPlayer,
                capturedByPlayer: isCreator ? roomData.capturedByP2 || [] : roomData.capturedByP1 || [],
                capturedByBot: isCreator ? roomData.capturedByP1 || [] : roomData.capturedByP2 || [],
                p1Time: isCreator ? p1ServerTime : p2ServerTime,
                p2Time: !isCreator ? p1ServerTime : p2ServerTime,
            }));
            
            if (!isMounted) setIsMounted(true);
        });
    
        return () => {
            unsubscribe();
            stopTimer();
        };
    
    }, [isMultiplayer, roomId, user, isMounted, stopTimer, handlePayout, gameState.gameOver, gameType]);


     // Timer countdown logic
    useEffect(() => {
        stopTimer();
        if (!isMounted || gameState.gameOver) {
            return;
        }

        const isMyTurn = gameState.currentPlayer === gameState.playerColor;
        
        // Timer for practice mode
        if(!isMultiplayer) {
            intervalRef.current = setInterval(() => {
                if (isMyTurn) {
                    const newTime = gameState.p1Time - 1;
                    if (newTime <= 0) {
                        setWinner('bot', gameState.boardState, 'timeout');
                    } else {
                        updateAndSaveState({ p1Time: newTime });
                    }
                } else {
                    const newTime = gameState.p2Time - 1;
                    if (newTime <= 0) {
                        setWinner(user?.uid || 'p1', gameState.boardState, 'timeout');
                    } else {
                         updateAndSaveState({ p2Time: newTime });
                    }
                }
            }, 1000);
        } else if (room && room.status === 'in-progress') { // Timer for multiplayer mode
             intervalRef.current = setInterval(() => {
                const elapsed = room.turnStartTime ? (Timestamp.now().toMillis() - room.turnStartTime.toMillis()) / 1000 : 0;
                const creatorIsCurrent = room.currentPlayer === room.createdBy.color;
                const opponentUid = room.players.find(p => p !== user?.uid);

                if (creatorIsCurrent) { // Creator's turn
                    const timeRemaining = room.p1Time - elapsed;
                    if (timeRemaining <= 0) {
                        setWinner(opponentUid || null, gameState.boardState, 'timeout');
                    }
                } else { // Joiner's turn
                    const timeRemaining = room.p2Time - elapsed;
                    if (timeRemaining <= 0) {
                        setWinner(room.createdBy.uid, gameState.boardState, 'timeout');
                    }
                }

                // Update local time for display purposes
                const p1ServerTime = creatorIsCurrent ? Math.max(0, room.p1Time - elapsed) : room.p1Time;
                const p2ServerTime = !creatorIsCurrent ? Math.max(0, room.p2Time - elapsed) : room.p2Time;
                const isCreator = room.createdBy.uid === user?.uid;

                setGameState(p => ({
                    ...p, 
                    p1Time: isCreator ? p1ServerTime : p2ServerTime, 
                    p2Time: !isCreator ? p1ServerTime : p2ServerTime
                }));
             }, 1000)
        }
    
        return () => stopTimer();
    
    }, [isMounted, gameState.gameOver, gameState.currentPlayer, gameState.playerColor, stopTimer, setWinner, gameState.boardState, isMultiplayer, room, user]);


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
        if (gameState.gameOver || (!room && isMultiplayer)) return;

        if (isMultiplayer && room) {
            const roomRef = doc(db, 'game_rooms', room.id);
            
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
             
            const now = Timestamp.now();
            const elapsedSeconds = room.turnStartTime ? (now.toMillis() - room.turnStartTime.toMillis()) / 1000 : 0;
            const creatorIsCurrent = room.currentPlayer === room.createdBy.color;

            const newP1Time = creatorIsCurrent ? room.p1Time - elapsedSeconds : room.p1Time;
            const newP2Time = !creatorIsCurrent ? room.p2Time - elapsedSeconds : room.p2Time;

            let finalBoardState = boardState;
            if(gameType === 'checkers' && boardState.board) {
                finalBoardState = JSON.stringify(boardState.board);
            }


            const updatePayload: any = {
                boardState: finalBoardState,
                currentPlayer: room.currentPlayer === 'w' ? 'b' : 'w',
                moveHistory: newMoveHistory,
                turnStartTime: now,
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
            moveHistory: newMoveHistory,
            moveCount: newMoveCount,
            capturedByPlayer: newCapturedByPlayer,
            capturedByBot: newCapturedByBot,
        }, boardState);
    };

    const handleResignConfirm = async () => {
        setShowResignModal(false);
        if (gameState.gameOver || !room || !user) return;
        const winnerId = room.players.find(p => p !== user.uid) || null;
        setWinner(winnerId, gameState.boardState, 'resign');
    };
    
    const resign = () => {
        if(isMultiplayer) {
            setShowResignModal(true);
        } else {
            // Practice mode resign
            setWinner('bot', gameState.boardState, 'checkmate');
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

    
