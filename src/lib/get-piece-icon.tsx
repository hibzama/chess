import { WhitePawn, BlackPawn, WhiteRook, BlackRook, WhiteKnight, BlackKnight, WhiteBishop, BlackBishop, WhiteQueen, BlackQueen, WhiteKing, BlackKing } from "@/components/icons/chess-pieces";

import React from 'react';

export const getPieceIcon = (type: string, color: string) => {
    const isWhite = color === '#f8fafc' || color === '#e2e8f0'; // Corresponds to black_white and natural_purple light colors

    const style: React.CSSProperties = {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
    };

    const pieceProps = {
        style: style,
        fill: color,
        stroke: color === '#0f172a' || color === '#18181b' ? '#f8fafc' : '#0f172a',
        strokeWidth: 1.5,
    };

    switch (type.toLowerCase()) {
        case 'p': return isWhite ? <WhitePawn {...pieceProps} /> : <BlackPawn {...pieceProps} />;
        case 'r': return isWhite ? <WhiteRook {...pieceProps} /> : <BlackRook {...pieceProps} />;
        case 'n': return isWhite ? <WhiteKnight {...pieceProps} /> : <BlackKnight {...pieceProps} />;
        case 'b': return isWhite ? <WhiteBishop {...pieceProps} /> : <BlackBishop {...pieceProps} />;
        case 'q': return isWhite ? <WhiteQueen {...pieceProps} /> : <BlackQueen {...pieceProps} />;
        case 'k': return isWhite ? <WhiteKing {...pieceProps} /> : <BlackKing {...pieceProps} />;
        default: return null;
    }
}
