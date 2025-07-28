import { SVGProps } from "react";

const pieceStyles = {
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.5,
};

type PieceProps = SVGProps<SVGSVGElement> & { color: string, strokeColor: string };

export const Pawn = ({ color, strokeColor, ...props }: PieceProps) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g fill="none" stroke={strokeColor} {...pieceStyles}>
            <path d="M22.5 22a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM17.5 28h10" />
        </g>
    </svg>
);

export const Rook = ({ color, strokeColor, ...props }: PieceProps) => (
     <svg viewBox="0 0 45 45" {...props}>
        <g fill="none" stroke={strokeColor} {...pieceStyles}>
           <path d="M17.5 15h10v-5h-10v5zm-2 13h14v-13h-14v13z" />
        </g>
    </svg>
);

export const Knight = ({ color, strokeColor, ...props }: PieceProps) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g fill="none" stroke={strokeColor} {...pieceStyles}>
            <path d="M20,28a10,10 0 0,0 10-10A10,10 0 0,0 20,8" />
            <path d="M20,18a4,4 0 1,0 0-8 4,4 0 0,0 0,8z" />
        </g>
    </svg>
);

export const Bishop = ({ color, strokeColor, ...props }: PieceProps) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g fill="none" stroke={strokeColor} {...pieceStyles}>
           <path d="M22.5 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
           <path d="M17.5 28h10L22.5 15z" />
        </g>
    </svg>
);

export const Queen = ({ color, strokeColor, ...props }: PieceProps) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g fill="none" stroke={strokeColor} {...pieceStyles}>
            <path d="M15 15l7.5 8 7.5-8" />
            <path d="M17.5,28h10" />
            <path d="M12.5 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            <path d="M22.5 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            <path d="M32.5 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        </g>
    </svg>
);

export const King = ({ color, strokeColor, ...props }: PieceProps) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g fill="none" stroke={strokeColor} {...pieceStyles}>
            <path d="M22.5,28a5,5 0 0,0-10,0h20a5,5 0 0,0-10,0" />
            <path d="M22.5 10v10" />
            <path d="M17.5 15h10" />
        </g>
    </svg>
);
