
'use client';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Player = 'w' | 'b';
type PieceType = 'pawn' | 'king';
type Piece = { player: Player; type: PieceType };
type SquareContent = Piece | null;
type Board = SquareContent[][];
type Position = { row: number; col: number };
type Move = { from: Position; to: Position; isJump: boolean };

type BoardTheme = { id: string; name: string; colors: string[] };
type PieceStyle = { id: string; name: string; colors: string[] };

const pieceStyles: PieceStyle[] = [
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

const initialBoard: Board = Array(8).fill(null).map(() => Array(8).fill(null));

// Setup initial pieces
for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 !== 0) { // only on dark squares
            if (row < 3) initialBoard[row][col] = { player: 'b', type: 'pawn' };
            if (row > 4) initialBoard[row][col] = { player: 'w', type: 'pawn' };
        }
    }
}

type CheckersBoardProps = {
    boardTheme?: string;
    pieceStyle?: string;
}

const PieceComponent = ({ piece, colors }: { piece: Piece, colors: string[] }) => {
    const pieceColor = piece.player === 'b' ? colors[0] : colors[1];
    const kingColor = piece.player === 'b' ? colors[1] : colors[0];
    return (
        <div className={cn('w-10/12 h-10/12 rounded-full flex items-center justify-center shadow-lg')}
             style={{ backgroundColor: pieceColor, border: `2px solid ${pieceColor === '#f8fafc' ? '#a1a1aa' : 'transparent'}`}}
        >
            {piece.type === 'king' && (
              <Crown className={cn('w-6 h-6')} style={{ color: kingColor }} />
            )}
        </div>
    );
};

export default function CheckersBoard({ boardTheme = 'ocean', pieceStyle = 'black_white' }: CheckersBoardProps) {
    const [board, setBoard] = useState<Board>(initialBoard);
    const [currentPlayer, setCurrentPlayer] = useState<Player>('w');
    const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
    const [possibleMoves, setPossibleMoves] = useState<Move[]>([]);
    const { toast } = useToast();
    const [mustJump, setMustJump] = useState(false);
    const [consecutiveJumpPiece, setConsecutiveJumpPiece] = useState<Position | null>(null);

    const theme = boardThemes.find(t => t.id === boardTheme) || boardThemes[2];
    const styles = pieceStyles.find(s => s.id === pieceStyle) || pieceStyles[3];

    const getPossibleMovesForPiece = (piece: Piece, pos: Position, currentBoard: Board): Move[] => {
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
                else if (currentBoard[newRow][newCol]?.player !== currentPlayer && jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8 && !currentBoard[jumpRow][jumpCol]) {
                    jumps.push({ from: pos, to: { row: jumpRow, col: jumpCol }, isJump: true });
                }
            }
        }
        return jumps.length > 0 ? jumps : moves;
    };
    
    useEffect(() => {
        const allPossibleMoves: Move[] = [];
        let canJump = false;

        if (consecutiveJumpPiece) {
             const jumps = getPossibleMovesForPiece(board[consecutiveJumpPiece.row][consecutiveJumpPiece.col]!, consecutiveJumpPiece, board).filter(m => m.isJump);
             if(jumps.length > 0) {
                 setPossibleMoves(jumps);
                 setSelectedPiece(consecutiveJumpPiece);
                 setMustJump(true);
                 return;
             } else {
                setConsecutiveJumpPiece(null);
                switchPlayer();
             }
        }
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece && piece.player === currentPlayer) {
                    const moves = getPossibleMovesForPiece(piece, { row: r, col: c }, board);
                    if (moves.some(m => m.isJump)) canJump = true;
                    allPossibleMoves.push(...moves);
                }
            }
        }

        const legalMoves = canJump ? allPossibleMoves.filter(m => m.isJump) : allPossibleMoves;
        setMustJump(canJump);

        if (legalMoves.length === 0) {
            toast({ title: "Game Over!", description: `${currentPlayer === 'w' ? 'Black' : 'White'} wins!` });
        }

    }, [board, currentPlayer, consecutiveJumpPiece]);


    const switchPlayer = () => {
        setCurrentPlayer(p => p === 'w' ? 'b' : 'w');
        setSelectedPiece(null);
        setPossibleMoves([]);
    }

    const handleSquareClick = (row: number, col: number) => {
        const clickedMove = possibleMoves.find(m => m.to.row === row && m.to.col === col);
        
        if (clickedMove) { // If the click is a valid move for the selected piece
            movePiece(clickedMove);
        } else if (board[row][col] && board[row][col]?.player === currentPlayer) {
            if (mustJump) {
                const pieceMoves = getPossibleMovesForPiece(board[row][col]!, { row, col }, board);
                if (pieceMoves.some(m => m.isJump)) {
                    setSelectedPiece({ row, col });
                    setPossibleMoves(pieceMoves.filter(m => m.isJump));
                } else {
                    toast({ title: "Mandatory Jump", description: "You must capture the opponent's piece with another piece.", variant: "destructive" });
                }
                return;
            }
            if (consecutiveJumpPiece) return;

            const pieceMoves = getPossibleMovesForPiece(board[row][col]!, { row, col }, board);
            setSelectedPiece({ row, col });
            setPossibleMoves(pieceMoves);
        } else {
            setSelectedPiece(null);
            setPossibleMoves([]);
        }
    };
    
    const movePiece = (move: Move) => {
        const newBoard = board.map(r => [...r]);
        const piece = newBoard[move.from.row][move.from.col];
        
        if (!piece) return;

        // Promote to king
        if (piece.type === 'pawn' && ( (piece.player === 'w' && move.to.row === 0) || (piece.player === 'b' && move.to.row === 7) )) {
            piece.type = 'king';
        }

        newBoard[move.to.row][move.to.col] = piece;
        newBoard[move.from.row][move.from.col] = null;

        if (move.isJump) {
            const jumpedRow = move.from.row + (move.to.row - move.from.row) / 2;
            const jumpedCol = move.from.col + (move.to.col - move.from.col) / 2;
            newBoard[jumpedRow][jumpedCol] = null;
            
            setBoard(newBoard); // Update board immediately to check for more jumps

            const moreJumps = getPossibleMovesForPiece(piece, move.to, newBoard).filter(m => m.isJump);
            if (moreJumps.length > 0) {
                setConsecutiveJumpPiece(move.to);
                setSelectedPiece(move.to);
                setPossibleMoves(moreJumps);
            } else {
                setConsecutiveJumpPiece(null);
                switchPlayer();
            }

        } else {
            setBoard(newBoard);
            switchPlayer();
        }
    };

    return (
        <div className="grid grid-cols-8 aspect-square w-full max-w-[75vh] lg:max-w-lg shadow-2xl border-2 border-border rounded-lg overflow-hidden">
            {board.map((rowItem, rowIndex) =>
                rowItem.map((piece, colIndex) => {
                    const isDarkSquare = (rowIndex + colIndex) % 2 !== 0;
                    const isSelected = selectedPiece && selectedPiece.row === rowIndex && selectedPiece.col === colIndex;
                    const isPossibleMove = possibleMoves.some(m => m.to.row === rowIndex && m.to.col === colIndex);

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
                            {piece && (
                                <div className={cn('w-full h-full flex items-center justify-center transition-transform duration-300 ease-in-out',
                                    isSelected ? 'scale-110 -translate-y-1' : ''
                                )}>
                                    <PieceComponent piece={piece} colors={styles.colors} />
                                </div>
                            )}
                             {isPossibleMove && (
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
