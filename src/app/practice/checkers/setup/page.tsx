
'use client'
import { GameSetup } from "@/components/game/game-setup";
import { GameProvider } from "@/context/game-context";

export default function CheckersSetupPage() {
    return (
        <GameProvider gameType="checkers">
            <GameSetup gameType="checkers" />
        </GameProvider>
    );
}
