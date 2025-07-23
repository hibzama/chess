
'use client';
import { useState, useEffect } from 'react';
import { Chess, Square } from 'chess.js';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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

const getPieceIcon = (type: string, color: string) => {
    const style = { fill: color, stroke: color === '#0f172a' || color === '#18181b' ? '#f8fafc' : '#0f172a' , strokeWidth: 1.5, strokeLinejoin: 'round' } as React.CSSProperties;
    switch (type.toLowerCase()) {
        case 'p': return <g {...style}><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.58 16 21v-1h13v1c0-2.42-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4zM12 31h21v-3H12v3z" /></g>;
        case 'r': return <g {...style}><path d="M13 31h19v-3H13v3zm1-4h17v-8H14v8zM11 9h23v5h-3v2h-3v-2h-5v2h-3v-2h-3V9z" /></g>;
        case 'n': return <g {...style}><path d="M22.5 31h-9V29.5h9V31zm-3-1.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0zm-1.5-12c-3.44.64-6.44 3.69-7.5 7.5-1.5 5.5 2 9.5 7.5 9.5h3V15.5H18c-2.5 0-2.5-2.5-2.5-2.5s3-1.5 6-1.5c3.5 0 5.5 2.5 5.5 2.5v14h1.5v-13c0-4.67-3.33-8-8-8z" /></g>;
        case 'b': return <g {...style}><path d="M18.5 31h8v-1.5h-8V31zM15 28.5a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0zM12 28.5c0-4.67 3.33-8 8-8s8 3.33 8 8c0 1.15-.22 2.25-.62 3.25H12.62c-.4-1-.62-2.1-.62-3.25zM19.5 9a3 3 0 1 1 6 0 3 3 0 0 1-6 0z" /></g>;
        case 'q': return <g {...style}><path d="M12.5 31h20v-3h-20v3zM10.5 12c0-3.31 2.69-6 6-6s6 2.69 6 6c0 1.54-.58 2.94-1.5 4h-9c-.92-1.06-1.5-2.46-1.5-4zM10 28h25v-3H10v3z" /></g>;
        case 'k': return <g {...style}><path d="M22.5 31h-9V29.5h9V31zm-4.5-1.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0zM12 28.5c0-4.67 3.33-8 8-8s8 3.33 8 8v3h-16v-3zM22.5 6h-3v3h-3v3h3v-3h3V6z" /></g>;
        default: return null;
    }
}

type ChessBoardProps = {
    boardTheme?: string;
    pieceStyle?: string;
}

export default function ChessBoard({ boardTheme = 'ocean', pieceStyle = 'black_white' }: ChessBoardProps) {
  const [game, setGame] = useState(new Chess());
  const [board, setBoard] = useState(game.board());
  const [selectedPiece, setSelectedPiece] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const { toast } = useToast();

  const theme = boardThemes.find(t => t.id === boardTheme) || boardThemes[2];
  const styles = pieceStyles.find(s => s.id === pieceStyle) || pieceStyles[4];

  useEffect(() => {
    if (game.isCheckmate()) {
        toast({ title: "Checkmate!", description: `Player ${game.turn() === 'w' ? 'Black' : 'White'} wins.` });
    } else if (game.isStalemate()) {
        toast({ title: "Stalemate!", description: "The game is a draw." });
    } else if (game.isDraw()) {
        toast({ title: "Draw!", description: "The game is a draw due to the 50-move rule or threefold repetition." });
    } else if (game.isInsufficientMaterial()) {
        toast({ title: "Draw!", description: "The game is a draw due to insufficient material." });
    }
  }, [board, game, toast]);


  const getSquareFromIndices = (row: number, col: number): Square => {
    return `${String.fromCharCode('a'.charCodeAt(0) + col)}${8 - row}` as Square;
  }

  const handleSquareClick = (row: number, col: number) => {
    const square = getSquareFromIndices(row, col);

    if (selectedPiece) {
      const move = {
        from: selectedPiece,
        to: square,
        promotion: 'q' // Always promote to queen for simplicity in practice mode
      };
      
      try {
        const result = game.move(move);
        if (result) {
            setBoard(game.board());
        }
      } catch (e) {
        // Invalid move, maybe deselect or show feedback
      } finally {
        setSelectedPiece(null);
        setLegalMoves([]);
      }

    } else {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setSelectedPiece(square);
        const moves = game.moves({ square, verbose: true });
        setLegalMoves(moves.map(m => m.to));
      }
    }
  };

  return (
    <div className="grid grid-cols-8 aspect-square w-full max-w-[75vh] lg:max-w-lg shadow-2xl border-2 border-border rounded-lg overflow-hidden">
      {board.map((rowArr, rowIndex) =>
        rowArr.map((piece, colIndex) => {
          const square = getSquareFromIndices(rowIndex, colIndex);
          
          const isSelected = selectedPiece === square;
          const isLegalMove = legalMoves.includes(square);
          const isLightSquare = (rowIndex + colIndex) % 2 !== 0;

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={cn(
                'flex items-center justify-center relative aspect-square transition-colors',
                'hover:bg-primary/20 cursor-pointer',
              )}
               style={{ backgroundColor: isLightSquare ? theme.colors[0] : theme.colors[1] }}
              onClick={() => handleSquareClick(rowIndex, colIndex)}
            >
              {piece && (
                <div className={cn(
                  'w-full h-full flex items-center justify-center transition-transform duration-300 ease-in-out',
                  isSelected ? 'scale-110 -translate-y-1' : ''
                )}>
                  <svg viewBox="0 0 45 45" className="w-full h-full p-1">
                    {getPieceIcon(piece.type, piece.color === 'w' ? styles.colors[1] : styles.colors[0])}
                  </svg>
                </div>
              )}
               {isLegalMove && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1/3 h-1/3 bg-primary/50 rounded-full" />
                </div>
              )}
              {isSelected && (
                <div className="absolute inset-0 bg-primary/40 ring-2 ring-primary" />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
