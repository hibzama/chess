
import React from 'react';

export const getPieceIcon = (type: string, color: string) => {
    // The explicit fill and stroke on the path elements will override this, but it's good for fallback.
    const pieceFill = color;
    // Black pieces get a white stroke, all other pieces get a black stroke.
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
            return <g style={style}><path d="M14 10h17l-2.5 4h-12L14 10zM14 16h17v4h-17zM12 22h21v11h-21zM9 35h27v4h-27z" /></g>;
        case 'n': // Knight
            return <g style={style}><path d="M24 10c-3.5 0-5.5 2-5.5 4.5 0 2.5 1.5 4 1.5 4l-2 2.5c-0.5 0.5-1 1-1 2 0 1 0.5 1.5 0.5 1.5l-1.5 1.5c-1 1-1.5 2.5-1.5 4v1h19v-1c0-1.5-0.5-3-1.5-4l-1.5-1.5c0 0 0.5-0.5 0.5-1.5 0-1-0.5-1.5-1-2l-2-2.5c0 0 1.5-1.5 1.5-4C30.5 12 27.5 10 24 10zM24 28.5c-1.5 0-3 1-3.5 2.5h7C27 29.5 25.5 28.5 24 28.5z" /></g>;
        case 'b': // Bishop
            return <g style={style}><path d="M22.5 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-3.5 10c-1.5 0-3 2-3 4s1.5 4 3 4h7c1.5 0 3-2 3-4s-1.5-4-3-4h-7zm-1.5 12h10v3h-10z" /></g>;
        case 'q': // Queen
            return <g style={style}><path d="M12 13l3.5-3 7 10 7-10 3.5 3-10.5 14h-7L12 13z m-2 18h25v4H10z m2 4h21v4H12z" /></g>;
        case 'k': // King
            return <g style={style}><path d="M22.5,11.5c4,0,6,2.5,6,6.5c0,4-2.5,7.5-5.5,9.5c-2,1-4.5,1-4.5,1s-2.5,0-4.5-1 c-3-2-5.5-5.5-5.5-9.5c0-4,2-6.5,6-6.5 M22.5,6h-3v3h-3v3h3v-3h3V6z M12,32h21v-3H12v3z M15,35h15v-2H15v2z" /></g>;
        default: return null;
    }
}
