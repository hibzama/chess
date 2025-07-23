
'use client'
import { Chess } from 'chess.js';
import { cn } from '@/lib/utils';
import { getPieceIcon } from '@/lib/get-piece-icon';

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

type ChessPiecePreviewProps = {
    boardTheme?: string;
    pieceStyle?: string;
}

export function ChessPiecePreview({ boardTheme = 'ocean', pieceStyle = 'black_white' }: ChessPiecePreviewProps) {
    const game = new Chess();
    const board = game.board();

    const theme = boardThemes.find(t => t.id === boardTheme) || boardThemes[2];
    const styles = pieceStyles.find(s => s.id === pieceStyle) || pieceStyles[4];

    return (
        <div className="grid grid-cols-8 aspect-square w-full shadow-lg border rounded-md overflow-hidden bg-card">
            {board.map((row, rowIndex) => (
                row.map((piece, colIndex) => {
                    const isLight = (rowIndex + colIndex) % 2 !== 0;
                    return (
                        <div key={`${rowIndex}-${colIndex}`} className={cn('w-full h-full flex items-center justify-center')} style={{backgroundColor: isLight ? theme.colors[0] : theme.colors[1]}}>
                           {piece && (
                                <svg viewBox="0 0 45 45" className="w-full h-full p-1">
                                    {getPieceIcon(piece.type, piece.color === 'w' ? styles.colors[1] : styles.colors[0])}
                                </svg>
                           )}
                        </div>
                    )
                })
            ))}
        </div>
    );
};
