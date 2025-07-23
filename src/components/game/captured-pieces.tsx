
'use client';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { GitBranch } from 'lucide-react';
import { useGame } from '@/context/game-context';
import { getPieceIcon } from '@/lib/get-piece-icon';
import { useEffect, useState } from 'react';

type CapturedPiecesProps = {
    player: 'p1' | 'p2';
    pieceStyle?: string;
}

const pieceStyles = [
    { id: 'red_black', name: 'Red & Black', colors: ['#dc2626', '#18181b'] },
    { id: 'orange_gold', name: 'Orange & Gold', colors: ['#f97316', '#ca8a04'] },
    { id: 'pink_royal_blue', name: 'Pink & Royal Blue', colors: ['#ec4899', '#3b82f6'] },
    { id: 'natural_purple', name: 'Natural & Purple', colors: ['#e2e8f0', '#8b5cf6'] },
    { id: 'black_white', name: 'Black & White', colors: ['#0f172a', '#f8fafc'] },
];

export function CapturedPieces({ player, pieceStyle = 'black_white' }: CapturedPiecesProps) {
    const { capturedByPlayer, capturedByBot } = useGame();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const pieces = player === 'p1' ? capturedByBot : capturedByPlayer;
    const styles = pieceStyles.find(s => s.id === pieceStyle) || pieceStyles[4];

    return (
        <Card className="flex-1">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <GitBranch className="w-5 h-5"/>
                    Captured Pieces
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isClient && pieces.length > 0 ? (
                    <div className="grid grid-cols-8 gap-1">
                        {pieces.map((piece, index) => (
                            <div key={index} className="w-8 h-8">
                                <svg viewBox="0 0 45 45" className="w-full h-full">
                                    {getPieceIcon(piece.type, piece.color === 'w' ? styles.colors[1] : styles.colors[0])}
                                </svg>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-sm">No pieces captured yet.</p>
                )}
            </CardContent>
        </Card>
    )
}
