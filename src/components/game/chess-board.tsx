'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  BlackPawn, WhitePawn, BlackRook, WhiteRook, BlackKnight, WhiteKnight,
  BlackBishop, WhiteBishop, BlackQueen, WhiteQueen, BlackKing, WhiteKing
} from '@/components/icons/chess-pieces';

const initialBoard = [
  ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
  ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
  ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr'],
];

const pieceComponents: { [key: string]: React.ComponentType<any> } = {
  bp: BlackPawn, wp: WhitePawn,
  br: BlackRook, wr: WhiteRook,
  bn: BlackKnight, wn: WhiteKnight,
  bb: BlackBishop, wb: WhiteBishop,
  bq: BlackQueen, wq: WhiteQueen,
  bk: BlackKing, wk: WhiteKing
};

export default function ChessBoard() {
  const [board, setBoard] = useState(initialBoard);
  const [selectedPiece, setSelectedPiece] = useState<[number, number] | null>(null);

  const handleSquareClick = (row: number, col: number) => {
    if (selectedPiece) {
      const [selectedRow, selectedCol] = selectedPiece;
      if (row === selectedRow && col === selectedCol) {
        setSelectedPiece(null); // Deselect
        return;
      }
      
      const newBoard = board.map(r => [...r]);
      newBoard[row][col] = newBoard[selectedRow][selectedCol];
      newBoard[selectedRow][selectedCol] = null;
      setBoard(newBoard);
      setSelectedPiece(null);
    } else if (board[row][col]) {
      setSelectedPiece([row, col]);
    }
  };

  return (
    <div className="grid grid-cols-8 aspect-square w-full max-w-[75vh] lg:max-w-lg shadow-2xl border-2 border-border rounded-lg overflow-hidden">
      {board.map((row, rowIndex) =>
        row.map((piece, colIndex) => {
          const isLightSquare = (rowIndex + colIndex) % 2 !== 0;
          const PieceComponent = piece ? pieceComponents[piece] : null;
          const isSelected = selectedPiece && selectedPiece[0] === rowIndex && selectedPiece[1] === colIndex;

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
