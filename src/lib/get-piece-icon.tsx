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
            return <g style={style}><path d="M22.5,9.5c-1.8,0-3.25,1.45-3.25,3.25c0,0.9,0.35,1.75,1,2.4c-1.9,1.1-3,2.9-3,5.1v0.75h10.5V20.25c0-2.2-1.1-4-3-5.1c0.65-0.65,1-1.5,1-2.4C25.75,10.95,24.3,9.5,22.5,9.5z M15,22.5h15v3H15V22.5z" /></g>;
        case 'r': // Rook
            return <g style={style}><path d="M14,10h17v4h-17z M12,14h21v4h-21z M12,18h21v13h-21z M9,31h27v4h-27z M15,10v-4h-2v4h-3v-4h-2v4h-2v4h2v-4h2v4h3v-4h2v4h3v-4h2v4h3v-4h2v4h2v-4h-3v-4h-2v4h-3z" /></g>;
        case 'n': // Knight
            return <g style={style}><path d="M24,10c-3.5,0-5.5,2-5.5,4.5c0,2.5,1.5,4,1.5,4l-2,2.5c-0.5,0.5-1,1-1,2c0,1,0.5,1.5,0.5,1.5l-1.5,1.5 c-1,1-1.5,2.5-1.5,4v1h19v-1c0-1.5-0.5-3-1.5-4l-1.5-1.5c0,0,0.5-0.5,0.5-1.5c0-1-0.5-1.5-1-2l-2-2.5c0,0,1.5-1.5,1.5-4 C30.5,12,27.5,10,24,10z M24,28.5c-1.5,0-3,1-3.5,2.5h7C27,29.5,25.5,28.5,24,28.5z" /></g>;
        case 'b': // Bishop
            return <g style={style}><path d="M18.5,31h8v-1.5h-8V31zM15,28.5a4.5,4.5,0,1,1,9,0,4.5,4.5,0,0,1-9,0zM12,28.5c0-4.67,3.33-8,8-8s8,3.33,8,8c0,1.15-.22,2.25-.62,3.25H12.62c-.4-1-.62-2.1-.62-3.25zM19.5,9a3,3,0,1,1,6,0,3,3,0,0,1-6,0z" /></g>;
        case 'q': // Queen
            return <g style={style}><path d="M11.5,13.5a2.5,2.5 0 1 1-5,0a2.5,2.5 0 1 1 5,0z M22.5,13.5a2.5,2.5 0 1 1-5,0a2.5,2.5 0 1 1 5,0z M33.5,13.5a2.5,2.5 0 1 1-5,0a2.5,2.5 0 1 1 5,0z M17,16.5a2.5,2.5 0 1 1-5,0a2.5,2.5 0 1 1 5,0z M28,16.5a2.5,2.5 0 1 1-5,0a2.5,2.5 0 1 1 5,0z M12,35.5h21v-3H12v3z M15,32.5h15v-3H15v3z M11,29.5l4-3h11l4,3H11z M12,23.5l-3,3l-0.5-3l-3-3l3-3l0.5,3l3,3zm21,0l3,3l0.5-3l3-3l-3-3l-0.5,3l-3,3z" /></g>;
        case 'k': // King
            return <g style={style}><path d="M22.5,6h-3v3h-3v3h3v-3h3V6z M22.5,28.5c2.5,0,4.5-2,4.5-4.5s-2-4.5-4.5-4.5s-4.5,2-4.5,4.5S20,28.5,22.5,28.5z M22.5,31.5c-4.5,0-8,3.5-8,8h16C30.5,35,27,31.5,22.5,31.5z M12.5,41.5h20v-2h-20V41.5z" /></g>;
        default: return null;
    }
}
