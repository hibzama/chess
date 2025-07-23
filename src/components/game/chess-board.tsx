
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
    const style = { width: '100%', height: '100%', fill: 'currentColor', stroke: 'black', strokeWidth: 0.5 };
    switch(type) {
        case 'p': return <svg viewBox="0 0 45 45" style={style}><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38-1.98 1.48-3.28 3.89-3.28 6.62 0 4.42 3.58 8 8 8s8-3.58 8-8c0-2.73-1.3-5.14-3.28-6.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/></svg>;
        case 'r': return <svg viewBox="0 0 45 45" style={style}><path d="M9 14h27v5h-27zM12 19h21v12h-21zM9 31h27v5h-27zM11 11h23v3h-23zM14 8h17v3h-17z"/></svg>;
        case 'n': return <svg viewBox="0 0 45 45" style={style}><path d="M22 10c-3 0-5.5 2-6 4H14c-1 0-2 .5-2 1.5 0 .5.5 1 1 1h1.5c-.5 1-1 2-1 3.5 0 2.5 1.5 5 4 5h3c.5 0 1 0 1.5-.5.5-.5.5-1 0-1.5-1-.5-1.5-1-1.5-2.5 0-1 .5-2 1.5-2.5.5-.5.5-1 0-1.5-1-.5-1.5-1-1.5-2.5 0-1 .5-2 1.5-2.5.5-.5.5-1 0-1.5C25 12 24 10 22 10zm-1.5 12c-1.5 0-2.5 1-2.5 2.5s1 2.5 2.5 2.5 2.5-1 2.5-2.5-1-2.5-2.5-2.5z"/></svg>;
        case 'b': return <svg viewBox="0 0 45 45" style={style}><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.3 16.86 16 19.27 16 22c0 4.42 3.58 8 8 8s8-3.58 8-8c0-2.73-1.3-5.14-3.28-6.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4zm0 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/></svg>;
        case 'q': return <svg viewBox="0 0 45 45" style={style}><path d="M8 12h29l-3.5 14h-22zm-2 16h33v5h-33zM22.5 6l-6 6h12z"/></svg>;
        case 'k': return <svg viewBox="0 0 45 45" style={style}><path d="M22.5 6L19.5 12h6zM15 13h15v18h-15zM12 31h21v5h-21z"/></svg>;
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
                isLightSquare ? 'border-black/10' : 'border-transparent'
              )}
               style={{ backgroundColor: isLightSquare ? theme.colors[0] : theme.colors[1] }}
              onClick={() => handleSquareClick(rowIndex, colIndex)}
            >
              {piece && (
                <div className={cn(
                  'w-full h-full transition-transform duration-300 ease-in-out p-1',
                  isSelected ? 'scale-110 -translate-y-1' : ''
                )} style={{ color: piece.color === 'w' ? styles.colors[1] : styles.colors[0], stroke: piece.color === 'w' ? styles.colors[0] : styles.colors[1]}}>
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
