
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

const getPieceIcon = (type: string) => {
    const style = { width: '100%', height: '100%', fill: 'currentColor' };
    switch(type) {
        case 'p': return <svg viewBox="0 0 45 45" style={style}><g transform="translate(0,2.5)"><path d="M22.5,9.5c3.31,0,6,2.69,6,6s-2.69,6-6,6s-6-2.69-6-6S19.19,9.5,22.5,9.5z M22.5,22.5c-2.76,0-5,2.24-5,5v2.5h10v-2.5 C27.5,24.74,25.26,22.5,22.5,22.5z M17.5,31.5h10V34h-10V31.5z"/></g></svg>
        case 'r': return <svg viewBox="0 0 45 45" style={style}><path d="m9,39h27v-3h-27v3zm3-3h21v-4h-21v4zm-1-22v-9h4v2h5v-2h5v2h5v-2h4v9h-27zm2,2h23v-5l-2,2-3-2-3,2-2.5-2-2.5,2-3-2-3,2-2-2v5zM14,19h17v12h-17v-12z" /></svg>
        case 'n': return <svg viewBox="0 0 45 45" style={style}><path d="m22,10c-2.32,0-4.32,0.77-6,2.29C14.33,13.4,14,14.89,14,17.5c0,3,1,6,3,8.5l1,1.5H12v4h11.5v-3.48l-0.52-0.52c-0.66-0.66-1.2-1.42-1.63-2.28C20.46,24.13,20,22.82,20,21.5c0-1.89,0.76-3.6,2-4.82V16c1-2,3-3,3-3s1,1,1,3v0.68c1.24,1.22,2,2.93,2,4.82c0,1.32-0.46,2.63-1.35,3.72c-0.43,0.86-0.97,1.62-1.63,2.28l-0.52,0.52V34H33v-4h-6.02l1-1.5c2-2.5,3-5.5,3-8.5c0-2.61-0.33-4.1-2-5.21C26.32,10.77,24.32,10,22,10z" /></svg>
        case 'b': return <svg viewBox="0 0 45 45" style={style}><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2H6c1.35-1.46 3-2 3-2zM15 32l7.5-12 7.5 12h-15z m-.5-1c-1-1-1.5-2.5-1.5-4 0-2.5 1.5-4.5 2.5-6 .5 1 .5 2.5 0 3.5-1.5 1.5-1.5 2.5-1 4.5zM30.5 31c1-1 1.5-2.5 1.5-4 0-2.5-1.5-4.5-2.5-6-.5 1-.5 2.5 0 3.5 1.5 1.5 1.5 2.5 1 4.5zM17.5 24.5l5-8.5 5 8.5h-10zM22.5 8.5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z" /></svg>
        case 'q': return <svg viewBox="0 0 45 45" style={style}><path d="M8 12l3.5-7 5.5 4 5.5-4L26 5l5.5 7L37 12v3H8v-3zM8 15h29v11H8V15z m2.5 13.5L8 39h29l-2.5-10.5h-24z m-1 2h25l2 8H7l1.5-8zM12 18v6h4v-6h-4zm17 0v6h4v-6h-4z" /></svg>
        case 'k': return <svg viewBox="0 0 45 45" style={style}><path d="M22.5 6l-2.5 5h5L22.5 6zM21 11.5v3h3v-3h-3zM12 14.5l3.5 3-3.5 4h23l-3.5-4 3.5-3H12zm2 1.5h19l-2 2 2 2H14l2-2-2-2zM12 23.5h21v2H12v-2zm2 3h17v9H14v-9zm2 2v5h13v-5H16z" /></svg>
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
                'hover:bg-primary/20 cursor-pointer'
              )}
               style={{ backgroundColor: isLightSquare ? theme.colors[0] : theme.colors[1] }}
              onClick={() => handleSquareClick(rowIndex, colIndex)}
            >
              {piece && (
                <div className={cn(
                  'w-full h-full p-1 transition-transform duration-300 ease-in-out',
                  isSelected ? 'scale-110 -translate-y-1' : ''
                )} style={{ color: piece.color === 'w' ? styles.colors[1] : styles.colors[0]}}>
                  {getPieceIcon(piece.type)}
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
