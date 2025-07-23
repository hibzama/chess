
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
        case 'p': return <svg viewBox="0 0 45 45" style={style}><path d="M22.5 9C19.5 9 19 10.5 19 10.5L19 13C19 13 20.5 13 22.5 13C24.5 13 26 13 26 13L26 10.5C26 10.5 25.5 9 22.5 9Z M22.5 14C19.5 14 19 15.5 19 15.5L19 20C19 20 20.5 21 22.5 21C24.5 21 26 20 26 20L26 15.5C26 15.5 25.5 14 22.5 14Z M17.5 23L17.5 25.5L27.5 25.5L27.5 23L17.5 23Z M14.5 27.5L14.5 30L30.5 30L30.5 27.5L14.5 27.5Z" /></svg>;
        case 'r': return <svg viewBox="0 0 45 45" style={style}><path d="M9 13L9 16L12 16L12 13L9 13ZM15 13L15 16L18 16L18 13L15 13ZM21 13L21 16L24 16L24 13L21 13ZM27 13L27 16L30 16L30 13L27 13ZM33 13L33 16L36 16L36 13L33 13ZM9 19L9 30L36 30L36 19L9 19ZM9 33L9 36L36 36L36 33L9 33Z" /></svg>;
        case 'n': return <svg viewBox="0 0 45 45" style={style}><path d="M22,10C32.5,10,31.5,18.5,31.5,18.5C31.5,24,28,29,28,29L15.5,29C15.5,29,13.5,24.5,13.5,24.5C13.5,24.5,13.5,19.5,13.5,19.5C13.5,19.5,14,16.5,14,16.5C14,16.5,11.5,14.5,11.5,14.5C11.5,14.5,10.5,12,10.5,12C10.5,12,12.5,10,12.5,10C12.5,10,15,11.5,15,11.5C15,11.5,16,10,22,10ZM12.5,32L31.5,32L31.5,39L12.5,39L12.5,32Z" /></svg>;
        case 'b': return <svg viewBox="0 0 45 45" style={style}><path d="M15 14L15 17L18 17L18 14L15 14ZM21 14L21 17L24 17L24 14L21 14ZM27 14L27 17L30 17L30 14L27 14ZM9 19L9 22L12 22L12 19L9 19ZM33 19L33 22L36 22L36 19L33 19ZM15 25L15 33L30 33L30 25L15 25ZM9 36L9 39L36 39L36 36L9 36Z" /></svg>;
        case 'q': return <svg viewBox="0 0 45 45" style={style}><path d="M8 12L14 4.5L22.5 7L31 4.5L37 12L8 12ZM8 15L37 15L37 26L8 26L8 15ZM14 29.5L31 29.5L31 31.5L14 31.5L14 29.5ZM11 34L34 34L34 36L11 36L11 34ZM12.5 38L32.5 38L32.5 40L12.5 40L12.5 38Z" /></svg>;
        case 'k': return <svg viewBox="0 0 45 45" style={style}><path d="M22.5 6L20 11L25 11L22.5 6ZM21 11.5L21 14.5L24 14.5L24 11.5L21 11.5ZM12 14.5L12 21.5L33 21.5L33 14.5L12 14.5ZM12 23.5L12 25.5L33 25.5L33 23.5L12 23.5ZM14 27.5L14 36.5L31 36.5L31 27.5L14 27.5ZM16 38.5L16 40.5L29 40.5L29 38.5L16 38.5Z" /></svg>;
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
