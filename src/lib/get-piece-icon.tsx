import React from 'react';

export const getPieceIcon = (type: string, color: string) => {
    // The explicit fill and stroke on the path elements will override this, but it's good for fallback.
    const pieceFill = color;
    // Black pieces get a white stroke, all other pieces get a black stroke.
    const pieceStroke = color === '#0f172a' || color === '#18181b' ? '#f8fafc' : '#0f172a';

    switch (type.toLowerCase()) {
        case 'p': // Pawn
            return <g transform="translate(2.5, 2.5)"><path d="M12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm-4 2h8v-2a4 4 0 1 0-8 0v2z" stroke={pieceStroke} strokeWidth="1.5" fill={pieceFill} /></g>
        case 'r': // Rook
            return <g transform="translate(2.5, 2.5)"><path d="M6 22v-8h12v8H6zM4 6h16v3H4V6zm2 16h12v2H6v-2z" stroke={pieceStroke} strokeWidth="1.5" fill={pieceFill}/></g>
        case 'n': // Knight
            return <g transform="translate(2.5, 2.5)"><path d="M15 2l-3 3-3-3s-2 2-2 4c0 2 2 4 2 4l-2 2v2h12v-2l-2-2s2-2 2-4c0-2-2-4-2-4zM6 16v6h12v-6H6z" stroke={pieceStroke} strokeWidth="1.5" fill={pieceFill}/></g>
        case 'b': // Bishop
            return <g transform="translate(2.5, 2.5)"><path d="M12 2C7.58 2 4 5.58 4 10c0 2.21.89 4.21 2.34 5.66L4 23h16l-2.34-7.34C19.11 14.21 20 12.21 20 10c0-4.42-3.58-8-8-8zm0 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z" stroke={pieceStroke} strokeWidth="1.5" fill={pieceFill}/></g>
        case 'q': // Queen
            return <g transform="translate(2.5, 2.5)"><path d="M3 5l2 12h14l2-12-3 4-4-4-3 4-3-4-4 4zM18 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM4 19v2h16v-2H4z" stroke={pieceStroke} strokeWidth="1.5" fill={pieceFill}/></g>
        case 'k': // King
             return <g transform="translate(2.5, 2.5)"><path d="M12 6l-2 4h4l-2-4zM8 12v10h8V12H8zM6 10h12v2H6v-2z" stroke={pieceStroke} strokeWidth="1.5" fill={pieceFill}/></g>
        default: return null;
    }
}
