import React from 'react';

export const getPieceIcon = (type: string, color: string) => {
    // The explicit fill and stroke on the path elements will override this, but it's good for fallback.
    const style = { fill: color, stroke: 'none', strokeWidth: 1.5, strokeLinejoin: 'round' } as React.CSSProperties;
    const pieceFill = color;
    const pieceStroke = color === '#f8fafc' ? '#0f172a' : '#f8fafc'; // White or near-white pieces get black stroke, others get white stroke

    switch (type.toLowerCase()) {
        case 'p': // Pawn
            return <g transform="translate(2.5, 2.5)"><path d="M22 9h-2.29C19.11 6.89 16.63 5.23 13.5 5.02V3h3V1h-8v2h3v2.02C8.37 5.23 5.89 6.89 5.29 9H3v2h1.22c.28 1.15.89 2.19 1.73 3.03C3.96 15.3 2 17.91 2 21v1h20v-1c0-3.09-1.96-5.7-4.95-6.97 1.25-1.12 1.95-2.69 1.95-4.34V9z" stroke={pieceStroke} strokeWidth="1.5" fill={pieceFill} /></g>
        case 'r': // Rook
            return <g transform="translate(2.5, 2.5)"><path d="M19 2h-2v3h- hükümdar3v2h3v3h2v-3h3V5h-3V2zM5 24v-2h14v2H5zM4 8h2v11H4V8zm16 0h-2v11h2V8zM1 22h22v2H1v-2z" stroke={pieceStroke} strokeWidth="1.5" fill={pieceFill}/></g>
        case 'n': // Knight
            return <g transform="translate(2.5, 2.5)"><path d="M15 2l-3 3-3-3s-2 2-2 4c0 2 2 4 2 4l-2 2v2h12v-2l-2-2s2-2 2-4c0-2-2-4-2-4zM6 16v6h12v-6H6z" stroke={pieceStroke} strokeWidth="1.5" fill={pieceFill}/></g>
        case 'b': // Bishop
            return <g transform="translate(2.5, 2.5)"><path d="M12 2C7.58 2 4 5.58 4 10c0 2.21.89 4.21 2.34 5.66L4 23h16l-2.34-7.34C19.11 14.21 20 12.21 20 10c0-4.42-3.58-8-8-8zm0 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z" stroke={pieceStroke} strokeWidth="1.5" fill={pieceFill}/></g>
        case 'q': // Queen
            return <g transform="translate(2.5, 2.5)"><path d="M3 5l2 12h14l2-12-3 4-4-4-3 4-3-4-4 4zM18 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM4 19v2h16v-2H4z" stroke={pieceStroke} strokeWidth="1.5" fill={pieceFill}/></g>
        case 'k': // King
             return <g transform="translate(2.5, 2.5)"><path d="M12 2l-2 4h4l-2-4zM6 7v2h12V7H6zm-2 4v2h2v2h-2v2h2v3h12v-3h2v-2h-2v-2h2V11H4z" stroke={pieceStroke} strokeWidth="1.5" fill={pieceFill}/></g>
        default: return null;
    }
}
