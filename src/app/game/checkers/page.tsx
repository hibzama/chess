
'use client'
import CheckersBoard from '@/components/game/checkers-board';
import GameLayout from '@/components/game/game-layout';
import { useAuth } from '@/context/auth-context';
import { GameProvider } from '@/context/game-context';

export default function CheckersPage() {
  const { userData } = useAuth();
  const equipment = userData?.equipment?.checkers;

  return (
    <GameProvider gameType="checkers">
        <GameLayout gameType="Checkers">
            <CheckersBoard boardTheme={equipment?.boardTheme} pieceStyle={equipment?.pieceStyle} />
        </GameLayout>
    </GameProvider>
  );
}
