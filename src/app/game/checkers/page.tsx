import CheckersBoard from '@/components/game/checkers-board';
import GameLayout from '@/components/game/game-layout';

export default function CheckersPage() {
  return (
    <GameLayout gameType="Checkers">
      <CheckersBoard />
    </GameLayout>
  );
}
