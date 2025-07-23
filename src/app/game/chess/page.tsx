
'use client'
import ChessBoard from '@/components/game/chess-board';
import GameLayout from '@/components/game/game-layout';
import { useAuth } from '@/context/auth-context';

export default function ChessPage() {
  const { userData } = useAuth();
  const equipment = userData?.equipment?.chess;

  return (
    <GameLayout gameType="Chess">
      <ChessBoard boardTheme={equipment?.boardTheme} pieceStyle={equipment?.pieceStyle} />
    </GameLayout>
  );
}
