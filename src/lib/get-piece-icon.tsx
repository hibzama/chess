
import React from 'react';

export const getPieceIcon = (type: string, color: string) => {
    const pieceFill = color;
    const pieceStroke = color === '#0f172a' || color === '#18181b' ? '#f8fafc' : '#0f172a';

    const style: React.CSSProperties = {
        fill: pieceFill,
        stroke: pieceStroke,
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
    };

    switch (type.toLowerCase()) {
        case 'p': // Pawn
            return <g style={style}><path d="M22.5 9.5c-1.8 0-3.25 1.45-3.25 3.25s1.45 3.25 3.25 3.25 3.25-1.45 3.25-3.25S24.3 9.5 22.5 9.5zM19 20h7c0 2-1 4-3.5 4S19 22 19 20zM17 26h11v4H17z" /></g>;
        case 'r': // Rook
            return <g style={style}><path d="M9 39h27v-3H9v3zM12.5 36v-4h20v4h-20zM12.5 32V14h20v18h-20zM14 14V9h5v2h7V9h5v5H14z" /></g>;
        case 'n': // Knight
            return <g style={style}><path d="M22 10c-3 0-5.5 2.5-5.5 6 0 2.5 2 4.5 2 4.5l-3 3s-1 1-1 2.5 1 2.5 1 2.5l-2 3h19v-4.5l-2-2.5s1-1.5 1-2.5-2.5-6-5-6zm-4 13.5s1.5-1.5 1.5-2.5 0-2-1.5-2.5l-1-1v3l.5 3z" /></g>;
        case 'b': // Bishop
            return <g style={style}><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2H6c1.35-1.46 3-2 3-2z M15 32V29.5s0-2.5 2.5-5l5-5c1.5-1.5 2.5-1.5 2.5-1.5s1 0 2.5 1.5l5 5c2.5 2.5 2.5 5 2.5 5V32H15z M22.5 8.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" /></g>;
        case 'q': // Queen
            return <g style={style}><path d="M8 12l3-9h23l3 9-12.5 13.5L8 12z M8 12h30 M11.5 39.5h22v-4h-22v4z m2-4h18v-3h-18v3z m-1-3h20v-3h-20v3z" /></g>;
        case 'k': // King
            return <g style={style}><path d="M22.5 6h-3v3h-3v3h3v-3h3V6zm-9 23.5h21v-4h-21v4z m2-4h17v-3h-17v3z m-1-3h19v-4h-19v4z m-1-4h21v-3h-21v3zM12 11.5s2-5 10.5-5 10.5 5 10.5 5C33 18 28.5 24.5 22.5 24.5S12 18 12 11.5z" /></g>;
        default: return null;
    }
}
