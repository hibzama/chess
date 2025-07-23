
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


const CheckersPieceComponent = ({ color }: { color: string }) => (
    <div className="w-10/12 h-10/12 rounded-full flex items-center justify-center shadow-lg border-2" style={{ backgroundColor: color, borderColor: color === '#f8fafc' ? '#a1a1aa' : '#00000050' }}>
    </div>
);

const ChessPiecePreview = () => {
    const game = new Chess();
    const board = game.board();
    return (
        <div className="grid grid-cols-8 aspect-square w-full shadow-lg border rounded-md overflow-hidden bg-card">
            {board.map((row, rowIndex) => (
                row.map((piece, colIndex) => {
                    const isLight = (rowIndex + colIndex) % 2 !== 0;
                    return (
                        <div key={`${rowIndex}-${colIndex}`} className={cn('w-full h-full', isLight ? 'bg-[--board-light]' : 'bg-[--board-dark]')}>
                           {piece && (
                                <div className="w-full h-full" style={{ color: piece.color === 'w' ? 'var(--piece-p1)' : 'var(--piece-p2)' }}>
                                    {getPieceIcon(piece.type)}
                                </div>
                           )}
                        </div>
                    )
                })
            ))}
        </div>
    );
};

const getPieceIcon = (type: string) => {
    const style = { width: '100%', height: '100%', fill: 'currentColor' };
    switch(type) {
        case 'p': return <svg viewBox="0 0 45 45" style={style}><g transform="translate(0,2.5)"><path d="M22.5,9.5c3.31,0,6,2.69,6,6s-2.69,6-6,6s-6-2.69-6-6S19.19,9.5,22.5,9.5z M22.5,22.5c-2.76,0-5,2.24-5,5v2.5h10v-2.5 C27.5,24.74,25.26,22.5,22.5,22.5z M17.5,31.5h10V34h-10V31.5z"/></g></svg>
        case 'r': return <svg viewBox="0 0 45 45" style={style}><path d="m9,39h27v-3h-27v3zm3-3h21v-4h-21v4zm-1-22v-9h4v2h5v-2h5v2h5v-2h4v9h-27zm2,2h23v-5l-2,2-3-2-3,2-2.5-2-2.5,2-3-2-3,2-2-2v5zM14,19h17v12h-17v-12z" /></svg>
        case 'n': return <svg viewBox="0 0 45 45" style={style}><path d="m22,10c-2.32,0-4.32,0.77-6,2.29C14.33,13.4,14,14.89,14,17.5c0,3,1,6,3,8.5l1,1.5H12v4h11.5v-3.48l-0.52-0.52c-0.66-0.66-1.2-1.42-1.63-2.28C20.46,24.13,20,22.82,20,21.5c0-1.89,0.76-3.6,2-4.82V16c1-2,3-3,3-3s1,1,1,3v0.68c1.24,1.22,2,2.93,2,4.82c0,1.32-0.46,2.63-1.35,3.72c-0.43,0.86-0.97,1.62-1.63,2.28l-0.52,0.52V34H33v-4h-6.02l1-1.5c2-2.5,3-5.5,3-8.5c0-2.61-0.33-4.1-2-5.21C26.32,10.77,24.32,10,22,10z" /></svg>
        case 'b': return <svg viewBox="0 0 45 45" style={style}><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2H6c1.35-1.46 3-2 3-2zM15 32l7.5-12 7.5 12h-15z m-.5-1c-1-1-1.5-2.5-1.5-4 0-2.5 1.5-4.5 2.5-6 .5 1 .5 2.5 0 3.5-1.5 1.5-1.5 2.5-1 4.5zM30.5 31c1-1 1.5-2.5 1.5-4 0-2.5-1.5-4.5-2.5-6-.5 1-.5 2.5 0 3.5 1.5 1.5 1.5 2.5 1 4.5zM17.5 24.5l5-8.5 5 8.5h-10zM22.5 8.5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z" /></svg>
        case 'q': return <svg viewBox="0 0 45 45" style={style}><path d="M8 12l3.5-7 5.5 4 5.5-4L26 5l5.5 7L37 12v3H8v-3zM8 15h29v11H8V15z m2.5 13.5L8 39h29l-2.5-10.5h-24z m-1 2h25l2 8H7l1.5-8zM12 18v6h4v-6h-4zm17 0v6h4v-6h-4z" /></svg>
        case 'k': return <svg viewBox="0 0 45 45" style={style}><path d="M22.5 6l-2.5 5h5L22.5 6zM21 11.5v3h3v-3h-3zM12 14.5l3.5 3-3.5 4h23l-3.5-4 3.5-3H12zm2 1.5h19l-2 2 2 2H14l2-2-2-2zM12 23.5h21v2H12v-2zm2 3h17v9H14v-9zm2 2v5h13v-5H16z" /></svg>
        default: return null;
    }
}


export default function EquipmentPage() {
    const { user, userData, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<GameType>('chess');

    // Chess state
    const [chessPieceStyle, setChessPieceStyle] = useState('black_white');
    const [chessBoardTheme, setChessBoardTheme] = useState('ocean');

    // Checkers state
    const [checkersPieceStyle, setCheckersPieceStyle] = useState('black_white');
    const [checkersBoardTheme, setCheckersBoardTheme] = useState('classic');

    const [saving, setSaving] = useState(false);
    
    useEffect(() => {
        if(userData?.equipment) {
            setChessPieceStyle(userData.equipment.chess.pieceStyle || 'black_white');
            setChessBoardTheme(userData.equipment.chess.boardTheme || 'ocean');
            setCheckersPieceStyle(userData.equipment.checkers.pieceStyle || 'black_white');
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
                                                if (r < 3) piece = <CheckersPieceComponent color={currentPieceColors[0]} />
                                                if (r > 4) piece = <CheckersPieceComponent color={currentPieceColors[1]} />
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
