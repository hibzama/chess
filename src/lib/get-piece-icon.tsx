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
            return <g style={style}><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38-1.95 1.12-3.28 3.2-3.28 5.62v1h13v-1c0-2.42-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4zM12 31h21v-3H12v3z" /></g>;
        case 'r': // Rook
            return <g style={style}><path d="M9 39h27v-3H9v3zM12.5 32l1.5-3h17l1.5 3h-20zM12 36h21v-4H12v4zM14 29h17v-8H14v8zM14 9v5h3v-2h5v2h3V9h-11z" /></g>;
        case 'n': // Knight
            return <g style={style}><path d="M22 10c10.5 1 11.5 8 11.5 8-3 4-6.5 4-6.5 4-1 0-2-1-2-1-.5-.5-1.5-1-1.5-1-1 0-2 1-2 1H10c-1.5 0-3-1-3-3 0-2 1-3 1-3 1 0 1 .5 1 .5s1-1.5 2-1.5c1 0 1 1 1 1s2.5-2 3.5-2.5c1.5-1 2-2 2-2zM9.5 25.5A2.5 2.5 0 1 1 7 23a2.5 2.5 0 0 1 2.5 2.5zM15 32v3h15v-3H15zM9 39h27v-3H9v3z" /></g>;
        case 'b': // Bishop
            return <g style={style}><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2-2.43 1.57-10.11.97-13.5 3-3.39-2.03-11.07-1.43-13.5-3zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-5-2.5-5-1.5-1.5-3-2.5-3-2.5-3 0-6 3-6 3s-3-3-6-3c0 0-1.5 1-3 2.5-2.5 2.5-2.5 5-2.5 5 0 0-.5 1.5 0 2zM25 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" /></g>;
        case 'q': // Queen
            return <g style={style}><path d="M8 12a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM22.5 12a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM37 12a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM15 12a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM29.5 12a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM9 26c8.5-1.5 20-1.5 27 0l2-12-7-2-5 5-5-5-7 2-2 12zM9 39h27v-3H9v3zM12 36v-4h21v4H12z" /></g>;
        case 'k': // King
            return <g style={style}><path d="M22.5 6l-3 3h6l-3-3zM18 6h9M16 32h13v4H16v-4zM9 39h27v-3H9v3zM12 36l3-16h15l3 16H12z" /></g>;
        default: return null;
    }
}
