import { SVGProps } from "react";

const pieceStyles = {
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.5,
};

const whitePieceStyles = { ...pieceStyles, stroke: "#000" };
const blackPieceStyles = { ...pieceStyles, stroke: "#fff" };

export const WhitePawn = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...whitePieceStyles} style={{ opacity: 1, fill: "#fff", fillOpacity: 1, fillRule: "evenodd", stroke: "#000", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
           <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.58 16 21v-1h13v1c0-2.42-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4zM12 31h21v-3H12v3z" />
        </g>
    </svg>
);
export const BlackPawn = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...blackPieceStyles} style={{ opacity: 1, fill: "#000", fillOpacity: 1, fillRule: "evenodd", stroke: "#fff", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
             <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.58 16 21v-1h13v1c0-2.42-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4zM12 31h21v-3H12v3z" />
        </g>
    </svg>
);
export const WhiteRook = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...whitePieceStyles} style={{ opacity: 1, fill: "#fff", fillOpacity: 1, fillRule: "evenodd", stroke: "#000", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
           <path d="M13 31h19v-3H13v3zm1-4h17v-8H14v8zM11 9h23v5h-3v2h-3v-2h-5v2h-3v-2h-3V9z" />
        </g>
    </svg>
);
export const BlackRook = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...blackPieceStyles} style={{ opacity: 1, fill: "#000", fillOpacity: 1, fillRule: "evenodd", stroke: "#fff", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
            <path d="M13 31h19v-3H13v3zm1-4h17v-8H14v8zM11 9h23v5h-3v2h-3v-2h-5v2h-3v-2h-3V9z" />
        </g>
    </svg>
);
export const WhiteKnight = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...whitePieceStyles} style={{ opacity: 1, fill: "#fff", fillOpacity: 1, fillRule: "evenodd", stroke: "#000", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
            <path d="M22.5 31h-9V29.5h9V31zm-3-1.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0zm-1.5-12c-3.44.64-6.44 3.69-7.5 7.5-1.5 5.5 2 9.5 7.5 9.5h3V15.5H18c-2.5 0-2.5-2.5-2.5-2.5s3-1.5 6-1.5c3.5 0 5.5 2.5 5.5 2.5v14h1.5v-13c0-4.67-3.33-8-8-8z" />
        </g>
    </svg>
);
export const BlackKnight = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...blackPieceStyles} style={{ opacity: 1, fill: "#000", fillOpacity: 1, fillRule: "evenodd", stroke: "#fff", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
           <path d="M22.5 31h-9V29.5h9V31zm-3-1.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0zm-1.5-12c-3.44.64-6.44 3.69-7.5 7.5-1.5 5.5 2 9.5 7.5 9.5h3V15.5H18c-2.5 0-2.5-2.5-2.5-2.5s3-1.5 6-1.5c3.5 0 5.5 2.5 5.5 2.5v14h1.5v-13c0-4.67-3.33-8-8-8z" />
        </g>
    </svg>
);
export const WhiteBishop = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...whitePieceStyles} style={{ opacity: 1, fill: "#fff", fillOpacity: 1, fillRule: "evenodd", stroke: "#000", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
           <path d="M18.5 31h8v-1.5h-8V31zM15 28.5a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0zM12 28.5c0-4.67 3.33-8 8-8s8 3.33 8 8c0 1.15-.22 2.25-.62 3.25H12.62c-.4-1-.62-2.1-.62-3.25zM19.5 9a3 3 0 1 1 6 0 3 3 0 0 1-6 0z" />
        </g>
    </svg>
);
export const BlackBishop = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...blackPieceStyles} style={{ opacity: 1, fill: "#000", fillOpacity: 1, fillRule: "evenodd", stroke: "#fff", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
            <path d="M18.5 31h8v-1.5h-8V31zM15 28.5a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0zM12 28.5c0-4.67 3.33-8 8-8s8 3.33 8 8c0 1.15-.22 2.25-.62 3.25H12.62c-.4-1-.62-2.1-.62-3.25zM19.5 9a3 3 0 1 1 6 0 3 3 0 0 1-6 0z" />
        </g>
    </svg>
);
export const WhiteQueen = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...whitePieceStyles} style={{ opacity: 1, fill: "#fff", fillOpacity: 1, fillRule: "evenodd", stroke: "#000", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
            <path d="M12.5 31h20v-3h-20v3zM10.5 12c0-3.31 2.69-6 6-6s6 2.69 6 6c0 1.54-.58 2.94-1.5 4h-9c-.92-1.06-1.5-2.46-1.5-4zM10 28h25v-3H10v3z" />
        </g>
    </svg>
);
export const BlackQueen = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...blackPieceStyles} style={{ opacity: 1, fill: "#000", fillOpacity: 1, fillRule: "evenodd", stroke: "#fff", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
            <path d="M12.5 31h20v-3h-20v3zM10.5 12c0-3.31 2.69-6 6-6s6 2.69 6 6c0 1.54-.58 2.94-1.5 4h-9c-.92-1.06-1.5-2.46-1.5-4zM10 28h25v-3H10v3z" />
        </g>
    </svg>
);
export const WhiteKing = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...whitePieceStyles} style={{ opacity: 1, fill: "#fff", fillOpacity: 1, fillRule: "evenodd", stroke: "#000", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
            <path d="M22.5 31h-9V29.5h9V31zm-4.5-1.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0zM12 28.5c0-4.67 3.33-8 8-8s8 3.33 8 8v3h-16v-3zM22.5 6h-3v3h-3v3h3v-3h3V6z" />
        </g>
    </svg>
);
export const BlackKing = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...blackPieceStyles} style={{ opacity: 1, fill: "#000", fillOpacity: 1, fillRule: "evenodd", stroke: "#fff", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
            <path d="M22.5 31h-9V29.5h9V31zm-4.5-1.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0zM12 28.5c0-4.67 3.33-8 8-8s8 3.33 8 8v3h-16v-3zM22.5 6h-3v3h-3v3h3v-3h3V6z" />
        </g>
    </svg>
);
