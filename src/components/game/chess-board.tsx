
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
    const style = { fill: color, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as React.CSSProperties;
    switch (type.toLowerCase()) {
        case 'p': return <g transform="translate(8.5, 9.5)"><path d="M11.5,2.5 A1.5,1.5 0 1 1 8.5,2.5 A1.5,1.5 0 1 1 11.5,2.5 Z M12,12 L8,12 L8,10 C8,8 9.5,6 10,6 C10.5,6 12,8 12,10 L12,12 Z M5,14 L15,14 L15,16 L5,16 L5,14 Z" {...style} /></g>;
        case 'r': return <g transform="translate(9.5, 9.5)"><path d="M2,16 L2,12 L5,12 L5,2 L15,2 L15,12 L18,12 L18,16 L2,16 Z M3,2 L5,2 M15,2 L17,2 M3,18 L17,18" {...style} /></g>;
        case 'n': return <g transform="translate(8.5, 9.5)"><path d="M6,16 A2,2 0 1 1 2,16 L2,10 C2,10 6,8 8,8 C10,8 14,10 14,10 L14,16 A2,2 0 1 1 10,16" {...style} /></g>;
        case 'b': return <g transform="translate(8.5, 9.5)"><path d="M10,2 L6,6 L14,6 L10,2 Z M6,8 L14,8 L14,14 L6,14 L6,8 Z M4,16 L16,16" {...style} /></g>;
        case 'q': return <g transform="translate(8.5, 9.5)"><path d="M4,16 L16,16 L16,10 L12,12 L8,12 L4,10 L4,16 Z M4,8 L16,8 L15,6 L11,8 L9,8 L5,6 L4,8 Z" {...style} /></g>;
        case 'k': return <g transform="translate(8.5, 9.5)"><path d="M8,16 L12,16 L12,12 L14,14 L14,8 L10,8 L6,8 L6,14 L8,12 L8,16 Z M10,6 L10,4 M8,4 L12,4" {...style} /></g>;
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
                  <svg viewBox="0 0 28 28" className="w-full h-full p-1">
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
