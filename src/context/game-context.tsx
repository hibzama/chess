
'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment, onSnapshot, writeBatch, collection, serverTimestamp, Timestamp, runTransaction, deleteDoc } from 'firebase/firestore';
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
    createdBy: { uid: string; color: PlayerColor; name: string; photoURL?: string; };
    player2?: { uid: string; color: PlayerColor, name: string; photoURL?: string; };
    players: string[];
    status: 'waiting' | 'in-progress' | 'completed';
    winner?: {
        uid: string | null,
        resignerId?: string | null,
        method: GameOverReason,
        resignerPieceCount?: number;
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
    playerPieceCount: number;
    opponentPieceCount: number;
}

interface GameContextType extends GameState {
    setupGame: (color: PlayerColor, time: number, diff: string) => void;
    switchTurn: (boardState: any, move?: string, capturedPiece?: Piece) => void;
    setWinner: (winnerId: string | 'draw' | null, boardState: any, method?: GameOverReason, resignerId?: string | null) => void;
    resetGame: () => void;
    loadGameState: (state: GameState) => void;
    isGameLoading: boolean;
    isMultiplayer: boolean;
    resign: () => void;
    roomWager: number;
    roomOpponentId: string | null;
    room: GameRoom | null;
    isMounted: boolean;
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
            playerPieceCount: gameType === 'chess' ? 16 : 12,
            opponentPieceCount: gameType === 'chess' ? 16 : 12,
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
    }, [storageKey, isMultiplayer, gameType]);

    const [gameState, setGameState] = useState<GameState>(getInitialState());
    const [room, setRoom] = useState<GameRoom | null>(null);
    const [isGameLoading, setIsGameLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    
    const gameOverHandledRef = useRef(false);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const updateAndSaveState = useCallback((newState: Partial<GameState>) => {
        setGameState(prevState => {
            const updatedState = { ...prevState, ...newState };
            if (!isMultiplayer && typeof window !== 'undefined') {
                 localStorage.setItem(storageKey, JSON.stringify(updatedState));
            }
            return updatedState;
        });
    }, [isMultiplayer, storageKey]);


    const handlePayout = useCallback(async (winnerDetails: { winnerId: string | 'draw' | null, method: GameOverReason, resignerId?: string | null }) => {
        if (!roomId || !user) return { myPayout: 0 };
    
        try {
            const payoutResult = await runTransaction(db, async (transaction) => {
                const roomRef = doc(db, 'game_rooms', roomId as string);
                const roomDoc = await transaction.get(roomRef);
    
                if (!roomDoc.exists() || !roomDoc.data()?.player2) throw "Room not found or not ready";
                if (roomDoc.data().payoutTransactionId) throw "Payout already processed";
    
                const roomData = roomDoc.data() as GameRoom;
                const wager = roomData.wager;
                let creatorPayout = 0, joinerPayout = 0;
                let creatorDesc = '', joinerDesc = '';
                
                const { winnerId, method, resignerId } = winnerDetails;
    
                 if (resignerId) { // Resignation logic
                    const isCreatorResigner = resignerId === roomData.createdBy.uid;
                    const totalPieces = gameType === 'chess' ? 16 : 12;
                    const resignerPieceCount = isCreatorResigner ? (totalPieces - (roomData.capturedByP2?.length || 0)) : (totalPieces - (roomData.capturedByP1?.length || 0));

                    let resignerRefundRate, winnerPayoutRate;
                    
                    if (resignerPieceCount >= 1 && resignerPieceCount <= 3) {
                        resignerRefundRate = 0.30;
                        winnerPayoutRate = 1.50;
                    } else if (resignerPieceCount > 3 && resignerPieceCount <= 6) {
                        resignerRefundRate = 0.50;
                        winnerPayoutRate = 1.30;
                    } else { 
                        resignerRefundRate = 0.75;
                        winnerPayoutRate = 1.05;
                    }

                    if (isCreatorResigner) {
                        creatorPayout = wager * resignerRefundRate;
                        joinerPayout = wager * winnerPayoutRate;
                    } else {
                        creatorPayout = wager * winnerPayoutRate;
                        joinerPayout = wager * resignerRefundRate;
                    }

                    creatorDesc = isCreatorResigner ? `Resignation Refund vs ${roomData.player2.name}` : `Forfeit Win vs ${roomData.player2.name}`;
                    joinerDesc = !isCreatorResigner ? `Resignation Refund vs ${roomData.createdBy.name}` : `Forfeit Win vs ${roomData.createdBy.name}`;
                    transaction.update(roomRef, { 'winner.resignerPieceCount': resignerPieceCount });

                } else if (winnerId === 'draw') { // Draw logic
                    creatorPayout = joinerPayout = wager * 0.9;
                    creatorDesc = `Draw refund vs ${roomData.player2.name}`;
                    joinerDesc = `Draw refund vs ${roomData.createdBy.name}`;
                } else if (winnerId) { // Win/loss logic
                    const isCreatorWinner = winnerId === roomData.createdBy.uid;
                    creatorPayout = isCreatorWinner ? wager * 1.8 : 0;
                    joinerPayout = !isCreatorWinner ? wager * 1.8 : 0;
                    const reason = method === 'checkmate' ? 'Win by checkmate' : (method === 'timeout' ? 'Win on time' : 'Win by capture');
                    creatorDesc = isCreatorWinner ? `${reason} vs ${roomData.player2.name}` : `Loss vs ${roomData.player2.name}`;
                    joinerDesc = !isCreatorWinner ? `${reason} vs ${roomData.createdBy.name}` : `Loss vs ${roomData.createdBy.name}`;
                    transaction.update(doc(db, 'users', winnerId), { wins: increment(1) });
                }
    
                const now = serverTimestamp();
                const payoutTxId = doc(collection(db, 'transactions')).id;
    
                if (creatorPayout > 0) {
                    transaction.update(doc(db, 'users', roomData.createdBy.uid), { balance: increment(creatorPayout) });
                    transaction.set(doc(collection(db, 'transactions')), { userId: roomData.createdBy.uid, type: 'payout', amount: creatorPayout, status: 'completed', description: creatorDesc, gameRoomId: roomId, createdAt: now, payoutTxId });
                }
                if (joinerPayout > 0) {
                    transaction.update(doc(db, 'users', roomData.player2.uid), { balance: increment(joinerPayout) });
                    transaction.set(doc(collection(db, 'transactions')), { userId: roomData.player2.uid, type: 'payout', amount: joinerPayout, status: 'completed', description: joinerDesc, gameRoomId: roomId, createdAt: now, payoutTxId });
                }
    
                transaction.update(roomRef, { 
                    status: 'completed',
                    winner: { uid: winnerId !== 'draw' ? winnerId : null, method, resignerId },
                    draw: winnerId === 'draw',
                    payoutTransactionId: payoutTxId 
                });
    
                return { myPayout: roomData.createdBy.uid === user.uid ? creatorPayout : joinerPayout };
            });
            return payoutResult;
        } catch (error) {
            if (String(error).includes('Payout already processed')) {
                 const roomDoc = await getDoc(doc(db, 'game_rooms', roomId as string));
                 if (roomDoc.exists()) {
                    const roomData = roomDoc.data() as GameRoom;
                    const wager = roomData.wager || 0;
                    const winnerData = roomData.winner;
                    if (winnerData?.resignerId) { // Resignation
                        const pieceCount = winnerData.resignerPieceCount ?? (gameType === 'chess' ? 16 : 12);
                        let resignerRefundRate, winnerPayoutRate;
                        
                        if (pieceCount >= 1 && pieceCount <= 3) {
                            resignerRefundRate = 0.30; winnerPayoutRate = 1.50;
                        } else if (pieceCount > 3 && pieceCount <= 6) {
                            resignerRefundRate = 0.50; winnerPayoutRate = 1.30;
                        } else {
                            resignerRefundRate = 0.75; winnerPayoutRate = 1.05;
                        }

                        return { myPayout: winnerData.resignerId === user.uid ? wager * resignerRefundRate : wager * winnerPayoutRate };
                    } else if (roomData.draw) { // Draw
                        return { myPayout: wager * 0.9 };
                    } else if (winnerData?.uid === user.uid) { // I won
                        return { myPayout: wager * 1.8 };
                    }
                 }
            } else {
                 console.error("Payout Transaction failed:", error);
            }
            return { myPayout: 0 };
        }
    }, [user, roomId, gameType]);

    const setWinner = useCallback((winnerId: string | 'draw' | null, boardState?: any, method: GameOverReason = 'checkmate', resignerId: string | null = null) => {
        if (gameOverHandledRef.current) return;
        setGameState(p => ({...p, isEnding: true}));
        
        if (isMultiplayer && roomId && user) {
            gameOverHandledRef.current = true;
            handlePayout({ winnerId, method, resignerId }).then(({ myPayout }) => {
                const winnerIsMe = winnerId === user.uid;
                updateAndSaveState({ gameOver: true,
                    winner: winnerId === 'draw' ? 'draw' : (winnerIsMe ? 'p1' : 'p2'),
                    gameOverReason: method, payoutAmount: myPayout,
                });
            });
        } else {
            gameOverHandledRef.current = true;
            const winner = winnerId === 'bot' ? 'p2' : (winnerId ? 'p1' : 'draw');
            updateAndSaveState({ winner: winner as Winner, gameOver: true, gameOverReason: method, boardState });
        }
    }, [updateAndSaveState, isMultiplayer, roomId, user, handlePayout]);

    // Multiplayer state sync
    useEffect(() => {
        if (!isMultiplayer || !roomId || !user) {
            setIsGameLoading(false);
            return;
        }

        const roomRef = doc(db, 'game_rooms', roomId as string);
        const unsubscribe = onSnapshot(roomRef, (docSnap) => {
            if (!docSnap.exists()) {
                router.push('/lobby');
                return;
            }

            const roomData = { id: docSnap.id, ...docSnap.data() } as GameRoom;
            setRoom(roomData);

            if (roomData.status === 'completed' && !gameOverHandledRef.current) {
                gameOverHandledRef.current = true;
                const winnerIsMe = roomData.winner?.uid === user.uid;
                const iAmResigner = roomData.winner?.resignerId === user.uid;
                const wager = roomData.wager || 0;
                let myPayout = 0;

                 if (iAmResigner) {
                    const pieceCount = roomData.winner?.resignerPieceCount ?? (gameType === 'chess' ? 16 : 12);
                    if(pieceCount >= 1 && pieceCount <= 3) myPayout = wager * 0.3;
                    else if (pieceCount > 3 && pieceCount <= 6) myPayout = wager * 0.5;
                    else myPayout = wager * 0.75;
                } else if (roomData.winner?.resignerId) {
                    const pieceCount = roomData.winner?.resignerPieceCount ?? (gameType === 'chess' ? 16 : 12);
                    if(pieceCount >= 1 && pieceCount <= 3) myPayout = wager * 1.5;
                    else if (pieceCount > 3 && pieceCount <= 6) myPayout = wager * 1.3;
                    else myPayout = wager * 1.05;
                } else if (roomData.draw) {
                    myPayout = wager * 0.9;
                } else if (winnerIsMe) {
                    myPayout = wager * 1.8;
                }
                
                setGameState(prevState => ({
                    ...prevState,
                    boardState: roomData.boardState,
                    gameOver: true,
                    winner: roomData.draw ? 'draw' : (winnerIsMe ? 'p1' : 'p2'),
                    gameOverReason: roomData.winner?.method || null,
                    payoutAmount: myPayout,
                }));
                return;
            }

            if (roomData.status === 'waiting' || roomData.status === 'in-progress') {
                const isCreator = roomData.createdBy.uid === user.uid;
                const myColor = isCreator ? roomData.createdBy.color : (roomData.player2 ? roomData.player2.color : 'w');

                let boardData = roomData.boardState;
                if(gameType === 'checkers' && typeof boardData === 'string') {
                    try { boardData = { board: JSON.parse(boardData) }; } catch { boardData = null;}
                }
                
                setGameState(prev => ({
                    ...prev,
                    playerColor: myColor, 
                    boardState: boardData,
                    moveHistory: roomData.moveHistory || [], 
                    moveCount: roomData.moveHistory?.length || 0,
                    currentPlayer: roomData.currentPlayer, 
                    capturedByPlayer: isCreator ? (roomData.capturedByP2 || []) : (roomData.capturedByP1 || []),
                    capturedByBot: isCreator ? (roomData.capturedByP1 || []) : (roomData.capturedByP2 || []), // Using bot for opponent
                    p1Time: isCreator ? roomData.p1Time : roomData.p2Time,
                    p2Time: !isCreator ? roomData.p1Time : roomData.p2Time,
                    playerPieceCount: (gameType === 'chess' ? 16 : 12) - (isCreator ? (roomData.capturedByP2?.length || 0) : (roomData.capturedByP1?.length || 0)),
                    opponentPieceCount: (gameType === 'chess' ? 16 : 12) - (isCreator ? (roomData.capturedByP1?.length || 0) : (roomData.capturedByP2?.length || 0)),
                }));

                if (isGameLoading) setIsGameLoading(false);
            }
        });

        return () => unsubscribe();
    }, [isMultiplayer, roomId, user, router, gameType, isGameLoading]);

     // Real-time Timer Logic
    useEffect(() => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (gameState.gameOver || !isMounted || !room || room.status !== 'in-progress') return;

        timerIntervalRef.current = setInterval(() => {
            if (gameOverHandledRef.current) {
                if(timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                return;
            }

            const elapsed = (Timestamp.now().toMillis() - room.turnStartTime.toMillis()) / 1000;
            const currentIsCreator = room.currentPlayer === room.createdBy.color;

            const p1ServerTime = currentIsCreator ? Math.max(0, room.p1Time - elapsed) : room.p1Time;
            const p2ServerTime = !currentIsCreator ? Math.max(0, room.p2Time - elapsed) : room.p2Time;
            
            const isCreator = room.createdBy.uid === user?.uid;
            updateAndSaveState({
                p1Time: isCreator ? p1ServerTime : p2ServerTime,
                p2Time: !isCreator ? p1ServerTime : p2ServerTime,
            });
            
            if (p1ServerTime <= 0) {
                setWinner(room.player2?.uid || '', room.boardState, 'timeout');
                 if(timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            } else if (p2ServerTime <= 0) {
                setWinner(room.createdBy.uid, room.boardState, 'timeout');
                 if(timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            }
        }, 1000);

        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [isMounted, gameState.gameOver, room, user, updateAndSaveState, setWinner]);

    const switchTurn = useCallback(async (boardState: any, move?: string, capturedPiece?: Piece) => {
        if (gameState.gameOver || gameState.isEnding) return;

        const updateLogic = (prevState: GameState) => {
            const p1IsCurrent = prevState.playerColor === prevState.currentPlayer;
            let newMoveHistory = [...prevState.moveHistory];
            let newMoveCount = prevState.moveCount + 1;
            
            if (move) {
                if (prevState.currentPlayer === 'w') {
                    newMoveHistory.push({ turn: Math.floor((newMoveCount - 1) / 2) + 1, white: move });
                } else {
                    const lastMoveIndex = newMoveHistory.length - 1;
                    if (lastMoveIndex >= 0 && !newMoveHistory[lastMoveIndex].black) {
                        newMoveHistory[lastMoveIndex] = { ...newMoveHistory[lastMoveIndex], black: move };
                    } else {
                        newMoveHistory.push({ turn: Math.floor((newMoveCount - 1) / 2) + 1, black: move });
                    }
                }
            }

            const newCapturedByPlayer = capturedPiece && !p1IsCurrent ? [...prevState.capturedByPlayer, capturedPiece] : prevState.capturedByPlayer;
            const newCapturedByBot = capturedPiece && p1IsCurrent ? [...prevState.capturedByBot, capturedPiece] : prevState.capturedByBot;

            const nextPlayer = prevState.currentPlayer === 'w' ? 'b' : 'w';

            return {
                ...prevState,
                boardState,
                currentPlayer: nextPlayer,
                moveHistory: newMoveHistory,
                moveCount: newMoveCount,
                capturedByPlayer: newCapturedByPlayer,
                capturedByBot: newCapturedByBot,
            };
        };

        if (isMultiplayer && room) {
            const roomRef = doc(db, 'game_rooms', room.id);
            const now = Timestamp.now();
            const elapsedSeconds = room.turnStartTime ? (now.toMillis() - room.turnStartTime.toMillis()) / 1000 : 0;
            const creatorIsCurrent = room.currentPlayer === room.createdBy.color;

            const newP1Time = creatorIsCurrent ? room.p1Time - elapsedSeconds : room.p1Time;
            const newP2Time = !creatorIsCurrent ? room.p2Time - elapsedSeconds : room.p2Time;

            let finalBoardState = boardState;
            if (gameType === 'checkers' && boardState.board) {
                finalBoardState = JSON.stringify(boardState.board);
            }

            const updatedGameState = updateLogic(gameState);
            
            const updatePayload: any = {
                boardState: finalBoardState,
                currentPlayer: updatedGameState.currentPlayer,
                moveHistory: updatedGameState.moveHistory,
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
        } else {
            setGameState(prevState => {
                const newState = updateLogic(prevState);
                if (typeof window !== 'undefined') {
                    localStorage.setItem(storageKey, JSON.stringify(newState));
                }
                return newState;
            });
        }
    }, [gameState, isMultiplayer, room, gameType, storageKey]);
    

    const loadGameState = useCallback((state: GameState) => { updateAndSaveState(state); }, [updateAndSaveState]);
    
    const setupGame = useCallback((color: PlayerColor, time: number, diff: string) => {
        gameOverHandledRef.current = false;
        if (!isMultiplayer && typeof window !== 'undefined') localStorage.removeItem(storageKey);
        const defaultState = getInitialState();
        const newState: GameState = { ...defaultState, playerColor: color, timeLimit: time, difficulty: diff, p1Time: time, p2Time: time };
        updateAndSaveState(newState);
    }, [isMultiplayer, storageKey, getInitialState, updateAndSaveState]);

    
    const resign = useCallback(() => { 
        if (gameState.gameOver || gameState.isEnding || !user) return; 
        if (isMultiplayer && room) { 
            const winnerId = room.players.find((p)=>p !== user.uid) || null; 
            setWinner(winnerId, gameState.boardState, 'resign', user.uid); 
        } else { 
            setWinner('bot', gameState.boardState, 'resign', user.uid); 
        } 
    }, [gameState, user, room, isMultiplayer, setWinner]);
    
    const resetGame = useCallback(() => { 
        gameOverHandledRef.current = false; 
        if(typeof window !== 'undefined' && !isMultiplayer) { 
            localStorage.removeItem(storageKey); 
        } 
        const defaultState = getInitialState(); 
        setGameState(defaultState); 
        setRoom(null); 
    }, [isMultiplayer, storageKey, getInitialState]);
    
    const getOpponentId = () => { if (!user || !room || !room.players || !room.player2) return null; return room.players.find(p => p !== user.uid) || null; };

    const contextValue = { ...gameState, isMounted, setupGame, switchTurn, setWinner, resign, resetGame, loadGameState, isMultiplayer, roomWager: room?.wager || 0, roomOpponentId: getOpponentId(), room, isGameLoading };

    return ( <GameContext.Provider value={contextValue}> {children} </GameContext.Provider> );
};

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) { throw new Error('useGame must be used within a GameProvider'); }
    return context;
};

    