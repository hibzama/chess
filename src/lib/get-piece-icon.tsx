import { WhitePawn, BlackPawn, WhiteRook, BlackRook, WhiteKnight, BlackKnight, WhiteBishop, BlackBishop, WhiteQueen, BlackQueen, WhiteKing, BlackKing } from "@/components/icons/chess-pieces";
import React from 'react';

export const getPieceIcon = (type: string, color: string) => {
    const isWhite = color === '#f8fafc' || color === '#e2e8f0';

    const props = {
        style: {
            fill: color,
            stroke: (color === '#0f172a' || color === '#18181b') ? '#f8fafc' : '#0f172a',
            strokeWidth: 1.5,
            strokeLinejoin: 'round',
            strokeLinecap: 'round',
        } as React.CSSProperties
    };

    switch (type.toLowerCase()) {
        case 'p': return isWhite ? <WhitePawn {...props} /> : <BlackPawn {...props} />;
        case 'r': return isWhite ? <WhiteRook {...props} /> : <BlackRook {...props} />;
        case 'n': return isWhite ? <WhiteKnight {...props} /> : <BlackKnight {...props} />;
        case 'b': return isWhite ? <WhiteBishop {...props} /> : <BlackBishop {...props} />;
        case 'q': return isWhite ? <WhiteQueen {...props} /> : <BlackQueen {...props} />;
        case 'k': return isWhite ? <WhiteKing {...props} /> : <BlackKing {...props} />;
        default: return null;
    }
}
