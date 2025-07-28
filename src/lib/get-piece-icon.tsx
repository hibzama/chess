import { Pawn, Rook, Knight, Bishop, Queen, King } from "@/components/icons/chess-pieces";
import React from 'react';

export const getPieceIcon = (type: string, color: string) => {
    
    const props = {
        color: color,
        strokeColor: (color === '#0f172a' || color === '#18181b') ? '#f8fafc' : '#0f172a',
    };

    switch (type.toLowerCase()) {
        case 'p': return <Pawn {...props} />;
        case 'r': return <Rook {...props} />;
        case 'n': return <Knight {...props} />;
        case 'b': return <Bishop {...props} />;
        case 'q': return <Queen {...props} />;
        case 'k': return <King {...props} />;
        default: return null;
    }
}