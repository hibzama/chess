import ChessBoard from '@/components/game/chess-board';
import GameLayout from '@/components/game/game-layout';

export default function ChessPage() {
  return (
    <GameLayout gameType="Chess">
      <ChessBoard />
    </GameLayout>
  );
}
