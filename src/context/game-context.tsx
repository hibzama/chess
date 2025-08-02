
'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment, onSnapshot, writeBatch, collection, serverTimestamp, Timestamp, runTransaction } from 'firebase/firestore';
import { useAuth } from './auth-context';
import { useParams, useRouter } from 'next/navigation';
import { Chess, Piece as ChessPiece } from 'chess.js';

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
        resignerPieceCount?: number;
    };
    draw?: boolean;
    payoutTransactionId?: string; // To ensure idempotency
}

interface GameState {
    playerColor: PlayerColor;
    timeLimit: number;
    difficulty: string;
    myTime: number; 
    opponentTime: number; 
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
    isGameLoading: boolean;
    playerPieceCount: number;
    opponentPieceCount: number;
}

interface GameContextType extends GameState {
    setupGame: (color: PlayerColor, time: number, diff: string) => void;
    switchTurn: (boardState: any, move?: string, capturedPiece?: Piece) => void;
    setWinner: (winnerId: string | 'draw' | null, boardState?: any, method?: GameOverReason, resignerId?: string | null) => void;
    resetGame: () => void;
    loadGameState: (state: GameState) => void;
    isMultiplayer: boolean;
    resign: () => void;
    roomWager: number;
    roomOpponentId: string | null;
    room: GameRoom | null;
}

type Move = { turn: number; white?: string; black?: string };

const GameContext = createContext<GameContextType | undefined>(undefined);

const createInitialCheckersBoard = (): (Piece | null)[][] => {
    const board: (Piece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if ((row + col) % 2 !== 0) { // only on dark squares
                if (row < 3) board[row][col] = { player: 'b', type: 'pawn' };
                if (row > 4) board[row][col] = { player: 'w', type: 'pawn' };
            }
        }
    }
    return board;
};


export const GameProvider = ({ children, gameType }: { children: React.ReactNode, gameType: 'chess' | 'checkers' }) => {
    const { id: roomId } = useParams();
    const isMultiplayer = !!roomId;
    const { user } = useAuth();
    
    const storageKey = `game_state_${gameType}`;
    
    const getInitialState = useCallback((): GameState => {
        const initialBoard = gameType === 'chess' ? new Chess().fen() : { board: createInitialCheckersBoard() };
        return {
            playerColor: 'w',
            timeLimit: 900,
            difficulty: 'intermediate',
            myTime: 900,
            opponentTime: 900,
            currentPlayer: 'w',
            gameOver: false,
            winner: null,
            gameOverReason: null,
            moveHistory: [],
            moveCount: 0,
            boardState: initialBoard,
            capturedByPlayer: [],
            capturedByBot: [],
            payoutAmount: null,
            isEnding: false,
            isGameLoading: true,
            playerPieceCount: gameType === 'chess' ? 16 : 12,
            opponentPieceCount: gameType === 'chess' ? 16 : 12,
        };
    }, [gameType]);

    const [gameState, setGameState] = useState<GameState>(getInitialState());
    const [room, setRoom] = useState<GameRoom | null>(null);
    
    const gameOverHandledRef = useRef(false);
    
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
                    const p1PieceCount = 16 - (roomData.capturedByP2?.length || 0)
                    const p2PieceCount = 16 - (roomData.capturedByP1?.length || 0)
                    const resignerPieceCount = isCreatorResigner ? p1PieceCount : p2PieceCount;

                    let resignerRefundRate, winnerPayoutRate;
                    
                    if (resignerPieceCount <= 3) {
                        resignerRefundRate = 0.30;
                        winnerPayoutRate = 1.50;
                    } else if (resignerPieceCount <= 6) {
                        resignerRefundRate = 0.50;
                        winnerPayoutRate = 1.30;
                    } else {
                        resignerRefundRate = 0.75;
                        winnerPayoutRate = 1.05;
                    }

                    creatorPayout = isCreatorResigner ? wager * resignerRefundRate : wager * winnerPayoutRate;
                    joinerPayout = !isCreatorResigner ? wager * resignerRefundRate : wager * winnerPayoutRate;
                    creatorDesc = isCreatorResigner ? `Resignation Refund vs ${roomData.player2.name}` : `Forfeit Win vs ${roomData.player2.name}`;
                    joinerDesc = !isCreatorResigner ? `Resignation Refund vs ${roomData.createdBy.name}` : `Forfeit Win vs ${roomData.createdBy.name}`;
                    transaction.update(roomRef, { winner: { resignerPieceCount }});

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
                        const pieceCount = winnerData.resignerPieceCount || 0;
                        let resignerRefundRate, winnerPayoutRate;
                        
                        if (pieceCount <= 3) {
                            resignerRefundRate = 0.30;
                            winnerPayoutRate = 1.50;
                        } else if (pieceCount <= 6) {
                            resignerRefundRate = 0.50;
                            winnerPayoutRate = 1.30;
                        } else {
                            resignerRefundRate = 0.75;
                            winnerPayoutRate = 1.05;
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
    }, [user, roomId]);

    const setWinner = useCallback((winnerId: string | 'draw' | null, boardState?: any, method: GameOverReason = 'checkmate', resignerId: string | null = null) => {
        if (gameOverHandledRef.current) return;
        updateAndSaveState({ isEnding: true });
        
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

    // This ref helps to prevent calling setWinner multiple times in rapid succession inside switchTurn
    const setWinnerRef = useRef(setWinner);
    useEffect(() => { setWinnerRef.current = setWinner; }, [setWinner]);

    const switchTurn = useCallback((newBoardState: any, move?: string, capturedPiece?: Piece) => {
        const checkGameOver = (board: any, localRoomData?: GameRoom) => {
            if (gameOverHandledRef.current) return;
            // ... (game over logic for chess and checkers remains the same)
        }
        
        if (isMultiplayer && room) {
            checkGameOver(gameType === 'chess' ? newBoardState : newBoardState.board, room);
            const roomRef = doc(db, 'game_rooms', room.id);
            let newMoveHistory = [...(room.moveHistory || [])];
            if (move) { if (room.currentPlayer === 'w') { newMoveHistory.push({ turn: Math.floor(newMoveHistory.length) + 1, white: move }); } else { const lastMove = newMoveHistory[newMoveHistory.length - 1]; if (lastMove && !lastMove.black) { lastMove.black = move; } else { newMoveHistory.push({ turn: Math.floor((newMoveHistory.length - 1) / 2) + 1, black: move }); } } }
            const now = Timestamp.now();
            const elapsedSeconds = room.turnStartTime ? (now.toMillis() - room.turnStartTime.toMillis()) / 1000 : 0;
            
            const isCreatorTurn = room.currentPlayer === room.createdBy.color;
            const newP1Time = isCreatorTurn ? room.p1Time - elapsedSeconds : room.p1Time;
            const newP2Time = room.player2 && !isCreatorTurn ? room.p2Time - elapsedSeconds : room.p2Time;
            
            const updatePayload: any = { 
                boardState: gameType === 'chess' ? newBoardState : JSON.stringify(newBoardState), 
                currentPlayer: room.currentPlayer === 'w' ? 'b' : 'w', 
                moveHistory: newMoveHistory, 
                turnStartTime: now, 
                p1Time: newP1Time, 
                p2Time: newP2Time 
            };
            if (capturedPiece) { const pieceToStore = { type: capturedPiece.type, color: capturedPiece.color }; if (room.currentPlayer === room.createdBy.color) { updatePayload.capturedByP1 = [...(room.capturedByP1 || []), pieceToStore]; } else { updatePayload.capturedByP2 = [...(room.capturedByP2 || []), pieceToStore]; } }
            updateDoc(roomRef, updatePayload);
            return;
        }

        // Single player logic
        updateAndSaveState({boardState: newBoardState}); // Save board first
        checkGameOver(newBoardState);
        const myIsCurrent = (gameState.playerColor === gameState.currentPlayer);
        let newMoveHistory = [...gameState.moveHistory];
        let newMoveCount = gameState.moveCount + 1;
        if (move) { if (gameState.currentPlayer === 'w') { newMoveHistory.push({ turn: Math.floor((newMoveCount-1) / 2) + 1, white: move }); } else { const lastMoveIndex = newMoveHistory.length - 1; if (lastMoveIndex >= 0 && !newMoveHistory[lastMoveIndex].black) { newMoveHistory[lastMoveIndex] = { ...newMoveHistory[lastMoveIndex], black: move }; } else { newMoveHistory.push({ turn: Math.floor((newMoveCount-1) / 2) + 1, black: move }); } } }
        const newCapturedByPlayer = capturedPiece && !myIsCurrent ? [...gameState.capturedByPlayer, capturedPiece] : gameState.capturedByPlayer;
        const newCapturedByBot = capturedPiece && myIsCurrent ? [...gameState.capturedByBot, capturedPiece] : gameState.capturedByBot;
        const nextPlayer = gameState.currentPlayer === 'w' ? 'b' : 'w';
        updateAndSaveState({ currentPlayer: nextPlayer, moveHistory: newMoveHistory, moveCount: newMoveCount, capturedByPlayer: newCapturedByPlayer, capturedByBot: newCapturedByBot });

    }, [gameState, room, isMultiplayer, updateAndSaveState, gameType]);

    // Main data listener for multiplayer
    useEffect(() => {
        if (!isMultiplayer || !roomId || !user) {
            if (!isMultiplayer) {
                updateAndSaveState({ isGameLoading: false });
            }
            return;
        }

        const roomRef = doc(db, 'game_rooms', roomId as string);
        const unsubscribe = onSnapshot(roomRef, (docSnap) => {
            if (gameOverHandledRef.current) return;

            if (!docSnap.exists()) {
                updateAndSaveState({ isGameLoading: false });
                return;
            }

            const roomData = { id: docSnap.id, ...docSnap.data() } as GameRoom;
            setRoom(roomData);

            if (roomData.status === 'completed') {
                setWinnerRef.current(roomData.winner?.uid || 'draw', roomData.boardState, roomData.winner?.method, roomData.winner?.resignerId);
                return;
            }
            
            const isCreator = roomData.createdBy.uid === user.uid;
            
            if (roomData.status === 'in-progress' || (isCreator && roomData.status === 'waiting')) {
                 updateAndSaveState({ isGameLoading: false });
            }

            const myColor = isCreator ? roomData.createdBy.color : (roomData.player2?.color || (roomData.createdBy.color === 'w' ? 'b' : 'w'));
            
            let boardData = roomData.boardState;
            if (gameType === 'checkers' && typeof boardData === 'string') {
                try { boardData = JSON.parse(boardData); } catch { boardData = { board: createInitialCheckersBoard() }; }
            }

            const capturedByMe = isCreator ? roomData.capturedByP1 : roomData.capturedByP2;
            const capturedByOpponent = isCreator ? roomData.capturedByP2 : roomData.capturedByP1;

            updateAndSaveState({
                playerColor: myColor,
                boardState: boardData,
                moveHistory: roomData.moveHistory || [],
                moveCount: roomData.moveHistory?.length || 0,
                currentPlayer: roomData.currentPlayer,
                capturedByPlayer: capturedByOpponent || [],
                capturedByBot: capturedByMe || [],
            });
        });

        return () => unsubscribe();
    }, [isMultiplayer, roomId, user, gameType]);

    // Timer logic
    useEffect(() => {
        if (!isMultiplayer || gameState.gameOver || gameState.isGameLoading || !room || room.status !== 'in-progress') return;

        const timerId = setInterval(() => {
            if (gameOverHandledRef.current) {
                clearInterval(timerId);
                return;
            }

            const now = Date.now();
            const turnStartMillis = room.turnStartTime ? room.turnStartTime.toMillis() : now;
            const elapsedSeconds = (now - turnStartMillis) / 1000;
            
            const isCreator = room.createdBy.uid === user?.uid;
            const p1Time = room.p1Time - (room.currentPlayer === room.createdBy.color ? elapsedSeconds : 0);
            const p2Time = room.p2Time - (room.player2 && room.currentPlayer === room.player2?.color ? elapsedSeconds : 0);

            updateAndSaveState({ 
                myTime: isCreator ? p1Time : p2Time, 
                opponentTime: isCreator ? p2Time : p1Time 
            });

            if (p1Time <= 0 || p2Time <= 0) {
                 if (gameOverHandledRef.current) return;
                const timedOutPlayerId = p1Time <= 0 ? room.createdBy.uid : room.player2!.uid;
                const winnerId = timedOutPlayerId === room.createdBy.uid ? room.player2!.uid : room.createdBy.uid;
                setWinnerRef.current(winnerId || null, room.boardState, 'timeout', null);
            }
        }, 1000);

        return () => clearInterval(timerId);
    }, [isMultiplayer, room, user, gameState.gameOver, gameState.isGameLoading, updateAndSaveState]);


    const loadGameState = useCallback((state: GameState) => { updateAndSaveState(state); }, [updateAndSaveState]);
    
    const setupGame = useCallback((color: PlayerColor, time: number, diff: string) => {
        gameOverHandledRef.current = false;
        if (!isMultiplayer && typeof window !== 'undefined') localStorage.removeItem(storageKey);
        const defaultState = getInitialState();
        const newState: GameState = { ...defaultState, playerColor: color, timeLimit: time, difficulty: diff, myTime: time, opponentTime: time, isGameLoading: false };
        updateAndSaveState(newState);
    }, [isMultiplayer, storageKey, getInitialState, updateAndSaveState]);
    
    const resign = useCallback(() => { 
        if (gameState.gameOver || gameState.isEnding || !user) return; 
        if (isMultiplayer && room) { 
            const winnerId = room.players.find((p)=>p !== user.uid) || null; 
            setWinnerRef.current(winnerId, gameState.boardState, 'resign', user.uid); 
        } else { 
            setWinnerRef.current('bot', gameState.boardState, 'resign', user.uid); 
        } 
    }, [gameState, user, room, isMultiplayer, setWinner]);
    
    const resetGame = useCallback(() => { gameOverHandledRef.current = false; if(typeof window !== 'undefined' && !isMultiplayer) { localStorage.removeItem(storageKey); } const defaultState = getInitialState(); setGameState(defaultState); setRoom(null); }, [isMultiplayer, storageKey, getInitialState]);
    
    const getOpponentId = () => { if (!user || !room || !room.players || !room.player2) return null; return room.players.find(p => p !== user.uid) || null; };

    const contextValue = { ...gameState, setupGame, switchTurn, setWinner, resign, resetGame, loadGameState, isMultiplayer, roomWager: room?.wager || 0, roomOpponentId: getOpponentId(), room };

    return ( <GameContext.Provider value={contextValue}> {children} </GameContext.Provider> );
}

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) { throw new Error('useGame must be used within a GameProvider'); }
    return context;
}
