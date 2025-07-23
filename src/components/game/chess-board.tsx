
'use client';
import { useState, useEffect } from 'react';
import { Chess, Square } from 'chess.js';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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

const getPieceIcon = (type: string, color: 'white' | 'black') => {
    const style = { fill: 'none', stroke: color, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as React.CSSProperties;
    switch (type.toLowerCase()) {
        case 'p': return <g style={style}><path d="M22.5 9c-1.108 0-2 .91-2 2.031v.938H20v3h1v1h-1v1h1v1h1v1.5H19v1.5h7v-1.5h-1.5V18h1v-1h-1v-1h1v-3h-.5v-.938C24.5 9.91 23.608 9 22.5 9z" /></g>;
        case 'r': return <g style={style}><path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z" /><path d="M34 14l-3 3H14l-3-3" /><path d="M31 17v12.5H14V17" /><path d="M31 29.5l1.5 2.5h-20l1.5-2.5" /><path d="M11 14h23" /></g>;
        case 'n': return <g style={style}><path d="M22 10c10.5 0 9.5 8 9.5 8s-3.5 6-3.5 11H17c0-5-3.5-11-3.5-11s-1-8 9.5-8z" /><path d="M17 29v3h10v-3" /><path d="M14 32h16v7H14v-7z" /></g>;
        case 'b': return <g style={style}><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2" /><path d="M15 32v-2.5C15 29.5 15 27 15 27s2.5-2.5 2.5-2.5h10s2.5 2.5 2.5 2.5c0 0 0 2.5 0 2.5V32" /><path d="M25 23s.5-3 .5-4.5c0-1.5-1-2.5-3-2.5s-3 1-3 2.5c0 1.5.5 4.5.5 4.5" /><path d="M22.5 12.5a2 2 0 110-4 2 2 0 010 4z" /></g>;
        case 'q': return <g style={style}><path d="M8 12a2 2 0 11-4 0 2 2 0 014 0zM22.5 12.5a2 2 0 110-4 2 2 0 010 4zM37 12a2 2 0 114 0 2 2 0 01-4 0z" /><path d="M9 26c8.5-1.5 18.5-1.5 27 0l-2.5-13.5L31 25l-6-15-6 15-2.5-12.5L9 26z" /><path d="M9 26c0 2 1.5 3.5 1.5 3.5L12 35h21l1.5-5.5S36 28 36 26c-9 .5-18 .5-27 0z" /><path d="M12 35h21v4H12v-4z" /></g>;
        case 'k': return <g style={style}><path d="M22.5 11.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" /><path d="M22.5 25s4.5-7.5 3-10.5a5.5 5.5 0 00-3-3 5.5 5.5 0 00-3 3c-1.5 3 3 10.5 3 10.5" /><path d="M12 34.5h21v-3H12v3zM12 31.5h21v-3H12v3z" /><path d="M22.5 4.5v-3M20 3.5h5" /></g>;
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
  const styles = pieceStyles.find(s => s.id === pieceStyle) || pieceStyles[3];

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
                  <svg viewBox="0 0 45 45" className="w-full h-full" style={{ color: piece.color === 'w' ? styles.colors[1] : styles.colors[0] }}>
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
