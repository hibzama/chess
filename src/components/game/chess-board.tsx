'use client';
import { useState, useEffect } from 'react';
import { Chess, Square } from 'chess.js';
import { cn } from '@/lib/utils';
import {
  BlackPawn, WhitePawn, BlackRook, WhiteRook, BlackKnight, WhiteKnight,
  BlackBishop, WhiteBishop, BlackQueen, WhiteQueen, BlackKing, WhiteKing
} from '@/components/icons/chess-pieces';
import { useToast } from '@/hooks/use-toast';

const pieceComponents: { [key: string]: React.ComponentType<any> } = {
  p: BlackPawn, P: WhitePawn,
  r: BlackRook, R: WhiteRook,
  n: BlackKnight, N: WhiteKnight,
  b: BlackBishop, B: WhiteBishop,
  q: BlackQueen, Q: WhiteQueen,
  k: BlackKing, K: WhiteKing
};

// Map chess.js pieces to our components
const getPieceComponent = (piece: { type: string, color: string }) => {
    if (!piece) return null;
    const key = piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
    // Special handling for white pieces in our component map
    if (piece.color === 'w') {
        return pieceComponents[key];
    }
    return pieceComponents[key];
};

export default function ChessBoard() {
  const [game, setGame] = useState(new Chess());
  const [board, setBoard] = useState(game.board());
  const [selectedPiece, setSelectedPiece] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const { toast } = useToast();

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

  const getIndicesFromSquare = (square: Square): [number, number] => {
    const col = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = 8 - parseInt(square.charAt(1));
    return [row, col];
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
          const PieceComponent = piece ? getPieceComponent(piece) : null;
          
          const isSelected = selectedPiece === square;
          const isLegalMove = legalMoves.includes(square);
          const isLightSquare = (rowIndex + colIndex) % 2 !== 0;

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={cn(
                'flex items-center justify-center relative aspect-square transition-colors',
                isLightSquare ? 'bg-secondary' : 'bg-card',
                'hover:bg-primary/20 cursor-pointer'
              )}
              onClick={() => handleSquareClick(rowIndex, colIndex)}
            >
              {PieceComponent && (
                <div className={cn(
                  'w-full h-full p-1 transition-transform duration-300 ease-in-out',
                  isSelected ? 'scale-110 -translate-y-1' : ''
                )}>
                  <PieceComponent className="w-full h-full drop-shadow-lg" />
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
