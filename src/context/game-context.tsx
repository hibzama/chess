
'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment, onSnapshot, writeBatch, collection, serverTimestamp, Timestamp, runTransaction, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from './auth-context';
import { useParams, useRouter } from 'next/navigation';
import { Chess } from 'chess.js';

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
    timeControl: number;
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
    updateAndSaveState: (newState: Partial<GameState>) => void; // Expose this for checkers multi-jump
    setWinner: (winnerId: string | 'draw' | null, boardState: any, method?: GameOverReason, resignerDetails?: {id: string, pieceCount: number} | null) => void;
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

const createInitialCheckersBoard = () => {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if ((r + c) % 2 !== 0) { // Dark squares
                if (r < 3) board[r][c] = { player: 'b', type: 'pawn' };
                else if (r > 4) board[r][c] = { player: 'w', type: 'pawn' };
            }
        }
    }
    return { board };
};


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
            boardState: gameType === 'checkers' ? createInitialCheckersBoard() : null,
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
                // Ensure boardState is correctly structured for checkers
                if(gameType === 'checkers' && parsed.boardState && !parsed.boardState.board) {
                    parsed.boardState = { board: parsed.boardState };
                }
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


    const handlePayout = useCallback(async (winnerDetails: { winnerId: string | 'draw' | null, method: GameOverReason, resignerDetails?: {id: string, pieceCount: number} | null }) => {
        if (!roomId || !user) return { myPayout: 0 };
    
        try {
            const payoutResult = await runTransaction(db, async (transaction) => {
                const roomRef = doc(db, 'game_rooms', roomId as string);
                const roomDoc = await transaction.get(roomRef);
    
                if (!roomDoc.exists() || !roomDoc.data()?.player2) throw "Room not found or not ready";
                if (roomDoc.data().payoutTransactionId) throw "Payout already processed";
    
                const roomData = roomDoc.data() as GameRoom;
                const { method, resignerDetails } = winnerDetails;
                let { winnerId } = winnerDetails;
    
                if (resignerDetails) {
                    winnerId = roomData.players.find(p => p !== resignerDetails.id) || null;
                }
    
                const wager = roomData.wager;
                let creatorPayout = 0, joinerPayout = 0;
                let creatorDesc = '', joinerDesc = '';
                const winnerObject: GameRoom['winner'] = { uid: null, method };
    
                if (winnerId === 'draw') {
                    creatorPayout = joinerPayout = wager * 0.9;
                    creatorDesc = `Draw refund vs ${roomData.player2.name}`;
                    joinerDesc = `Draw refund vs ${roomData.createdBy.name}`;
                } else if (winnerId) {
                    const isCreatorWinner = winnerId === roomData.createdBy.uid;
                    creatorPayout = isCreatorWinner ? wager * 1.8 : 0;
                    joinerPayout = !isCreatorWinner ? wager * 1.8 : 0;
                    
                    const reason = resignerDetails ? 'Win by opponent resignation' : (method === 'checkmate' ? 'Win by checkmate' : (method === 'timeout' ? 'Win on time' : 'Win by capture'));
                    creatorDesc = isCreatorWinner ? `${reason} vs ${roomData.player2.name}` : `Loss vs ${roomData.player2.name}`;
                    joinerDesc = !isCreatorWinner ? `${reason} vs ${roomData.createdBy.name}` : `Loss vs ${roomData.createdBy.name}`;
                    
                    winnerObject.uid = winnerId;
                    if(resignerDetails){
                        winnerObject.resignerId = resignerDetails.id;
                    }
                }
    
                const now = serverTimestamp();
                const payoutTxId = doc(collection(db, 'transactions')).id;
    
                if (creatorPayout > 0) {
                    transaction.update(doc(db, 'users', roomData.createdBy.uid), { balance: increment(creatorPayout) });
                    const creatorTxData: any = { userId: roomData.createdBy.uid, type: 'payout', amount: creatorPayout, status: 'completed', description: creatorDesc, gameRoomId: roomId, createdAt: now, payoutTxId, gameWager: wager, resignerId: resignerDetails?.id || null };
                    if(roomData.createdBy.uid === winnerId) creatorTxData.winnerId = winnerId;
                    transaction.set(doc(collection(db, 'transactions')), creatorTxData);
                }
                if (joinerPayout > 0) {
                    transaction.update(doc(db, 'users', roomData.player2.uid), { balance: increment(joinerPayout) });
                    const joinerTxData: any = { userId: roomData.player2.uid, type: 'payout', amount: joinerPayout, status: 'completed', description: joinerDesc, gameRoomId: roomId, createdAt: now, payoutTxId, gameWager: wager, resignerId: resignerDetails?.id || null };
                    if(roomData.player2.uid === winnerId) joinerTxData.winnerId = winnerId;
                    transaction.set(doc(collection(db, 'transactions')), joinerTxData);
                }
                
                if (winnerId && winnerId !== 'draw') {
                    transaction.update(doc(db, 'users', winnerId), { wins: increment(1) });
                }
    
                transaction.update(roomRef, { 
                    status: 'completed',
                    winner: winnerObject,
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
                   if (roomData.draw) return { myPayout: wager * 0.9 };
                   if (roomData.winner?.uid === user.uid) return { myPayout: wager * 1.8 };
                }
            } else {
                 console.error("Payout Transaction failed:", error);
            }
            return { myPayout: 0 };
        }
    }, [user, roomId]);

    const setWinner = useCallback((winnerId: string | 'draw' | null, boardState?: any, method: GameOverReason = 'checkmate', resignerDetails: {id: string, pieceCount: number} | null = null) => {
        if (gameOverHandledRef.current) return;
        setGameState(p => ({...p, isEnding: true}));
        
        if (isMultiplayer && roomId && user) {
            gameOverHandledRef.current = true;
            handlePayout({ winnerId, method, resignerDetails }).then(({ myPayout }) => {
                let finalWinnerId = winnerId;
                if (resignerDetails) {
                    finalWinnerId = room?.players.find(p => p !== resignerDetails.id) || null;
                }

                const winnerIsMe = finalWinnerId === user.uid;

                updateAndSaveState({ gameOver: true,
                    winner: finalWinnerId === 'draw' ? 'draw' : (winnerIsMe ? 'p1' : 'p2'),
                    gameOverReason: method, payoutAmount: myPayout,
                });
            });
        } else {
            gameOverHandledRef.current = true;
            const winner = winnerId === 'bot' ? 'p2' : (winnerId ? 'p1' : 'draw');
            updateAndSaveState({ winner: winner as Winner, gameOver: true, gameOverReason: method, boardState });
        }
    }, [updateAndSaveState, isMultiplayer, roomId, user, handlePayout, room]);

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

                if (roomData.draw) {
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
                if (gameType === 'checkers') {
                    if (typeof roomData.boardState === 'string') {
                        try {
                             boardData = { board: JSON.parse(roomData.boardState) };
                        } catch (e) {
                             boardData = createInitialCheckersBoard();
                        }
                    } else if (!roomData.boardState) {
                        boardData = createInitialCheckersBoard();
                    }
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

            let p1ServerTime = currentIsCreator ? Math.max(0, room.p1Time - elapsed) : room.p1Time;
            let p2ServerTime = !currentIsCreator ? Math.max(0, room.p2Time - elapsed) : room.p2Time;

            // Clamp time to not exceed the initial time control
            p1ServerTime = Math.min(p1ServerTime, room.timeControl);
            p2ServerTime = Math.min(p2ServerTime, room.timeControl);
            
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
            
            const finalBoardState = gameType === 'checkers' && boardState.board ? { board: boardState.board } : boardState;
    
            return {
                ...prevState,
                boardState: finalBoardState,
                currentPlayer: nextPlayer,
                moveHistory: newMoveHistory,
                moveCount: newMoveCount,
                capturedByPlayer: newCapturedByPlayer,
                capturedByBot: newCapturedByBot,
            };
        };
        
        const updatedGameState = updateLogic(gameState);
        
        // --- Check for Game Over Conditions ---
        if (gameType === 'chess') {
            const game = new Chess(boardState);
            if (game.isCheckmate()) {
                const winnerColor = gameState.currentPlayer;
                const winnerUid = room?.createdBy.color === winnerColor ? room?.createdBy.uid : room?.player2?.uid;
                setWinner(winnerUid!, boardState, 'checkmate');
                return;
            } else if (game.isDraw()) {
                setWinner('draw', boardState, 'draw');
                return;
            }
        } else if (gameType === 'checkers') {
            const board = boardState.board as ({player: PlayerColor} | null)[][];
            let whitePieces = 0;
            let blackPieces = 0;
            board.forEach(row => row.forEach(piece => {
                if (piece) {
                    if (piece.player === 'w') whitePieces++;
                    else if (piece.player === 'b') blackPieces++;
                }
            }));
            
            if (whitePieces === 0) {
                 const winnerUid = room?.createdBy.color === 'b' ? room?.createdBy.uid : room?.player2?.uid;
                setWinner(winnerUid!, boardState, 'piece-capture');
                return;
            } else if (blackPieces === 0) {
                 const winnerUid = room?.createdBy.color === 'w' ? room?.createdBy.uid : room?.player2?.uid;
                 setWinner(winnerUid!, boardState, 'piece-capture');
                return;
            }
        }
    
        // If game is not over, proceed with turn switch
        if (isMultiplayer && room) {
            const roomRef = doc(db, 'game_rooms', room.id);
            const now = Timestamp.now();
            const elapsedSeconds = room.turnStartTime ? Math.max(0, (now.toMillis() - room.turnStartTime.toMillis()) / 1000) : 0;
            const creatorIsCurrent = room.currentPlayer === room.createdBy.color;
    
            const newP1Time = Math.max(0, creatorIsCurrent ? room.p1Time - elapsedSeconds : room.p1Time);
            const newP2Time = Math.max(0, !creatorIsCurrent ? room.p2Time - elapsedSeconds : room.p2Time);
    
            let finalBoardStateForFirestore = boardState;
            if (gameType === 'checkers' && boardState.board) {
                finalBoardStateForFirestore = JSON.stringify(boardState.board);
            }
            
            const updatePayload: any = {
                boardState: finalBoardStateForFirestore,
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
                if (typeof window !== 'undefined') {
                    localStorage.setItem(storageKey, JSON.stringify(updatedGameState));
                }
                return updatedGameState;
            });
        }
    }, [gameState, isMultiplayer, room, gameType, storageKey, setWinner, user]);
    

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
            const resignerDetails = {id: user.uid, pieceCount: gameState.playerPieceCount};
            setWinner(winnerId, gameState.boardState, 'resign', resignerDetails); 
        } else { 
            const resignerDetails = {id: user.uid, pieceCount: gameState.playerPieceCount};
            setWinner('bot', gameState.boardState, 'resign', resignerDetails); 
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

    const contextValue = { ...gameState, isMounted, setupGame, switchTurn, updateAndSaveState, setWinner, resign, resetGame, loadGameState, isMultiplayer, roomWager: room?.wager || 0, roomOpponentId: getOpponentId(), room, isGameLoading };

    return ( <GameContext.Provider value={contextValue}> {children} </GameContext.Provider> );
};

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) { throw new Error('useGame must be used within a GameProvider'); }
    return context;
};
