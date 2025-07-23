
'use client'
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Check, Crown, Sword } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Chess, Square } from 'chess.js';

type GameType = 'chess' | 'checkers';

type PieceStyle = { id: string; name: string; colors: string[] };
type BoardTheme = { id: string; name: string; colors: string[] };

const chessPieceStyles: PieceStyle[] = [
    { id: 'red_black', name: 'Red & Black', colors: ['#dc2626', '#18181b'] },
    { id: 'orange_gold', name: 'Orange & Gold', colors: ['#f97316', '#ca8a04'] },
    { id: 'pink_royal_blue', name: 'Pink & Royal Blue', colors: ['#ec4899', '#3b82f6'] },
    { id: 'natural_purple', name: 'Natural & Purple', colors: ['#e2e8f0', '#8b5cf6'] },
    { id: 'black_white', name: 'Black & White', colors: ['#0f172a', '#f8fafc'] },
];

const boardThemes: BoardTheme[] = [
    { id: 'classic', name: 'Classic', colors: ['#f0d9b5', '#b58863'] },
    { id: 'forest', name: 'Forest', colors: ['#ebecd0', '#779556'] },
    { id: 'ocean', name: 'Ocean', colors: ['#c7d2fe', '#60a5fa'] },
];


const CheckersPieceComponent = ({ color, isKing }: { color: string, isKing?: boolean }) => (
    <div className="w-5/6 h-5/6 relative flex items-center justify-center">
        <div 
            className="w-full h-full rounded-full shadow-lg border-2 border-black/50"
            style={{ backgroundColor: color }}
        />
        {isKing && (
          <Crown className="w-1/2 h-1/2 absolute text-yellow-400" />
        )}
    </div>
);


const getPieceIcon = (type: string, color: string) => {
    const style = { fill: color, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }  as React.CSSProperties;
    switch (type.toLowerCase()) {
        case 'p': return <g transform="translate(8.5, 9.5)"><path d="M11.5,2.5 A1.5,1.5 0 1 1 8.5,2.5 A1.5,1.5 0 1 1 11.5,2.5 Z M12,12 L8,12 L8,10 C8,8 9.5,6 10,6 C10.5,6 12,8 12,10 L12,12 Z M5,14 L15,14 L15,16 L5,16 L5,14 Z" {...style} /></g>;
        case 'r': return <g transform="translate(9.5, 9.5)"><path d="M2,16 L2,12 L5,12 L5,2 L15,2 L15,12 L18,12 L18,16 L2,16 Z M3,2 L5,2 M15,2 L17,2 M3,18 L17,18" {...style} /></g>;
        case 'n': return <g transform="translate(8.5, 9.5)"><path d="M6,16 A2,2 0 1 1 2,16 L2,10 C2,10 6,8 8,8 C10,8 14,10 14,10 L14,16 A2,2 0 1 1 10,16" {...style} /></g>;
        case 'b': return <g transform="translate(8.5, 9.5)"><path d="M10,2 L6,6 L14,6 L10,2 Z M6,8 L14,8 L14,14 L6,14 L6,8 Z M4,16 L16,16" {...style} /></g>;
        case 'q': return <g transform="translate(8.5, 9.5)"><path d="M4,16 L16,16 L16,10 L12,12 L8,12 L4,10 L4,16 Z M4,8 L16,8 L15,6 L11,8 L9,8 L5,6 L4,8 Z" {...style} /></g>;
        case 'k': return <g transform="translate(8.5, 9.5)"><path d="M8,16 L12,16 L12,12 L14,14 L14,8 L10,8 L6,8 L6,14 L8,12 L8,16 Z M10,6 L10,4 M8,4 L12,4" {...style} /></g>;
        default: return null;
    }
}

const ChessPiecePreview = () => {
    const game = new Chess();
    const board = game.board();
    return (
        <div className="grid grid-cols-8 aspect-square w-full shadow-lg border rounded-md overflow-hidden bg-card">
            {board.map((row, rowIndex) => (
                row.map((piece, colIndex) => {
                    const isLight = (rowIndex + colIndex) % 2 !== 0;
                    return (
                        <div key={`${rowIndex}-${colIndex}`} className={cn('w-full h-full flex items-center justify-center', isLight ? 'bg-[--board-light]' : 'bg-[--board-dark]')}>
                           {piece && (
                                <svg viewBox="0 0 28 28" className="w-full h-full p-1">
                                    {getPieceIcon(piece.type, piece.color === 'w' ? 'var(--piece-p1)' : 'var(--piece-p2)')}
                                </svg>
                           )}
                        </div>
                    )
                })
            ))}
        </div>
    );
};


export default function EquipmentPage() {
    const { user, userData, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<GameType>('chess');

    // Chess state
    const [chessPieceStyle, setChessPieceStyle] = useState('black_white');
    const [chessBoardTheme, setChessBoardTheme] = useState('ocean');

    // Checkers state
    const [checkersPieceStyle, setCheckersPieceStyle] = useState('red_black');
    const [checkersBoardTheme, setCheckersBoardTheme] = useState('classic');

    const [saving, setSaving] = useState(false);
    
    useEffect(() => {
        if(userData?.equipment) {
            setChessPieceStyle(userData.equipment.chess.pieceStyle || 'black_white');
            setChessBoardTheme(userData.equipment.chess.boardTheme || 'ocean');
            setCheckersPieceStyle(userData.equipment.checkers.pieceStyle || 'red_black');
            setCheckersBoardTheme(userData.equipment.checkers.boardTheme || 'classic');
        }
    }, [userData]);

    const handleSave = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to save.' });
            return;
        }
        setSaving(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, {
                equipment: {
                    chess: {
                        pieceStyle: chessPieceStyle,
                        boardTheme: chessBoardTheme
                    },
                    checkers: {
                        pieceStyle: checkersPieceStyle,
                        boardTheme: checkersBoardTheme
                    }
                }
            }, { merge: true });

            toast({ title: 'Success!', description: 'Your equipment has been saved.' });
        } catch (error) {
            console.error('Failed to save equipment:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save your preferences.' });
        } finally {
            setSaving(false);
        }
    }

    const currentPieceColors = (activeTab === 'chess' ? chessPieceStyles.find(p => p.id === chessPieceStyle)?.colors : chessPieceStyles.find(p => p.id === checkersPieceStyle)?.colors) || ['#000', '#fff'];
    const currentBoardColors = (activeTab === 'chess' ? boardThemes.find(b => b.id === chessBoardTheme)?.colors : boardThemes.find(b => b.id === checkersBoardTheme)?.colors) || ['#fff', '#000'];

    return (
        <div className="space-y-8">
             <div>
                <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3"><Sword/> Equipment</h1>
                <p className="text-muted-foreground">Customize your in-game look for both Chess and Checkers.</p>
            </div>
            
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as GameType)} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="chess">Chess</TabsTrigger>
                    <TabsTrigger value="checkers">Checkers</TabsTrigger>
                </TabsList>
                
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Piece Styles */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Piece Styles</CardTitle>
                                <CardDescription>Select your preferred color set for chess pieces.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {chessPieceStyles.map(style => (
                                    <button key={style.id} onClick={() => activeTab === 'chess' ? setChessPieceStyle(style.id) : setCheckersPieceStyle(style.id)} className={cn("p-4 rounded-lg border-2 text-left relative", (activeTab === 'chess' ? chessPieceStyle : checkersPieceStyle) === style.id ? 'border-primary' : 'border-border hover:border-primary/50')}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full" style={{backgroundColor: style.colors[0]}}></div>
                                            <div className="w-8 h-8 rounded-full" style={{backgroundColor: style.colors[1]}}></div>
                                            <span className="font-semibold">{style.name}</span>
                                        </div>
                                         {(activeTab === 'chess' ? chessPieceStyle : checkersPieceStyle) === style.id && <div className="absolute top-2 right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center"><Check className="w-4 h-4" /></div>}
                                    </button>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Board Themes */}
                        <Card>
                             <CardHeader>
                                <CardTitle>Board Themes</CardTitle>
                                <CardDescription>Select your preferred style for the chessboard.</CardDescription>
                            </CardHeader>
                             <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                 {boardThemes.map(theme => (
                                    <button key={theme.id} onClick={() => activeTab === 'chess' ? setChessBoardTheme(theme.id) : setCheckersBoardTheme(theme.id)} className={cn("p-2 rounded-lg border-2 relative", (activeTab === 'chess' ? chessBoardTheme : checkersBoardTheme) === theme.id ? 'border-primary' : 'border-border hover:border-primary/50')}>
                                         <div className="aspect-square rounded-md overflow-hidden">
                                             <div className="grid grid-cols-4 h-full">
                                                {[...Array(16)].map((_, i) => <div key={i} style={{backgroundColor: (Math.floor(i/4) + i) % 2 === 0 ? theme.colors[0] : theme.colors[1]}}></div>)}
                                             </div>
                                         </div>
                                         <p className="font-semibold text-center mt-2">{theme.name}</p>
                                         {(activeTab === 'chess' ? chessBoardTheme : checkersBoardTheme) === theme.id && <div className="absolute top-2 right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center"><Check className="w-4 h-4" /></div>}
                                     </button>
                                 ))}
                             </CardContent>
                        </Card>
                    </div>

                    {/* Live Preview */}
                     <div className="lg:col-span-1">
                         <Card className="sticky top-20">
                             <CardHeader>
                                <CardTitle>Live Preview</CardTitle>
                                <CardDescription>This is how your selections will look in-game.</CardDescription>
                            </CardHeader>
                             <CardContent
                                style={{
                                    '--piece-p1': currentPieceColors[1],
                                    '--piece-p2': currentPieceColors[0],
                                    '--board-light': currentBoardColors[0],
                                    '--board-dark': currentBoardColors[1],
                                } as React.CSSProperties}
                             >
                                 {activeTab === 'chess' ? <ChessPiecePreview /> : (
                                      <div className="grid grid-cols-8 aspect-square w-full shadow-lg border rounded-md overflow-hidden bg-card">
                                        {Array(8).fill(null).map((_, r) => Array(8).fill(null).map((_, c) => {
                                            const isDark = (r + c) % 2 !== 0;
                                            let piece = null;
                                            if (isDark) {
                                                if (r < 3) piece = <CheckersPieceComponent color={currentPieceColors[0]} isKing={r===0} />
                                                if (r > 4) piece = <CheckersPieceComponent color={currentPieceColors[1]} isKing={r===7} />
                                            }
                                            return <div key={`${r}-${c}`} className="flex items-center justify-center" style={{backgroundColor: isDark ? currentBoardColors[1] : currentBoardColors[0]}}>{piece}</div>
                                        }))}
                                    </div>
                                 )}
                             </CardContent>
                         </Card>
                     </div>
                </div>
            </Tabs>
            
            <Button size="lg" className="w-full mt-8" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save All Equipment"}</Button>
        </div>
    )
}
