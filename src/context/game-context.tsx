
'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment, onSnapshot, writeBatch, collection, serverTimestamp, Timestamp, runTransaction } from 'firebase/firestore';
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
    setWinner: (winnerId: string | 'draw' | null, boardState?: any, method?: GameOverReason, resignerId?: string | null, resignerPieceCount?: number) => void;
    checkGameOver: (board: any, roomDataForCheck: GameRoom) => void;
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
            playerPieceCount: gameType === 'chess' ? 16 : 12,
            opponentPieceCount: gameType === 'chess' ? 16 : 12,
        };
        if(isMultiplayer) return defaultState;
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
    const [isMounted, setIsMounted] = useState(false);
    
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

    const handlePayout = useCallback(async (winnerDetails: { winnerId: string | 'draw' | null, method: GameOverReason, resignerId?: string | null, resignerPieceCount?: number }) => {
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
                
                const { winnerId, method, resignerId, resignerPieceCount } = winnerDetails;
    
                if (resignerId) { // Resignation logic
                    const isCreatorResigner = resignerId === roomData.createdBy.uid;
                    let resignerRefundRate, winnerPayoutRate;

                    if (resignerPieceCount !== undefined && resignerPieceCount <= 3) {
                        resignerRefundRate = 0.30; // 30%
                        winnerPayoutRate = 1.50; // 150%
                    } else if (resignerPieceCount !== undefined && resignerPieceCount <= 6) {
                        resignerRefundRate = 0.50; // 50%
                        winnerPayoutRate = 1.30; // 130%
                    } else {
                        resignerRefundRate = 0.75; // 75%
                        winnerPayoutRate = 1.05; // 105%
                    }

                    creatorPayout = isCreatorResigner ? wager * resignerRefundRate : wager * winnerPayoutRate;
                    joinerPayout = !isCreatorResigner ? wager * resignerRefundRate : wager * winnerPayoutRate;
                    creatorDesc = isCreatorResigner ? `Resignation Refund vs ${roomData.player2.name}` : `Forfeit Win vs ${roomData.player2.name}`;
                    joinerDesc = !isCreatorResigner ? `Resignation Refund vs ${roomData.createdBy.name}` : `Forfeit Win vs ${roomData.player2.name}`;

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
                    winner: { uid: winnerId !== 'draw' ? winnerId : null, method, resignerId, resignerPieceCount },
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
                    const wager = roomData.wager;
                    const winnerData = roomData.winner;
                    if (winnerData?.resignerId) { // Resignation
                        const resignerPieceCount = winnerData.resignerPieceCount;
                        let resignerRefundRate, winnerPayoutRate;
                        
                        if (resignerPieceCount !== undefined && resignerPieceCount <= 3) {
                            resignerRefundRate = 0.30;
                            winnerPayoutRate = 1.50;
                        } else if (resignerPieceCount !== undefined && resignerPieceCount <= 6) {
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

    const setWinner = useCallback((winnerId: string | 'draw' | null, boardState?: any, method: GameOverReason = 'checkmate', resignerId: string | null = null, resignerPieceCount?: number) => {
        if (gameOverHandledRef.current) return;
        setGameState(p => ({...p, isEnding: true}));
        
        if (isMultiplayer && roomId && user) {
            gameOverHandledRef.current = true; 
            handlePayout({ winnerId, method, resignerId, resignerPieceCount }).then(({ myPayout }) => {
                const winnerIsMe = winnerId === user.uid;
                setGameState(p => ({
                    ...p, boardState, gameOver: true,
                    winner: winnerId === 'draw' ? 'draw' : (winnerIsMe ? 'p1' : 'p2'),
                    gameOverReason: method, payoutAmount: myPayout,
                }));
            });
        } else {
            gameOverHandledRef.current = true;
            const winner = winnerId === 'bot' ? 'p2' : (winnerId ? 'p1' : 'draw');
            updateAndSaveState({ winner: winner as Winner, gameOver: true, gameOverReason: method }, boardState);
        }
    }, [updateAndSaveState, isMultiplayer, roomId, user, handlePayout]);
    
    const checkGameOver = useCallback((board: any, localRoomData: GameRoom) => {
        if (gameOverHandledRef.current) return;
        if (gameType === 'chess') {
            const tempGame = new Chess(board.fen);
            if (tempGame.isGameOver()) {
                if (tempGame.isCheckmate()) {
                    const loserColor = tempGame.turn();
                    const winnerId = localRoomData.players.find(pId => {
                        const pData = pId === localRoomData.createdBy.uid ? localRoomData.createdBy : localRoomData.player2;
                        return pData?.color !== loserColor;
                    });
                    setWinner(winnerId || null, { fen: board.fen }, 'checkmate');
                } else {
                    setWinner('draw', { fen: board.fen }, 'draw');
                }
            }
        } else { // Checkers logic
             let whitePieces = 0, blackPieces = 0, hasWhiteMoves = false, hasBlackMoves = false;
            const getPossibleMovesForPiece = (piece: Piece, pos: {row: number, col: number}, currentBoard: any[][], forPlayer: PlayerColor): any[] => {
                const moves = [], jumps = [];
                const { row, col } = pos;
                const directions = piece.type === 'king' ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : piece.color === 'w' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
                for (const [dr, dc] of directions) {
                    const newRow = row + dr, newCol = col + dc;
                    const jumpRow = row + 2 * dr, jumpCol = col + 2 * dc;
                    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                        if (!currentBoard[newRow][newCol]) {
                            moves.push({ from: pos, to: { row: newRow, col: newCol }, isJump: false });
                        } else if (currentBoard[newRow][newCol]?.player !== forPlayer && jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8 && !currentBoard[jumpRow][jumpCol]) {
                            jumps.push({ from: pos, to: { row: jumpRow, col: jumpCol }, isJump: true });
                        }
                    }
                }
                return jumps.length > 0 ? jumps : moves;
            };

            for (let r = 0; r < 8; r++) { for (let c = 0; c < 8; c++) { const piece = board[r][c]; if (piece) { if (piece.player === 'w') whitePieces++; else blackPieces++; const moves = getPossibleMovesForPiece(piece, { row: r, col: c }, board, piece.player); if (moves.length > 0) { if (piece.player === 'w') hasWhiteMoves = true; else hasBlackMoves = true; }}}}
            let winnerColor: PlayerColor | null = null, reason: GameOverReason = null;
            if (whitePieces === 0) { winnerColor = 'b'; reason = 'piece-capture'; } else if (blackPieces === 0) { winnerColor = 'w'; reason = 'piece-capture'; } else if (!hasWhiteMoves) { winnerColor = 'b'; reason = 'draw'; } else if (!hasBlackMoves) { winnerColor = 'w'; reason = 'draw'; }
            if (winnerColor) {
                const winnerId = localRoomData.players.find(pId => (pId === localRoomData.createdBy.uid ? localRoomData.createdBy : localRoomData.player2)?.color === winnerColor);
                setWinner(winnerId || null, { board }, reason);
            }
        }
    }, [gameType, setWinner]);

    // Multiplayer state sync and timer
    useEffect(() => {
        if (!isMultiplayer || !roomId || !user) {
            if (!isMounted) setIsMounted(true);
            return;
        }
    
        const roomRef = doc(db, 'game_rooms', roomId as string);
        const unsubscribe = onSnapshot(roomRef, (docSnap) => {
            if (!docSnap.exists() || !user || gameOverHandledRef.current) return;
            const roomData = { id: docSnap.id, ...docSnap.data() } as GameRoom;
            setRoom(roomData);

            if (roomData.status === 'completed') {
                if (!gameState.isEnding) {
                    const winnerData = roomData.winner; const winnerIsMe = winnerData?.uid === user.uid; const iAmResigner = winnerData?.resignerId === user.uid; const wager = roomData.wager || 0; let myPayout = 0;
                    if (iAmResigner) { const pieceCount = winnerData.resignerPieceCount; if (pieceCount !== undefined && pieceCount <= 3) myPayout = wager * 0.30; else if (pieceCount !== undefined && pieceCount <= 6) myPayout = wager * 0.50; else myPayout = wager * 0.75; }
                    else if (winnerData?.resignerId) { const pieceCount = winnerData.resignerPieceCount; if (pieceCount !== undefined && pieceCount <= 3) myPayout = wager * 1.50; else if (pieceCount !== undefined && pieceCount <= 6) myPayout = wager * 1.30; else myPayout = wager * 1.05; }
                    else if (roomData.draw) { myPayout = wager * 0.9; } else if (winnerIsMe) { myPayout = wager * 1.8; }
                    setGameState(p => ({...p, boardState: roomData.boardState, gameOver: true, winner: roomData.draw ? 'draw' : (winnerIsMe ? 'p1' : 'p2'), gameOverReason: winnerData?.method || null, payoutAmount: myPayout, isEnding: true }));
                }
                return;
            }
            if (roomData.status === 'waiting') { if (!isMounted) setIsMounted(true); return; }
    
            const isCreator = roomData.createdBy.uid === user.uid;
            const pColor = isCreator ? roomData.createdBy.color : roomData.player2!.color;
            const elapsed = roomData.turnStartTime ? (Timestamp.now().toMillis() - roomData.turnStartTime.toMillis()) / 1000 : 0;
            const creatorIsCurrent = roomData.currentPlayer === roomData.createdBy.color;
            let p1ServerTime = isCreator ? roomData.p1Time : roomData.p2Time;
            let p2ServerTime = !isCreator ? roomData.p1Time : roomData.p2Time;

            if(roomData.currentPlayer === pColor) {
                 p1ServerTime = Math.max(0, p1ServerTime - elapsed);
            }

            if (p1ServerTime <= 0) {
                 const winnerId = roomData.players.find(p => p !== user.uid);
                 setWinner(winnerId || null, roomData.boardState, 'timeout');
                 return;
            }
             if (p2ServerTime <= 0) {
                 const winnerId = roomData.players.find(p => p === user.uid);
                 setWinner(winnerId || null, roomData.boardState, 'timeout');
                 return;
            }

            let currentBoardState = roomData.boardState;
            if (gameType === 'checkers' && typeof currentBoardState === 'string') { try { currentBoardState = { board: JSON.parse(currentBoardState) }; } catch (e) { currentBoardState = { board: [] }; } }
            const moveHistory = roomData.moveHistory || [];
            let moveCount = 0; if (moveHistory.length > 0) { const lastMove = moveHistory[moveHistory.length - 1]; moveCount = (lastMove.turn - 1) * 2 + (lastMove.black ? 2 : 1); }
            updateAndSaveState({ playerColor: pColor, boardState: currentBoardState, moveHistory, moveCount, currentPlayer: roomData.currentPlayer, capturedByPlayer: isCreator ? roomData.capturedByP2 || [] : roomData.capturedByP1 || [], capturedByBot: isCreator ? roomData.capturedByP1 || [] : roomData.capturedByP2 || [], p1Time: p1ServerTime, p2Time: p2ServerTime });
            if (!isMounted) setIsMounted(true);
        });
        return () => unsubscribe();
    }, [isMultiplayer, roomId, user, isMounted, gameType, setWinner, updateAndSaveState, gameState.isEnding]);


    const loadGameState = useCallback((state: GameState) => { setGameState(state); }, []);
    
    const setupGame = useCallback((color: PlayerColor, time: number, diff: string) => {
        gameOverHandledRef.current = false;
        if (!isMultiplayer && typeof window !== 'undefined') localStorage.removeItem(storageKey);
        const defaultState = getInitialState();
        const newState: GameState = { ...defaultState, playerColor: color, timeLimit: time, difficulty: diff, p1Time: time, p2Time: time };
        updateAndSaveState(newState);
    }, [isMultiplayer, storageKey, getInitialState, updateAndSaveState]);

    const switchTurn = useCallback(async (boardState: any, move?: string, capturedPiece?: Piece) => {
        if (gameState.gameOver || gameState.isEnding || (!room && isMultiplayer)) return;
        if (isMultiplayer && room) {
            const roomRef = doc(db, 'game_rooms', room.id);
            let newMoveHistory = [...(room.moveHistory || [])];
            if (move) { if (room.currentPlayer === 'w') { newMoveHistory.push({ turn: Math.floor(newMoveHistory.length) + 1, white: move }); } else { const lastMove = newMoveHistory[newMoveHistory.length - 1]; if (lastMove && !lastMove.black) { lastMove.black = move; } else { newMoveHistory.push({ turn: Math.floor(newMoveHistory.length) + 1, black: move }); } } }
            const now = Timestamp.now();
            const elapsedSeconds = room.turnStartTime ? (now.toMillis() - room.turnStartTime.toMillis()) / 1000 : 0;
            const creatorIsCurrent = room.currentPlayer === room.createdBy.color;
            const newP1Time = creatorIsCurrent ? room.p1Time - elapsedSeconds : room.p1Time;
            const newP2Time = !creatorIsCurrent ? room.p2Time - elapsedSeconds : room.p2Time;
            let finalBoardState = boardState;
            if(gameType === 'checkers' && boardState.board) { finalBoardState = JSON.stringify(boardState.board); }
            const updatePayload: any = { boardState: finalBoardState, currentPlayer: room.currentPlayer === 'w' ? 'b' : 'w', moveHistory: newMoveHistory, turnStartTime: now, p1Time: newP1Time, p2Time: newP2Time };
            if (capturedPiece) { const pieceToStore = { type: capturedPiece.type, color: capturedPiece.color }; if (room.currentPlayer === room.createdBy.color) { updatePayload.capturedByP1 = [...(room.capturedByP1 || []), pieceToStore]; } else { updatePayload.capturedByP2 = [...(room.capturedByP2 || []), pieceToStore]; } }
            await updateDoc(roomRef, updatePayload);
            checkGameOver(boardState, {...room, ...updatePayload});
            return;
        }
        const p1IsCurrent = (gameState.playerColor === gameState.currentPlayer);
        let newMoveHistory = [...gameState.moveHistory];
        let newMoveCount = gameState.moveCount + 1;
        if (move) { if (gameState.currentPlayer === 'w') { newMoveHistory.push({ turn: Math.floor((newMoveCount-1) / 2) + 1, white: move }); } else { const lastMoveIndex = newMoveHistory.length - 1; if (lastMoveIndex >= 0 && !newMoveHistory[lastMoveIndex].black) { newMoveHistory[lastMoveIndex] = { ...newMoveHistory[lastMoveIndex], black: move }; } else { newMoveHistory.push({ turn: Math.floor((newMoveCount-1) / 2) + 1, black: move }); } } }
        const newCapturedByPlayer = capturedPiece && !p1IsCurrent ? [...gameState.capturedByPlayer, capturedPiece] : gameState.capturedByPlayer;
        const newCapturedByBot = capturedPiece && p1IsCurrent ? [...gameState.capturedByBot, capturedPiece] : gameState.capturedByBot;
        const nextPlayer = gameState.currentPlayer === 'w' ? 'b' : 'w';
        updateAndSaveState({ currentPlayer: nextPlayer, moveHistory: newMoveHistory, moveCount: newMoveCount, capturedByPlayer: newCapturedByPlayer, capturedByBot: newCapturedByBot, }, boardState);
    }, [gameState, room, isMultiplayer, updateAndSaveState, gameType, checkGameOver]);
    
    const resign = useCallback(() => { if (gameState.gameOver || gameState.isEnding || !user) return; if (isMultiplayer && room) { const winnerId = room.players.find((p)=>p !== user.uid) || null; setWinner(winnerId, gameState.boardState, 'resign', user.uid, gameState.playerPieceCount); } else { setWinner('bot', gameState.boardState, 'resign', user.uid); } }, [gameState, user, room, isMultiplayer, setWinner]);
    
    const resetGame = useCallback(() => { gameOverHandledRef.current = false; if(typeof window !== 'undefined' && !isMultiplayer) { localStorage.removeItem(storageKey); } const defaultState = getInitialState(); setGameState(defaultState); setRoom(null); }, [isMultiplayer, storageKey, getInitialState]);
    
    const getOpponentId = () => { if (!user || !room || !room.players || !room.player2) return null; return room.players.find(p => p !== user.uid) || null; };

    const contextValue = { ...gameState, isMounted, setupGame, switchTurn, setWinner, checkGameOver, resetGame, loadGameState, isMultiplayer, resign, roomWager: room?.wager || 0, roomOpponentId: getOpponentId(), room };

    return ( <GameContext.Provider value={contextValue}> {children} </GameContext.Provider> );
}

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) { throw new Error('useGame must be used within a GameProvider'); }
    return context;
}
