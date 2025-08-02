
'use client';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGame, GameOverReason } from '@/context/game-context';

type Player = 'w' | 'b';
type PieceType = 'pawn' | 'king';
type Piece = { player: Player; type: PieceType };
type SquareContent = Piece | null;
type Board = SquareContent[][];
type Position = { row: number; col: number };
type Move = { from: Position; to: Position; isJump: boolean; jumpedPiece?: Piece };

type BoardTheme = { id: string; name: string; colors: string[] };
type PieceStyle = { id: string; name: string; colors: string[] };

const pieceStyles: PieceStyle[] = [
    { id: 'red_black', name: 'Red & Black', colors: ['#dc2626', '#18181b'] },
    { id: 'orange_gold', name: 'Orange & Gold', colors: ['#f97316', '#ca8a04'] },
    { id: 'pink_royal_blue', name: 'Pink & Royal Blue', colors: ['#ec4899', '#3b82f6'] },
    { id: 'natural_purple', name: 'Natural & Purple', colors: ['#e2e8f0', '#8b5cf6'] },
    { id: 'black_white', name: 'Black & White', colors: ['#0f172a', '#f8fafc'] },
];

const boardThemes: BoardTheme[] = [
    { id: 'classic', name: 'Classic', colors: ['#f0d9b5', '#b58863'] },
    { id: 'forest', name: 'Forest', colors: ['#ebecd0', '#779556'] },
    { id: 'ocean', name: 'Ocean', colors: ['#c7d2fe', '#60a5fa'] },
];


const createInitialBoard = (): Board => {
    const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if ((row + col) % 2 !== 0) { // only on dark squares
                if (row < 3) board[row][col] = { player: 'b', type: 'pawn' };
                if (row > 4) board[row][col] = { player: 'w', type: 'pawn' };
            }
        }
    }
    return board;
}


type CheckersBoardProps = {
    boardTheme?: string;
    pieceStyle?: string;
}

const PieceComponent = ({ piece, colors }: { piece: Piece, colors: string[] }) => {
    const pieceColor = piece.player === 'b' ? colors[0] : colors[1];
    
    return (
        <div className="w-5/6 h-5/6 relative flex items-center justify-center">
            <div 
                className={cn('w-full h-full rounded-full shadow-lg border-2 border-black/50')}
                style={{ backgroundColor: pieceColor }}
            />
            {piece.type === 'king' && (
              <Crown className="w-1/2 h-1/2 absolute text-yellow-400" />
            )}
        </div>
    );
};

export default function CheckersBoard({ boardTheme = 'ocean', pieceStyle = 'red_black' }: CheckersBoardProps) {
    const { playerColor, switchTurn, setWinner, gameOver, currentPlayer, boardState, isMounted, isMultiplayer, user, roomOpponentId, room } = useGame();
    const [board, setBoard] = useState<Board>(() => boardState?.board || createInitialBoard());
    const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
    const [possibleMoves, setPossibleMoves] = useState<Move[]>([]);
    const { toast } = useToast();
    const [mustJump, setMustJump] = useState(false);
    const [consecutiveJumpPiece, setConsecutiveJumpPiece] = useState<Position | null>(null);

    const theme = boardThemes.find(t => t.id === boardTheme) || boardThemes[2];
    const styles = pieceStyles.find(s => s.id === pieceStyle) || pieceStyles[0];
    const isFlipped = playerColor === 'b';
    
    useEffect(() => {
        if (boardState?.board) {
            setBoard(boardState.board);
        } else {
            setBoard(createInitialBoard());
        }
    }, [boardState]);
    
    const getPossibleMovesForPiece = useCallback((piece: Piece, pos: Position, currentBoard: Board, forPlayer: Player): Move[] => {
        const moves: Move[] = [];
        const jumps: Move[] = [];
        const { row, col } = pos;
        const directions = piece.type === 'king' 
            ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] 
            : piece.player === 'w' 
                ? [[-1, -1], [-1, 1]] 
                : [[1, -1], [1, 1]];

        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            const jumpRow = row + 2 * dr;
            const jumpCol = col + 2 * dc;

            if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                // Regular move
                if (!currentBoard[newRow][newCol]) {
                    moves.push({ from: pos, to: { row: newRow, col: newCol }, isJump: false });
                }
                // Jump move
                else if (currentBoard[newRow][newCol]?.player !== forPlayer && jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8 && !currentBoard[jumpRow][jumpCol]) {
                    const jumpedPiece = currentBoard[newRow][newCol]!;
                    jumps.push({ from: pos, to: { row: jumpRow, col: jumpCol }, isJump: true, jumpedPiece: { type: 'pawn', player: jumpedPiece.player } });
                }
            }
        }
        return jumps.length > 0 ? jumps : moves;
    }, []);

    
    const calculateAllMoves = useCallback((currentBoard: Board, forPlayer: Player) => {
        const allPossibleMoves: Move[] = [];
        let canJump = false;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = currentBoard[r][c];
                if (piece && piece.player === forPlayer) {
                    const moves = getPossibleMovesForPiece(piece, { row: r, col: c }, currentBoard, forPlayer);
                    if (moves.some(m => m.isJump)) canJump = true;
                    allPossibleMoves.push(...moves);
                }
            }
        }
        return canJump ? allPossibleMoves.filter(m => m.isJump) : allPossibleMoves;
    }, [getPossibleMovesForPiece]);

    
    const movePiece = useCallback((move: Move) => {
        const newBoard = board.map(r => [...r]);
        const piece = newBoard[move.from.row][move.from.col];
        
        if (!piece) return;

        const fromSquare = `${String.fromCharCode(97 + move.from.col)}${8 - move.from.row}`;
        const toSquare = `${String.fromCharCode(97 + move.to.col)}${8 - move.to.row}`;
        const moveNotation = `${fromSquare}${move.isJump ? 'x' : '-'}${toSquare}`;

        if (piece.type === 'pawn' && ( (piece.player === 'w' && move.to.row === 0) || (piece.player === 'b' && move.to.row === 7) )) {
            piece.type = 'king';
        }

        newBoard[move.to.row][move.to.col] = piece;
        newBoard[move.from.row][move.from.col] = null;
        
        let captured;
        if (move.isJump) {
            const jumpedRow = move.from.row + (move.to.row - move.from.row) / 2;
            const jumpedCol = move.from.col + (move.to.col - move.from.col) / 2;
            captured = newBoard[jumpedRow][jumpedCol];
            newBoard[jumpedRow][jumpedCol] = null;
        }
        
        setBoard(newBoard);

        const moreJumps = move.isJump ? getPossibleMovesForPiece(piece, move.to, newBoard, piece.player).filter(m => m.isJump) : [];

        if (moreJumps.length > 0 && (isMultiplayer ? currentPlayer === playerColor : true) ) {
            setConsecutiveJumpPiece(move.to);
            if (piece.player === playerColor) { 
                setSelectedPiece(move.to);
                setPossibleMoves(moreJumps);
            }
        } else {
            setConsecutiveJumpPiece(null);
            setSelectedPiece(null);
            setPossibleMoves([]);
            const finalCapturedPiece = captured ? { type: captured.type, color: captured.player } as unknown as Piece : undefined;
            switchTurn({ board: newBoard }, moveNotation, finalCapturedPiece);
        }
        
    }, [board, switchTurn, getPossibleMovesForPiece, playerColor, currentPlayer, isMultiplayer]);

    const botMove = useCallback(() => {
        const botMoves = calculateAllMoves(board, currentPlayer);
        if (botMoves.length > 0) {
            const randomMove = botMoves[Math.floor(Math.random() * botMoves.length)];
            movePiece(randomMove);
        }
    }, [board, currentPlayer, calculateAllMoves, movePiece]);


    useEffect(() => {
        if(gameOver || !isMounted || isMultiplayer) return;

        if (consecutiveJumpPiece) {
             const jumps = getPossibleMovesForPiece(board[consecutiveJumpPiece.row][consecutiveJumpPiece.col]!, consecutiveJumpPiece, board, currentPlayer).filter(m => m.isJump);
             if(jumps.length > 0 && currentPlayer === playerColor) {
                 setPossibleMoves(jumps);
                 setSelectedPiece(consecutiveJumpPiece);
                 setMustJump(true);
                 return;
             } else {
                setConsecutiveJumpPiece(null);
                switchTurn({ board });
             }
        }

        const legalMoves = calculateAllMoves(board, currentPlayer);
        setMustJump(legalMoves.some(m => m.isJump));
        
        if (currentPlayer !== playerColor) {
            setTimeout(() => {
                botMove();
            }, 1000);
        }
        
    }, [board, currentPlayer, consecutiveJumpPiece, getPossibleMovesForPiece, playerColor, switchTurn, calculateAllMoves, gameOver, isMounted, isMultiplayer, botMove]);


    const handleSquareClick = (row: number, col: number) => {
        if (currentPlayer !== playerColor || gameOver) return;

        const actualRow = isFlipped ? 7 - row : row;
        const actualCol = isFlipped ? 7 - col : col;
        
        const clickedPiece = board[actualRow][actualCol];

        if (selectedPiece) {
            const move = possibleMoves.find(m => m.to.row === actualRow && m.to.col === actualCol && m.from.row === selectedPiece.row && m.from.col === selectedPiece.col);
            if(move) {
                movePiece(move);
                return;
            }
        }

        if (clickedPiece && clickedPiece.player === currentPlayer) {
             if (consecutiveJumpPiece) { 
                return;
            }
            const pieceMoves = calculateAllMoves(board, currentPlayer).filter(m => m.from.row === actualRow && m.from.col === actualCol);
            
            if (mustJump && !pieceMoves.some(m => m.isJump)) {
                toast({ title: "Mandatory Jump", description: "You must capture an opponent's piece.", variant: "destructive" });
                return;
            }

            setSelectedPiece({ row: actualRow, col: actualCol });
            setPossibleMoves(pieceMoves);

        } else {
            setSelectedPiece(null);
            setPossibleMoves([]);
        }
    };
    
    const displayedBoard = isFlipped ? [...board].reverse().map(row => [...row].reverse()) : board;


    return (
        <div className="grid grid-cols-8 aspect-square w-full max-w-[75vh] lg:max-w-lg shadow-2xl border-2 border-border rounded-lg overflow-hidden">
            {displayedBoard.map((rowItem, rowIndex) =>
                rowItem.map((piece, colIndex) => {
                    const actualRow = isFlipped ? 7 - rowIndex : rowIndex;
                    const actualCol = isFlipped ? 7 - colIndex : colIndex;
                    
                    const isDarkSquare = (actualRow + actualCol) % 2 !== 0;
                    const isSelected = selectedPiece && selectedPiece.row === actualRow && selectedPiece.col === actualCol;
                    
                    const isPossibleMoveForSelected = selectedPiece ? possibleMoves.some(m => m.from.row === selectedPiece.row && m.from.col === selectedPiece.col && m.to.row === actualRow && m.to.col === actualCol) : false;


                    return (
                        <div
                            key={`${rowIndex}-${colIndex}`}
                            className={cn(
                                'flex items-center justify-center relative aspect-square transition-colors',
                                isDarkSquare && 'hover:bg-primary/20 cursor-pointer'
                            )}
                            style={{ backgroundColor: isDarkSquare ? theme.colors[1] : theme.colors[0] }}
                            onClick={() => handleSquareClick(rowIndex, colIndex)}
                        >
                            {isMounted && piece && (
                                <div className={cn('w-full h-full flex items-center justify-center transition-transform duration-300 ease-in-out',
                                    isSelected ? 'scale-110 -translate-y-1' : ''
                                )}>
                                    <PieceComponent piece={piece} colors={styles.colors} />
                                </div>
                            )}
                             {isPossibleMoveForSelected && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-1/3 h-1/3 bg-primary/50 rounded-full" />
                                </div>
                              )}
                            {isSelected && (
                                <div className="absolute inset-0 bg-primary/40 rounded-md ring-2 ring-primary" />
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
}
