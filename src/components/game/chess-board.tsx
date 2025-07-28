
'use client';
import { useState, useEffect, useCallback } from 'react';
import { Chess, Square, Piece } from 'chess.js';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getPieceIcon } from '@/lib/get-piece-icon';
import { useGame, GameOverReason } from '@/context/game-context';

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


type ChessBoardProps = {
    boardTheme?: string;
    pieceStyle?: string;
}

export default function ChessBoard({ boardTheme = 'ocean', pieceStyle = 'black_white' }: ChessBoardProps) {
  const [game, setGame] = useState(new Chess());
  const [selectedPiece, setSelectedPiece] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const { toast } = useToast();
  const { switchTurn, playerColor, setWinner, gameOver, currentPlayer, boardState, loadGameState, isMounted, isMultiplayer, user, room } = useGame();

  const theme = boardThemes.find(t => t.id === boardTheme) || boardThemes[2];
  const styles = pieceStyles.find(s => s.id === pieceStyle) || pieceStyles[4];
  const isFlipped = playerColor === 'b';


   useEffect(() => {
        if (boardState && boardState.fen) {
            try {
                const newGame = new Chess(boardState.fen);
                setGame(newGame);
            } catch (e) {
                console.error("Invalid FEN string in saved state:", e);
                setGame(new Chess());
            }
        } else {
             setGame(new Chess());
        }
   }, [boardState]);


  const checkGameOver = useCallback(() => {
    if (game.isGameOver()) {
        const fen = game.fen();
        if (game.isCheckmate()) {
            let winnerId: string | null = null;
            if (isMultiplayer && room && room.player2) {
                const loserColor = game.turn(); // The player whose turn it is, is checkmated.
                const creatorIsWinner = room.createdBy.color !== loserColor;
                winnerId = creatorIsWinner ? room.createdBy.uid : room.player2.uid;
            } else { // Practice mode
                const winnerColor = game.turn() === 'w' ? 'b' : 'w';
                winnerId = playerColor === winnerColor ? 'p1' : 'bot';
            }
            setWinner(winnerId, { fen }, 'checkmate');
        } else {
            setWinner('draw', { fen }, 'draw');
        }
    }
}, [game, setWinner, playerColor, isMultiplayer, room]);


  // Bot logic
  useEffect(() => {
    if (!isMultiplayer && !gameOver && currentPlayer !== playerColor && isMounted) {
      const timer = setTimeout(() => {
        const moves = game.moves();
        if (moves.length > 0) {
          const move = moves[Math.floor(Math.random() * moves.length)];
          const result = game.move(move);
          if (result) {
            const newGame = new Chess(game.fen());
            setGame(newGame);
            const captured = result.captured ? { type: result.captured, color: result.color === 'w' ? 'b' : 'w' } as Piece : undefined;
            checkGameOver();
            switchTurn({ fen: newGame.fen() }, result.san, captured);
          }
        }
      }, 1000); // 1-second delay for bot move
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, game, gameOver, playerColor, switchTurn, checkGameOver, isMounted, isMultiplayer]);


  const getSquareFromIndices = (row: number, col: number): Square => {
    if (isFlipped) {
      return `${String.fromCharCode('a'.charCodeAt(0) + (7 - col))}${row + 1}` as Square;
    }
    return `${String.fromCharCode('a'.charCodeAt(0) + col)}${8 - row}` as Square;
  }

  const handleSquareClick = (row: number, col: number) => {
    if (gameOver || currentPlayer !== playerColor) return;
    const square = getSquareFromIndices(row, col);

    if (selectedPiece) {
      const move = {
        from: selectedPiece,
        to: square,
        promotion: 'q' // Always promote to queen for simplicity in this app
      };
      
      const isLegal = game.moves({ square: selectedPiece, verbose: true }).some(m => m.to === square);

      if (isLegal) {
        const result = game.move(move);
        if (result) {
            const newGame = new Chess(game.fen());
            setGame(newGame);
            const captured = result.captured ? { type: result.captured, color: result.color === 'w' ? 'b' : 'w' } as Piece : undefined;
            checkGameOver();
            switchTurn({ fen: newGame.fen() }, result.san, captured);
        }
      }
      setSelectedPiece(null);
      setLegalMoves([]);
    } else {
      const pieceOnSquare = game.get(square);
      if (pieceOnSquare && pieceOnSquare.color === game.turn() && pieceOnSquare.color === playerColor) {
        setSelectedPiece(square);
        const moves = game.moves({ square, verbose: true });
        setLegalMoves(moves.map(m => m.to));
      }
    }
  };
  
  const displayedBoard = isFlipped ? [...game.board()].reverse().map(row => [...row].reverse()) : game.board();

  return (
    <div className="grid grid-cols-8 aspect-square w-full max-w-[75vh] lg:max-w-lg shadow-2xl border-2 border-border rounded-lg overflow-hidden">
      {displayedBoard.map((rowArr, rowIndex) =>
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
              {isMounted && piece && (
                <div className={cn(
                  'w-full h-full flex items-center justify-center transition-transform duration-300 ease-in-out',
                  isSelected ? 'scale-110 -translate-y-1' : ''
                )}>
                  <div className="w-full h-full p-1">
                    {getPieceIcon(piece.type, piece.color === 'w' ? styles.colors[1] : styles.colors[0])}
                  </div>
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
