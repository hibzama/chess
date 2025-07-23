
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
    const style = { width: '100%', height: '100%', fill: 'currentColor', stroke: 'none' };
    switch(type) {
        case 'p': return <svg viewBox="0 0 100 100" style={style}><path d="M50 15A12 12 0 1 1 50 39A12 12 0 1 1 50 15M35 42L65 42L65 50L35 50ZM38 53L62 53L62 85L38 85Z"/></svg>;
        case 'r': return <svg viewBox="0 0 100 100" style={style}><path d="M25 15L75 15L75 25L65 25L65 20L55 20L55 25L45 25L45 20L35 20L35 25L25 25ZM25 30L75 30L75 85L25 85Z" /></svg>;
        case 'n': return <svg viewBox="0 0 100 100" style={style}><path d="M35 15L60 15L50 45L60 45L60 70L30 70L30 55L20 55L20 30L35 30ZM30 85L70 85L70 75L30 75Z"/></svg>;
        case 'b': return <svg viewBox="0 0 100 100" style={style}><path d="M50 15L65 40L35 40ZM35 45L65 45L65 50L35 50ZM38 53L62 53L62 85L38 85Z"/></svg>;
        case 'q': return <svg viewBox="0 0 100 100" style={style}><path d="M25 15L75 15L75 30L25 30ZM20 35L80 35L70 85L30 85Z"/></svg>;
        case 'k': return <svg viewBox="0 0 100 100" style={style}><path d="M45 10L55 10L55 20L65 20L65 30L55 30L55 40L45 40L45 30L35 30L35 20L45 20ZM25 45L75 45L70 85L30 85Z" /></svg>;
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
                  'w-full h-full p-1 flex items-center justify-center transition-transform duration-300 ease-in-out',
                  isSelected ? 'scale-110 -translate-y-1' : ''
                )} style={{ color: piece.color === 'w' ? styles.colors[1] : styles.colors[0] }}>
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
