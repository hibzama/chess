
'use client'
import { GameSetup } from "@/components/game/game-setup";
import { GameProvider } from "@/context/game-context";

export default function ChessSetupPage() {
    return (
        <GameProvider gameType="chess">
            <GameSetup gameType="chess" />
        </GameProvider>
    );
}
