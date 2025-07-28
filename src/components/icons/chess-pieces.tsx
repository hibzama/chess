import { SVGProps } from "react";

const pieceStyles = {
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
};

type PieceProps = SVGProps<SVGSVGElement> & { color: string, strokeColor: string };

export const Pawn = ({ color, strokeColor, ...props }: PieceProps) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g fill={color} stroke={strokeColor} strokeWidth={1.5} {...pieceStyles}>
            <path d="M22.5 11.63c-1.99 0-3.6 1.61-3.6 3.6s1.61 3.6 3.6 3.6 3.6-1.61 3.6-3.6-1.61-3.6-3.6-3.6zm0-3.13c3.71 0 6.73 3.01 6.73 6.73s-3.01 6.73-6.73 6.73-6.73-3.01-6.73-6.73 3.01-6.73 6.73-6.73z"/>
            <path d="M22.5 18.23c-1.99 0-3.6 1.61-3.6 3.6v4.5h7.2v-4.5c0-1.99-1.61-3.6-3.6-3.6z" strokeLinecap="butt"/>
            <path d="M22.5,26.33 C22.5,26.33 22.5,26.33 22.5,26.33 C19.26,26.33 16.5,29.1 16.5,32.33 L16.5,33.83 L28.5,33.83 L28.5,32.33 C28.5,29.1 25.74,26.33 22.5,26.33 Z"/>
            <path d="M15,35.33 L30,35.33 L30,38.33 L15,38.33 Z" strokeLinecap="butt"/>
        </g>
    </svg>
);

export const Rook = ({ color, strokeColor, ...props }: PieceProps) => (
     <svg viewBox="0 0 45 45" {...props}>
        <g fill={color} stroke={strokeColor} strokeWidth={1.5} {...pieceStyles}>
            <path d="M13.5,12.5 h5 v-3 h7.5 v3 h5 v3 h-22.5 z"/>
            <path d="M16.5,15.5 h12.5 v12.5 h-12.5 z"/>
            <path d="M15,30 h15 v3 h-15 z"/>
            <path d="M13.5,33 h18 v3 h-18 z"/>
        </g>
    </svg>
);

export const Knight = ({ color, strokeColor, ...props }: PieceProps) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g fill={color} stroke={strokeColor} strokeWidth={1.5} {...pieceStyles}>
            <path d="M22,10C32.02,10,32.02,24.33,32.02,24.33C32.02,24.33,26.01,27.33,26.01,27.33L25.01,29.33L32.02,31.33L32.02,36.33L12,36.33L12,32.33L18,29.33L18,10L22,10z"/>
            <path d="M24.5,24.5C24.5,24.5,22.5,22.5,22.5,22.5C22.5,22.5,20.5,24.5,20.5,24.5C20.5,24.5,22.5,26.5,22.5,26.5C22.5,26.5,24.5,24.5,24.5,24.5z" fill={strokeColor} stroke="none"/>
        </g>
    </svg>
);

export const Bishop = ({ color, strokeColor, ...props }: PieceProps) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g fill={color} stroke={strokeColor} strokeWidth={1.5} {...pieceStyles}>
            <path d="m22.5,8c-1.66,0-3,1.34-3,3s1.34,3,3,3,3-1.34,3-3-1.34-3-3-3Zm0,1.5c.83,0,1.5.67,1.5,1.5s-.67,1.5-1.5,1.5-1.5-.67-1.5-1.5.67-1.5,1.5-1.5Z"/>
            <path d="M18.5,14c-1.66,0-3,1.34-3,3,0,1.48,1.08,2.72,2.5,2.95v-1.95c-.28-.23-.5-.58-.5-.95,0-.83.67-1.5,1.5-1.5s1.5.67,1.5,1.5c0,.37-.22,.72-.5,.95v1.95c1.42-.23,2.5-1.47,2.5-2.95,0-1.66-1.34-3-3-3Z"/>
            <path d="M22.5,17l-6,10.5h12l-6-10.5Z"/>
            <path d="M16.5,29h12v2h-12Z"/>
            <path d="M15,32h15v3h-15Z"/>
            <path d="m22.5 20 l0 4" strokeWidth={1} />
            <path d="m21 22.5 l3 0" strokeWidth={1} />
        </g>
    </svg>
);

export const Queen = ({ color, strokeColor, ...props }: PieceProps) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g fill={color} stroke={strokeColor} strokeWidth={1.5} {...pieceStyles}>
            <path d="M 12.5,13.5 L 14.5,29.5 L 30.5,29.5 L 32.5,13.5 L 12.5,13.5 z" />
            <path d="M 11.5,30.5 L 33.5,30.5 L 33.5,33.5 L 11.5,33.5 z" />
            <path d="M 10.5,34.5 L 34.5,34.5 L 34.5,37.5 L 10.5,37.5 z" />
            <circle cx="12.5" cy="11.5" r="2.5" />
            <circle cx="22.5" cy="11.5" r="2.5" />
            <circle cx="32.5" cy="11.5" r="2.5" />
        </g>
    </svg>
);

export const King = ({ color, strokeColor, ...props }: PieceProps) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g fill={color} stroke={strokeColor} strokeWidth={1.5} {...pieceStyles}>
            <path d="M 22.5,13.5 L 22.5,8.5 M 20,11 L 25,11" />
            <path d="M 14.5,29.5 L 14.5,13.5 L 30.5,13.5 L 30.5,29.5 L 14.5,29.5 z" />
            <path d="M 12.5,30.5 L 32.5,30.5 L 32.5,33.5 L 12.5,33.5 z" />
            <path d="M 11.5,34.5 L 33.5,34.5 L 33.5,37.5 L 11.5,37.5 z" />
            <circle cx="14.5" cy="13.5" r="2" />
            <circle cx="30.5" cy="13.5" r="2" />
            <circle cx="22.5" cy="13.5" r="2" />
        </g>
    </svg>
);