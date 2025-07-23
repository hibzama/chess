import { SVGProps } from "react";

const pieceStyles = {
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.5,
};

const whitePieceStyles = { ...pieceStyles, stroke: "#c7c7c7" };
const blackPieceStyles = { ...pieceStyles, stroke: "#1c1c1c" };

export const WhitePawn = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...whitePieceStyles} style={{ opacity: 1, fill: "#fff", fillOpacity: 1, fillRule: "evenodd", stroke: "#000", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
            <path d="M 22.5,11.63 C 22.5,11.63 22.5,11.63 22.5,11.63 C 22.5,11.63 22.5,11.63 22.5,11.63 C 20.12,11.63 18.25,13.5 18.25,15.88 C 18.25,18.25 20.12,20.13 22.5,20.13 C 24.88,20.13 26.75,18.25 26.75,15.88 C 26.75,13.5 24.88,11.63 22.5,11.63 Z M 22.5,22 C 19.5,22 19,23.5 19,23.5 L 19,26 C 19,26 20.5,26 22.5,26 C 24.5,26 26,26 26,26 L 26,23.5 C 26,23.5 25.5,22 22.5,22 Z M 20,28 L 20,31.5 C 20,31.5 20,31.5 20,31.5 C 20,31.5 20,31.5 20,31.5 C 20,32.33 20.67,33 21.5,33 L 23.5,33 C 24.33,33 25,32.33 25,31.5 L 25,28 Z M 17.5,34 L 17.5,35.5 L 27.5,35.5 L 27.5,34 L 17.5,34 Z" style={{ strokeLinecap: "butt" }} />
        </g>
    </svg>
);
export const BlackPawn = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...blackPieceStyles} style={{ opacity: 1, fill: "#000", fillOpacity: 1, fillRule: "evenodd", stroke: "#fff", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
            <path d="M 22.5,11.63 C 22.5,11.63 22.5,11.63 22.5,11.63 C 22.5,11.63 22.5,11.63 22.5,11.63 C 20.12,11.63 18.25,13.5 18.25,15.88 C 18.25,18.25 20.12,20.13 22.5,20.13 C 24.88,20.13 26.75,18.25 26.75,15.88 C 26.75,13.5 24.88,11.63 22.5,11.63 Z M 22.5,22 C 19.5,22 19,23.5 19,23.5 L 19,26 C 19,26 20.5,26 22.5,26 C 24.5,26 26,26 26,26 L 26,23.5 C 26,23.5 25.5,22 22.5,22 Z M 20,28 L 20,31.5 C 20,31.5 20,31.5 20,31.5 C 20,31.5 20,31.5 20,31.5 C 20,32.33 20.67,33 21.5,33 L 23.5,33 C 24.33,33 25,32.33 25,31.5 L 25,28 Z M 17.5,34 L 17.5,35.5 L 27.5,35.5 L 27.5,34 L 17.5,34 Z" style={{ strokeLinecap: "butt" }} />
        </g>
    </svg>
);
export const WhiteRook = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...whitePieceStyles} style={{ opacity: 1, fill: "#fff", fillOpacity: 1, fillRule: "evenodd", stroke: "#000", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
            <path d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 Z M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 Z M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14 L 11,14 Z" style={{ strokeLinecap: "butt" }} />
            <path d="M 34,14 L 31,17 L 14,17 L 11,14" />
            <path d="M 31,17 L 31,29.5 L 14,29.5 L 14,17" style={{ strokeLinecap: "butt", strokeLinejoin: "miter" }} />
            <path d="M 31,29.5 L 32.5,32 L 12.5,32 L 14,29.5" />
            <path d="M 11,14 L 34,14" style={{ fill: "none", stroke: "#000", strokeLinejoin: "miter" }} />
        </g>
    </svg>
);
export const BlackRook = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...blackPieceStyles} style={{ opacity: 1, fill: "#000", fillOpacity: 1, fillRule: "evenodd", stroke: "#fff", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
            <path d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 Z M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 Z M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14 L 11,14 Z" style={{ strokeLinecap: "butt" }} />
            <path d="M 34,14 L 31,17 L 14,17 L 11,14" />
            <path d="M 31,17 L 31,29.5 L 14,29.5 L 14,17" style={{ strokeLinecap: "butt", strokeLinejoin: "miter" }} />
            <path d="M 31,29.5 L 32.5,32 L 12.5,32 L 14,29.5" />
            <path d="M 11,14 L 34,14" style={{ fill: "none", stroke: "#fff", strokeLinejoin: "miter" }} />
        </g>
    </svg>
);
export const WhiteKnight = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...whitePieceStyles} style={{ opacity: 1, fill: "#fff", fillOpacity: 1, fillRule: "evenodd", stroke: "#000", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
            <path d="M 22,10 C 32.5,10 31.5,18 31.5,18 C 31.5,24 28,29 28,29 L 15.5,29 C 15.5,29 13.5,24.5 13.5,24.5 C 13.5,24.5 13.5,19.5 13.5,19.5 C 13.5,19.5 14,16.5 14,16.5 C 14,16.5 11.5,14.5 11.5,14.5 C 11.5,14.5 10.5,12 10.5,12 C 10.5,12 12.5,10 12.5,10 C 12.5,10 15,11.5 15,11.5 C 15,11.5 16,10 22,10 Z M 15.5,29 L 15.5,32 L 28,32 L 28,29 M 12.5,32 L 31.5,32 L 31.5,39 L 12.5,39 L 12.5,32 Z" style={{ strokeLinecap: "butt" }} />
        </g>
    </svg>
);
export const BlackKnight = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...blackPieceStyles} style={{ opacity: 1, fill: "#000", fillOpacity: 1, fillRule: "evenodd", stroke: "#fff", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
            <path d="M 22,10 C 32.5,10 31.5,18 31.5,18 C 31.5,24 28,29 28,29 L 15.5,29 C 15.5,29 13.5,24.5 13.5,24.5 C 13.5,24.5 13.5,19.5 13.5,19.5 C 13.5,19.5 14,16.5 14,16.5 C 14,16.5 11.5,14.5 11.5,14.5 C 11.5,14.5 10.5,12 10.5,12 C 10.5,12 12.5,10 12.5,10 C 12.5,10 15,11.5 15,11.5 C 15,11.5 16,10 22,10 Z M 15.5,29 L 15.5,32 L 28,32 L 28,29 M 12.5,32 L 31.5,32 L 31.5,39 L 12.5,39 L 12.5,32 Z" style={{ strokeLinecap: "butt" }} />
        </g>
    </svg>
);
export const WhiteBishop = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...whitePieceStyles} style={{ opacity: 1, fill: "#fff", fillOpacity: 1, fillRule: "evenodd", stroke: "#000", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
            <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 39,38 39,38 39,38 C 39,38 39,38 39,38 L 6,38 C 7.35,36.54 9,36 9,36 Z M 22.5,34 C 22.5,34 22.52,34.17 22.5,34.5 C 22.48,34.17 22.5,34 22.5,34 C 22.5,34 22.5,34 22.5,34 Z M 15,32 C 15,32 15,29.5 15,29.5 C 15,29.5 15,27 15,27 C 15,27 17.5,24.5 17.5,24.5 L 27.5,24.5 C 27.5,24.5 30,27 30,27 C 30,27 30,29.5 30,29.5 C 30,29.5 30,32 30,32 L 15,32 Z M 25,23 C 25,23 25.5,20 25.5,18.5 C 25.5,17 24.5,15.5 22.5,15.5 C 20.5,15.5 19.5,17 19.5,18.5 C 19.5,20 20,23 20,23 L 25,23 Z M 22.5,15.5 L 22.5,12.5 L 22.5,15.5 Z M 22.5,12.5 C 21.5,12.5 20.5,11.5 20.5,10.5 C 20.5,9.5 21.5,8.5 22.5,8.5 C 23.5,8.5 24.5,9.5 24.5,10.5 C 24.5,11.5 23.5,12.5 22.5,12.5 Z M 22.5,12.5 L 22.5,15.5" style={{ strokeLinecap: "butt" }} />
        </g>
    </svg>
);
export const BlackBishop = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...blackPieceStyles} style={{ opacity: 1, fill: "#000", fillOpacity: 1, fillRule: "evenodd", stroke: "#fff", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
            <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 39,38 39,38 39,38 C 39,38 39,38 39,38 L 6,38 C 7.35,36.54 9,36 9,36 Z M 22.5,34 C 22.5,34 22.52,34.17 22.5,34.5 C 22.48,34.17 22.5,34 22.5,34 C 22.5,34 22.5,34 22.5,34 Z M 15,32 C 15,32 15,29.5 15,29.5 C 15,29.5 15,27 15,27 C 15,27 17.5,24.5 17.5,24.5 L 27.5,24.5 C 27.5,24.5 30,27 30,27 C 30,27 30,29.5 30,29.5 C 30,29.5 30,32 30,32 L 15,32 Z M 25,23 C 25,23 25.5,20 25.5,18.5 C 25.5,17 24.5,15.5 22.5,15.5 C 20.5,15.5 19.5,17 19.5,18.5 C 19.5,20 20,23 20,23 L 25,23 Z M 22.5,15.5 L 22.5,12.5 L 22.5,15.5 Z M 22.5,12.5 C 21.5,12.5 20.5,11.5 20.5,10.5 C 20.5,9.5 21.5,8.5 22.5,8.5 C 23.5,8.5 24.5,9.5 24.5,10.5 C 24.5,11.5 23.5,12.5 22.5,12.5 Z M 22.5,12.5 L 22.5,15.5" style={{ strokeLinecap: "butt" }} />
        </g>
    </svg>
);
export const WhiteQueen = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...whitePieceStyles} style={{ opacity: 1, fill: "#fff", fillOpacity: 1, fillRule: "evenodd", stroke: "#000", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
            <path d="M 8,12 L 37,12 L 37,26 L 8,26 L 8,12 Z M 8,26 L 14,29.5 L 31,29.5 L 37,26 M 14,29.5 L 14,31.5 L 31,31.5 L 31,29.5 M 14,31.5 C 14,31.5 14,34 14,34 C 14,34 11,34 11,34 C 11,34 11,36 11,36 C 11,36 12.5,38 12.5,38 L 32.5,38 C 32.5,38 34,36 34,36 C 34,36 34,34 34,34 C 34,34 31,34 31,34 C 31,34 31,31.5 31,31.5 M 12.5,38 L 12.5,40 L 32.5,40 L 32.5,38" style={{ strokeLinecap: "butt" }} />
            <path d="M 8,12 C 8,12 8.5,4.5 14,4.5 C 19.5,4.5 22.5,7 22.5,7 C 22.5,7 25.5,4.5 31,4.5 C 36.5,4.5 37,12 37,12" style={{ strokeLinecap: "butt" }} />
        </g>
    </svg>
);
export const BlackQueen = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...blackPieceStyles} style={{ opacity: 1, fill: "#000", fillOpacity: 1, fillRule: "evenodd", stroke: "#fff", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
            <path d="M 8,12 L 37,12 L 37,26 L 8,26 L 8,12 Z M 8,26 L 14,29.5 L 31,29.5 L 37,26 M 14,29.5 L 14,31.5 L 31,31.5 L 31,29.5 M 14,31.5 C 14,31.5 14,34 14,34 C 14,34 11,34 11,34 C 11,34 11,36 11,36 C 11,36 12.5,38 12.5,38 L 32.5,38 C 32.5,38 34,36 34,36 C 34,36 34,34 34,34 C 34,34 31,34 31,34 C 31,34 31,31.5 31,31.5 M 12.5,38 L 12.5,40 L 32.5,40 L 32.5,38" style={{ strokeLinecap: "butt" }} />
            <path d="M 8,12 C 8,12 8.5,4.5 14,4.5 C 19.5,4.5 22.5,7 22.5,7 C 22.5,7 25.5,4.5 31,4.5 C 36.5,4.5 37,12 37,12" style={{ strokeLinecap: "butt" }} />
        </g>
    </svg>
);
export const WhiteKing = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...whitePieceStyles} style={{ opacity: 1, fill: "#fff", fillOpacity: 1, fillRule: "evenodd", stroke: "#000", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
            <path d="M 22.5,11.63 C 22.5,11.63 22.5,11.63 22.5,11.63 C 22.5,11.63 22.5,11.63 22.5,11.63 C 20.12,11.63 18.25,13.5 18.25,15.88 C 18.25,18.25 20.12,20.13 22.5,20.13 C 24.88,20.13 26.75,18.25 26.75,15.88 C 26.75,13.5 24.88,11.63 22.5,11.63 Z M 22.5,22 C 19.5,22 19,23.5 19,23.5 L 19,26 C 19,26 20.5,26 22.5,26 C 24.5,26 26,26 26,26 L 26,23.5 C 26,23.5 25.5,22 22.5,22 Z M 20,28 L 20,31.5 C 20,31.5 20,31.5 20,31.5 C 20,31.5 20,31.5 20,31.5 C 20,32.33 20.67,33 21.5,33 L 23.5,33 C 24.33,33 25,32.33 25,31.5 L 25,28 Z M 17.5,34 L 17.5,35.5 L 27.5,35.5 L 27.5,34 L 17.5,34 Z" style={{ strokeLinecap: "butt", strokeOpacity: 1 }} />
            <path d="M 22.5,26 C 22.5,26 22.5,28 22.5,28" style={{ fill: "none", stroke: "#000", strokeLinejoin: "miter" }} />
            <path d="M 22.5,11.625 C 22.5,11.625 22.5,6 22.5,6" style={{ fill: "none", stroke: "#000", strokeLinecap: "butt", strokeLinejoin: "miter" }} />
            <path d="M 20,8 L 25,8" style={{ fill: "none", stroke: "#000", strokeLinecap: "butt" }} />
        </g>
    </svg>
);
export const BlackKing = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 45 45" {...props}>
        <g {...blackPieceStyles} style={{ opacity: 1, fill: "#000", fillOpacity: 1, fillRule: "evenodd", stroke: "#fff", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 4, strokeDasharray: "none", strokeOpacity: 1, }}>
            <path d="M 22.5,11.63 C 22.5,11.63 22.5,11.63 22.5,11.63 C 22.5,11.63 22.5,11.63 22.5,11.63 C 20.12,11.63 18.25,13.5 18.25,15.88 C 18.25,18.25 20.12,20.13 22.5,20.13 C 24.88,20.13 26.75,18.25 26.75,15.88 C 26.75,13.5 24.88,11.63 22.5,11.63 Z M 22.5,22 C 19.5,22 19,23.5 19,23.5 L 19,26 C 19,26 20.5,26 22.5,26 C 24.5,26 26,26 26,26 L 26,23.5 C 26,23.5 25.5,22 22.5,22 Z M 20,28 L 20,31.5 C 20,31.5 20,31.5 20,31.5 C 20,31.5 20,31.5 20,31.5 C 20,32.33 20.67,33 21.5,33 L 23.5,33 C 24.33,33 25,32.33 25,31.5 L 25,28 Z M 17.5,34 L 17.5,35.5 L 27.5,35.5 L 27.5,34 L 17.5,34 Z" style={{ strokeLinecap: "butt", strokeOpacity: 1 }} />
            <path d="M 22.5,26 C 22.5,26 22.5,28 22.5,28" style={{ fill: "none", stroke: "#fff", strokeLinejoin: "miter" }} />
            <path d="M 22.5,11.625 C 22.5,11.625 22.5,6 22.5,6" style={{ fill: "none", stroke: "#fff", strokeLinecap: "butt", strokeLinejoin: "miter" }} />
            <path d="M 20,8 L 25,8" style={{ fill: "none", stroke: "#fff", strokeLinecap: "butt" }} />
        </g>
    </svg>
);
