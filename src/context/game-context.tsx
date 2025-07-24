

'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment, onSnapshot, writeBatch, collection, serverTimestamp, Timestamp, runTransaction } from 'firebase/firestore';
import { useAuth } from './auth-context';
import { useParams, useRouter } from 'next/navigation';

type PlayerColor = 'w' | 'b';
type Player = 'p1' | 'p2';
type Winner = 'p1' | 'p2' | 'draw' | null;
type Piece = { type: string; color: 'w' | 'b' | Player };
export type GameOverReason = 'checkmate' | 'timeout' | 'resign' | 'draw' | 'piece-capture' | null;

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
        uid: string | null,
        resignerId?: string | null,
        method: GameOverReason
    };
    draw?: boolean;
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
    payoutAmount: number | null;
    isEnding: boolean;
}

interface GameContextType extends GameState {
    setupGame: (color: PlayerColor, time: number, diff: string) => void;
    switchTurn: (boardState: any, move?: string, capturedPiece?: Piece) => void;
    setWinner: (winnerId: string | 'draw' | null, boardState: any, method?: GameOverReason, resignerId?: string | null) => void;
    resetGame: () => void;
    loadGameState: (state: GameState) => void;
    isMounted: boolean;
    isMultiplayer: boolean;
    resign: () => void;
    roomWager: number;
    roomOpponentId: string | null;
    room: GameRoom | null;
}

type Move = { turn: number; white?: string; black?: string };

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
            payoutAmount: null,
            isEnding: false,
        };
        if(isMultiplayer) return defaultState; // Multiplayer uses firestore state
        try {
            const savedState = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
            if (savedState) {
                const parsed = JSON.parse(savedState);
                return { ...defaultState, ...parsed, gameOver: false, winner: null, isEnding: false };
            }
        } catch (error) {
            console.error("Failed to parse game state from localStorage", error);
        }
        return defaultState;
    }, [storageKey, isMultiplayer]);

    const [gameState, setGameState] = useState<GameState>(getInitialState());
    const [room, setRoom] = useState<GameRoom | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const gameOverHandledRef = useRef(false);

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

    const handlePayout = useCallback(async (currentRoom: GameRoom): Promise<{ myPayout: number }> => {
        if (!roomId || !user) return { myPayout: 0 };
    
        return runTransaction(db, async (transaction) => {
            const roomRef = doc(db, 'game_rooms', roomId as string);
            const roomDoc = await transaction.get(roomRef);
    
            if (!roomDoc.exists()) throw "Room does not exist!";
            const roomData = roomDoc.data() as GameRoom;
    
            if (roomData.payoutTransactionId) {
                // If payout already happened, determine what my payout was.
                let myPayout = 0;
                if (roomData.draw) {
                    myPayout = roomData.wager * 0.9;
                } else if (roomData.winner?.resignerId) {
                    myPayout = roomData.winner.resignerId === user.uid ? roomData.wager * 0.75 : roomData.wager * 1.05;
                } else if (roomData.winner?.uid === user.uid) {
                    myPayout = roomData.wager * 1.8;
                }
                return { myPayout };
            }
    
            if (!roomData.player2) return { myPayout: 0 };
    
            let creatorPayout = 0;
            let joinerPayout = 0;
            const creatorRef = doc(db, 'users', roomData.createdBy.uid);
            const joinerRef = doc(db, 'users', roomData.player2.uid);
            
            const wager = roomData.wager;
            const now = serverTimestamp();
            const payoutTxId = doc(collection(db, 'transactions')).id; 
    
            let creatorDesc = '';
            let joinerDesc = '';
    
            if (roomData.draw) {
                creatorPayout = wager * 0.9;
                joinerPayout = wager * 0.9;
                creatorDesc = `Draw refund vs ${roomData.player2.name}`;
                joinerDesc = `Draw refund vs ${roomData.createdBy.name}`;
            } else if (roomData.winner) {
                 if (roomData.winner.resignerId) {
                    const resignerIsCreator = roomData.winner.resignerId === roomData.createdBy.uid;
                    creatorPayout = resignerIsCreator ? wager * 0.75 : wager * 1.05;
                    joinerPayout = !resignerIsCreator ? wager * 0.75 : wager * 1.05;
                    creatorDesc = resignerIsCreator ? `Resignation Refund vs ${roomData.player2.name}` : `Forfeit Win vs ${roomData.player2.name}`;
                    joinerDesc = !resignerIsCreator ? `Resignation Refund vs ${roomData.createdBy.name}` : `Forfeit Win vs ${roomData.createdBy.name}`;
                } else {
                    const winnerIsCreator = roomData.winner.uid === roomData.createdBy.uid;
                    creatorPayout = winnerIsCreator ? wager * 1.8 : 0;
                    joinerPayout = !winnerIsCreator ? wager * 1.8 : 0;
                    const reason = roomData.winner.method === 'checkmate' ? 'Win by checkmate' : (roomData.winner.method === 'timeout' ? 'Win on time' : 'Win by capture');
                    creatorDesc = winnerIsCreator ? `${reason} vs ${roomData.player2.name}` : `Loss vs ${roomData.createdBy.name}`;
                    joinerDesc = !winnerIsCreator ? `${reason} vs ${roomData.createdBy.name}` : `Loss vs ${roomData.player2.name}`;
                }
            }
    
            if (creatorPayout > 0) {
                transaction.update(creatorRef, { balance: increment(creatorPayout) });
                transaction.set(doc(collection(db, 'transactions')), {
                    userId: roomData.createdBy.uid, type: 'payout', amount: creatorPayout, status: 'completed',
                    description: creatorDesc, gameRoomId: roomId, createdAt: now, payoutTxId: payoutTxId
                });
            }
            if (joinerPayout > 0) {
                transaction.update(joinerRef, { balance: increment(joinerPayout) });
                transaction.set(doc(collection(db, 'transactions')), {
                    userId: roomData.player2.uid, type: 'payout', amount: joinerPayout, status: 'completed',
                    description: joinerDesc, gameRoomId: roomId, createdAt: now, payoutTxId: payoutTxId
                });
            }
            
            transaction.update(roomRef, { payoutTransactionId: payoutTxId });
            const isCreator = currentRoom.createdBy.uid === user.uid;
            return { myPayout: isCreator ? creatorPayout : joinerPayout };
        }).catch(error => {
            console.error("Payout Transaction failed:", error);
            return { myPayout: 0 };
        })
    }, [user, roomId, gameType]);


    const setWinner = useCallback(async (winnerId: string | 'draw' | null, boardState?: any, method: GameOverReason = 'checkmate', resignerId: string | null = null) => {
        if (gameState.isEnding || gameOverHandledRef.current) return;

        setGameState(p => ({...p, isEnding: true}));
        stopTimer();
        
        if (isMultiplayer && roomId && user) {
            try {
                const roomRef = doc(db, 'game_rooms', roomId);
                const currentRoomDoc = await getDoc(roomRef);
                if(!currentRoomDoc.exists() || currentRoomDoc.data().status === 'completed') return;
                
                let updatePayload: any = { status: 'completed' };
                if(winnerId === 'draw') {
                    updatePayload.draw = true;
                    updatePayload.winner = { uid: null, method: 'draw' };
                } else if (winnerId) {
                     updatePayload.winner = { uid: winnerId, method, resignerId };
                }
                await updateDoc(roomRef, updatePayload);
            } catch (error) {
                console.error("Failed to set winner in database", error);
                setGameState(p => ({...p, isEnding: false})); // Re-enable game if db update fails
            }
        } else { // Practice mode
            const winner = winnerId === 'bot' ? 'p2' : (winnerId ? 'p1' : 'draw');
            updateAndSaveState({ winner: winner as Winner, gameOver: true, gameOverReason: method, isEnding: false }, boardState);
            gameOverHandledRef.current = true;
        }
    }, [stopTimer, updateAndSaveState, isMultiplayer, roomId, user, gameState.isEnding]);


    // Multiplayer state sync
    useEffect(() => {
        if (!isMultiplayer || !roomId || !user) {
            setIsMounted(true);
            return;
        }
    
        const roomRef = doc(db, 'game_rooms', roomId as string);
        const unsubscribe = onSnapshot(roomRef, (docSnap) => {
            if (!docSnap.exists() || !user) return;
            
            const roomData = { id: docSnap.id, ...docSnap.data() } as GameRoom;
            setRoom(roomData);

            if (roomData.status === 'completed') {
                if (gameOverHandledRef.current) return;
                
                stopTimer();

                handlePayout(roomData).then(({ myPayout }) => {
                    if (gameOverHandledRef.current) return;
                    gameOverHandledRef.current = true;
                    
                    const winnerIsMe = roomData.winner?.uid === user.uid;

                    setGameState(prevState => ({
                        ...prevState,
                        boardState: roomData.boardState,
                        gameOver: true,
                        winner: roomData.draw ? 'draw' : (winnerIsMe ? 'p1' : 'p2'),
                        gameOverReason: roomData.draw ? 'draw' : roomData.winner?.method || null,
                        payoutAmount: myPayout,
                        isEnding: false
                    }));
                });

                return;
            }

            if (roomData.status === 'waiting') {
                 if (!isMounted) setIsMounted(true);
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
                    currentBoardState = { board: [] }; 
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
    
    }, [isMultiplayer, roomId, user, isMounted, stopTimer, gameType, handlePayout]);


     // Timer countdown logic
    useEffect(() => {
        stopTimer();
        if (!isMounted || gameState.gameOver || gameState.isEnding) {
            return;
        }

        const isMyTurn = gameState.currentPlayer === gameState.playerColor;
        
        if(!isMultiplayer) { // Practice mode timer
            intervalRef.current = setInterval(() => {
                if(gameState.isEnding || gameOverHandledRef.current) { stopTimer(); return; }
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
        } else if (room && room.status === 'in-progress') { // Multiplayer mode timer
             intervalRef.current = setInterval(() => {
                if(gameState.isEnding || gameOverHandledRef.current) { stopTimer(); return; }
                const elapsed = room.turnStartTime ? (Timestamp.now().toMillis() - room.turnStartTime.toMillis()) / 1000 : 0;
                
                const creatorIsCurrent = room.currentPlayer === room.createdBy.color;
                const isCreator = room.createdBy.uid === user?.uid;

                const creatorTimeRemaining = room.p1Time - (creatorIsCurrent ? elapsed : 0);
                const joinerTimeRemaining = room.p2Time - (!creatorIsCurrent ? elapsed : 0);
                
                const p1Time = isCreator ? creatorTimeRemaining : joinerTimeRemaining;
                const p2Time = !isCreator ? creatorTimeRemaining : joinerTimeRemaining;

                setGameState(p => ({ ...p, p1Time, p2Time }));

                if (creatorTimeRemaining <= 0 && room.player2?.uid) {
                    setWinner(room.player2.uid, room.boardState, 'timeout');
                } else if (joinerTimeRemaining <= 0) {
                     setWinner(room.createdBy.uid, room.boardState, 'timeout');
                }
             }, 1000)
        }
    
        return () => stopTimer();
    
    }, [isMounted, gameState.gameOver, gameState.currentPlayer, gameState.playerColor, stopTimer, setWinner, gameState.boardState, isMultiplayer, room, user, updateAndSaveState, gameState.isEnding]);


    const loadGameState = (state: GameState) => {
        setGameState(state);
    };

    const setupGame = (color: PlayerColor, time: number, diff: string) => {
        gameOverHandledRef.current = false;
        const newState: GameState = {
            ...getInitialState(),
            playerColor: color,
            timeLimit: time,
            difficulty: diff,
            p1Time: time,
            p2Time: time,
        };
        updateAndSaveState(newState);
    };

    const switchTurn = async (boardState: any, move?: string, capturedPiece?: Piece) => {
        if (gameState.gameOver || gameState.isEnding || (!room && isMultiplayer)) return;

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
                const pieceToStore = { type: capturedPiece.type, color: capturedPiece.color };
                if (room.currentPlayer === room.createdBy.color) { // Creator captured a piece
                    updatePayload.capturedByP1 = [...(room.capturedByP1 || []), pieceToStore];
                } else { // Joiner captured a piece
                    updatePayload.capturedByP2 = [...(room.capturedByP2 || []), pieceToStore];
                }
            }

            await updateDoc(roomRef, updatePayload);
            return;
        }

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

    const resign = () => {
        if (gameState.gameOver || gameState.isEnding || !user) return;
        if (isMultiplayer && room) {
            const winnerId = room.players.find((p)=>p !== user.uid) || null;
            setWinner(winnerId, gameState.boardState, 'resign', user.uid);
        } else {
            setWinner('bot', gameState.boardState, 'resign', user.uid);
        }
    }


    const resetGame = () => {
        gameOverHandledRef.current = false;
        if(typeof window !== 'undefined' && !isMultiplayer) {
          localStorage.removeItem(storageKey);
        }
        const defaultState: GameState = getInitialState();
        setGameState(defaultState);
        setRoom(null);
        stopTimer();
    };

    const getOpponentId = () => {
        if (!user || !room || !room.players) return null;
        return room.players.find(p => p !== user.uid) || null;
    }

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
        roomWager: room?.wager || 0,
        roomOpponentId: getOpponentId(),
        room,
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
