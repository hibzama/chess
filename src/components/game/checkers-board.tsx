'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';

type Piece = 'b' | 'w' | 'bk' | 'wk'; // black, white, black king, white king
const initialBoard: (Piece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));

// Setup initial pieces
for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 !== 0) { // only on dark squares
            if (row < 3) initialBoard[row][col] = 'b';
            if (row > 4) initialBoard[row][col] = 'w';
        }
    }
}

const PieceComponent = ({ piece }: { piece: Piece }) => {
    const isKing = piece === 'bk' || piece === 'wk';
    return (
        <div className={cn('w-10/12 h-10/12 rounded-full flex items-center justify-center shadow-lg border-2',
            (piece === 'b' || piece === 'bk') ? 'bg-gray-900 border-gray-700' : 'bg-gray-200 border-gray-400'
        )}>
            {isKing && (
              <Crown className={cn('w-6 h-6', (piece === 'bk') ? 'text-gray-200' : 'text-gray-900')} />
            )}
        </div>
    );
};

export default function CheckersBoard() {
    const [board, setBoard] = useState(initialBoard);
    const [selectedPiece, setSelectedPiece] = useState<[number, number] | null>(null);
    
    const handleSquareClick = (row: number, col: number) => {
        if ((row + col) % 2 === 0) return; // Can't move on light squares

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
        {board.map((rowItem, rowIndex) =>
            rowItem.map((piece, colIndex) => {
            const isDarkSquare = (rowIndex + colIndex) % 2 !== 0;
            const isSelected = selectedPiece && selectedPiece[0] === rowIndex && selectedPiece[1] === colIndex;

            return (
                <div
                key={`${rowIndex}-${colIndex}`}
                className={cn(
                    'flex items-center justify-center relative aspect-square transition-colors',
                    isDarkSquare ? 'bg-secondary' : 'bg-card',
                    isDarkSquare && 'hover:bg-primary/20 cursor-pointer'
                )}
                onClick={() => handleSquareClick(rowIndex, colIndex)}
                >
                {piece && (
                    <div className={cn('w-full h-full flex items-center justify-center transition-transform duration-300 ease-in-out',
                        isSelected ? 'scale-110 -translate-y-1' : ''
                    )}>
                        <PieceComponent piece={piece} />
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
