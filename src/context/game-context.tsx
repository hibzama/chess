
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
    isMounted: boolean;
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
    const router = useRouter();
    const isMultiplayer = !!roomId;
    const { user, loading: authLoading } = useAuth();
    const [isMounted, setIsMounted] = useState(false);
    
    useEffect(() => {
        setIsMounted(true);
    }, []);

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
            isGameLoading: isMultiplayer,
            playerPieceCount: gameType === 'chess' ? 16 : 12,
            opponentPieceCount: gameType === 'chess' ? 16 : 12,
        };
    }, [isMultiplayer, gameType]);

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
                    joinerDesc = !isCreatorWinner ? `${reason} vs ${roomData.createdBy.name}` : `Loss vs ${roomData.player2.name}`;
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

    const switchTurn = useCallback((newBoardState: any, move?: string, capturedPiece?: Piece) => {
        
        const checkGameOver = (board: any, localRoomData?: GameRoom) => {
            if (gameOverHandledRef.current) return;
            if (gameType === 'chess') {
                const tempGame = new Chess(board); 
                if (tempGame.isGameOver()) {
                    if (tempGame.isCheckmate()) {
                        const loserColor = tempGame.turn();
                        const winnerId = isMultiplayer && localRoomData ? localRoomData.players.find(pId => {
                            const pData = pId === localRoomData.createdBy.uid ? localRoomData.createdBy : localRoomData.player2;
                            return pData?.color !== loserColor;
                        }) : (loserColor === 'b' ? 'user' : 'bot');
                        setWinner(winnerId || null, newBoardState, 'checkmate');
                    } else {
                        setWinner('draw', newBoardState, 'draw');
                    }
                }
            } else {
                 let whitePieces = 0, blackPieces = 0, hasWhiteMoves = false, hasBlackMoves = false;
                const getPossibleMovesForPiece = (piece: Piece, pos: {row: number, col: number}, currentBoard: any[][], forPlayer: PlayerColor): any[] => {
                    const moves = [], jumps = [];
                    const { row, col } = pos;
                    const directions = piece.type === 'king' ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : (piece as any).player === 'w' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
                    for (const [dr, dc] of directions) {
                        const newRow = row + dr, newCol = col + dc;
                        const jumpRow = row + 2 * dr, jumpCol = col + 2 * dc;
                        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                            if (!currentBoard[newRow][newCol]) {
                                moves.push({ from: pos, to: { row: newRow, col: newCol }, isJump: false });
                            } else if (currentBoard[newRow][newCol]?.player !== forPlayer && jumpRow >= 0 && jumpCol < 8 && jumpCol >= 0 && jumpCol < 8 && !currentBoard[jumpRow][jumpCol]) {
                                jumps.push({ from: pos, to: { row: jumpRow, col: jumpCol }, isJump: true });
                            }
                        }
                    }
                    return jumps.length > 0 ? jumps : moves;
                };
    
                for (let r = 0; r < 8; r++) { for (let c = 0; c < 8; c++) { const piece = newBoardState.board[r][c]; if (piece) { if (piece.player === 'w') whitePieces++; else blackPieces++; const moves = getPossibleMovesForPiece(piece, { row: r, col: c }, newBoardState.board, piece.player); if (moves.length > 0) { if (piece.player === 'w') hasWhiteMoves = true; else hasBlackMoves = true; }}}}
                let winnerColor: PlayerColor | null = null, reason: GameOverReason = 'piece-capture';
                if (whitePieces === 0) { winnerColor = 'b'; } else if (blackPieces === 0) { winnerColor = 'w'; } else if (gameState.currentPlayer === 'w' && !hasWhiteMoves) { winnerColor = 'b'; reason = 'draw'; } else if (gameState.currentPlayer === 'b' && !hasBlackMoves) { winnerColor = 'w'; reason = 'draw'; }
                if (winnerColor) {
                    const winnerId = isMultiplayer && localRoomData ? localRoomData.players.find(pId => (pId === localRoomData.createdBy.uid ? localRoomData.createdBy : localRoomData.player2)?.color === winnerColor) : (winnerColor === 'w' ? 'user' : 'bot');
                    setWinner(winnerId || null, newBoardState, reason);
                }
            }
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

    }, [gameState, room, isMultiplayer, updateAndSaveState, gameType, setWinner, user]);

    useEffect(() => {
        if (!isMultiplayer || !roomId) return;
        if (!user) {
            // Wait for user to be authenticated
            if (!authLoading) updateAndSaveState({ isGameLoading: false });
            return;
        }
    
        const roomRef = doc(db, 'game_rooms', roomId as string);
        const unsubscribe = onSnapshot(roomRef, (docSnap) => {
            if (!docSnap.exists() || gameOverHandledRef.current) {
                updateAndSaveState({ isGameLoading: false });
                return;
            }
    
            const roomData = { id: docSnap.id, ...docSnap.data() } as GameRoom;
            setRoom(roomData);
    
            if (roomData.status === 'completed') {
                gameOverHandledRef.current = true;
            }
    
            const isCreator = roomData.createdBy.uid === user.uid;
            
            // Wait for player2 to exist before setting colors and times
            if (roomData.status === 'in-progress' && !roomData.player2) {
                updateAndSaveState({ isGameLoading: true });
                return;
            }
            
            const myColor = isCreator ? roomData.createdBy.color : roomData.player2?.color;
            if (!myColor) {
                // This can happen if P2 joins but their color isn't set yet.
                // We just wait for the next snapshot.
                return;
            }
            
            const myTime = isCreator ? roomData.p1Time : roomData.p2Time;
            const opponentTime = isCreator ? roomData.p2Time : roomData.p1Time;

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
                myTime: myTime ?? roomData.timeControl,
                opponentTime: opponentTime ?? roomData.timeControl,
                isGameLoading: false, // Game is now ready to be displayed
            });
        });
    
        return () => unsubscribe();
    }, [isMultiplayer, roomId, user, authLoading, gameType, updateAndSaveState]);


    // This effect handles the client-side timer countdown.
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
            const isMyTurn = gameState.playerColor === room.currentPlayer;

            const myLatestTime = gameState.myTime - (isMyTurn ? elapsedSeconds : 0);
            const opponentLatestTime = gameState.opponentTime - (!isMyTurn ? elapsedSeconds : 0);

            // Update the UI state without writing to DB
            setGameState(prev => ({...prev, myTime: myLatestTime, opponentTime: opponentLatestTime}));

            if (myLatestTime <= 0 || opponentLatestTime <= 0) {
                if (gameOverHandledRef.current) return;
                const timedOutPlayerId = myLatestTime <= 0 ? user?.uid : getOpponentId();
                const winnerId = timedOutPlayerId === user?.uid ? getOpponentId() : user?.uid;
                setWinner(winnerId || null, room.boardState, 'timeout', null);
            }
        }, 1000);

        return () => clearInterval(timerId);
    }, [isMultiplayer, room, user, setWinner, gameState.gameOver, gameState.isGameLoading, gameState.playerColor, gameState.myTime, gameState.opponentTime]);


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
            setWinner(winnerId, gameState.boardState, 'resign', user.uid); 
        } else { 
            setWinner('bot', gameState.boardState, 'resign', user.uid); 
        } 
    }, [gameState, user, room, isMultiplayer, setWinner]);
    
    const resetGame = useCallback(() => { gameOverHandledRef.current = false; if(typeof window !== 'undefined' && !isMultiplayer) { localStorage.removeItem(storageKey); } const defaultState = getInitialState(); setGameState(defaultState); setRoom(null); }, [isMultiplayer, storageKey, getInitialState]);
    
    const getOpponentId = () => { if (!user || !room || !room.players || !room.player2) return null; return room.players.find(p => p !== user.uid) || null; };

    const contextValue = { ...gameState, setupGame, switchTurn, setWinner, resign, resetGame, loadGameState, isMultiplayer, roomWager: room?.wager || 0, roomOpponentId: getOpponentId(), room, isMounted };

    return ( <GameContext.Provider value={contextValue}> {children} </GameContext.Provider> );
}

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) { throw new Error('useGame must be used within a GameProvider'); }
    return context;
}
