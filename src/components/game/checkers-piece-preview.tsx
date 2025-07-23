
'use client'

import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

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

const CheckersPieceComponent = ({ color, isKing }: { color: string, isKing?: boolean }) => (
    <div className="w-5/6 h-5/6 relative flex items-center justify-center">
        <div 
            className="w-full h-full rounded-full shadow-lg border-2 border-black/50"
            style={{ backgroundColor: color }}
        />
        {isKing && (
          <Crown className="w-1/2 h-1/2 absolute text-yellow-400" />
        )}
    </div>
);

type CheckersPiecePreviewProps = {
    boardTheme?: string;
    pieceStyle?: string;
}

export function CheckersPiecePreview({ boardTheme = 'classic', pieceStyle = 'red_black' }: CheckersPiecePreviewProps) {

    const theme = boardThemes.find(t => t.id === boardTheme) || boardThemes[0];
    const styles = pieceStyles.find(s => s.id === pieceStyle) || pieceStyles[0];
    
    const currentPieceColors = styles.colors;
    const currentBoardColors = theme.colors;

    return (
        <div className="grid grid-cols-8 aspect-square w-full shadow-lg border rounded-md overflow-hidden bg-card">
            {Array(8).fill(null).map((_, r) => Array(8).fill(null).map((_, c) => {
                const isDark = (r + c) % 2 !== 0;
                let piece = null;
                if (isDark) {
                    if (r < 3) piece = <CheckersPieceComponent color={currentPieceColors[0]} isKing={r===0} />
                    if (r > 4) piece = <CheckersPieceComponent color={currentPieceColors[1]} isKing={r===7} />
                }
                return <div key={`${r}-${c}`} className="flex items-center justify-center" style={{backgroundColor: isDark ? currentBoardColors[1] : currentBoardColors[0]}}>{piece}</div>
            }))}
        </div>
    );
}
