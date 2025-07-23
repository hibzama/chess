
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

const getPieceIcon = (type: string) => {
    const style = { width: '100%', height: '100%', fill: 'currentColor', stroke: 'black', strokeWidth: 0.5 };
    switch(type) {
        case 'p': return <svg viewBox="0 0 45 45" style={style}><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38-1.98 1.48-3.28 3.89-3.28 6.62 0 4.42 3.58 8 8 8s8-3.58 8-8c0-2.73-1.3-5.14-3.28-6.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/></svg>;
        case 'r': return <svg viewBox="0 0 45 45" style={style}><path d="M9 14h27v5h-27zM12 19h21v12h-21zM9 31h27v5h-27zM11 11h23v3h-23zM14 8h17v3h-17z"/></svg>;
        case 'n': return <svg viewBox="0 0 45 45" style={style}><path d="M22 10c-3 0-5.5 2-6 4H14c-1 0-2 .5-2 1.5 0 .5.5 1 1 1h1.5c-.5 1-1 2-1 3.5 0 2.5 1.5 5 4 5h3c.5 0 1 0 1.5-.5.5-.5.5-1 0-1.5-1-.5-1.5-1-1.5-2.5 0-1 .5-2 1.5-2.5.5-.5.5-1 0-1.5-1-.5-1.5-1-1.5-2.5 0-1 .5-2 1.5-2.5.5-.5.5-1 0-1.5C25 12 24 10 22 10zm-1.5 12c-1.5 0-2.5 1-2.5 2.5s1 2.5 2.5 2.5 2.5-1 2.5-2.5-1-2.5-2.5-2.5z"/></svg>;
        case 'b': return <svg viewBox="0 0 45 45" style={style}><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.3 16.86 16 19.27 16 22c0 4.42 3.58 8 8 8s8-3.58 8-8c0-2.73-1.3-5.14-3.28-6.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4zm0 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/></svg>;
        case 'q': return <svg viewBox="0 0 45 45" style={style}><path d="M8 12h29l-3.5 14h-22zm-2 16h33v5h-33zM22.5 6l-6 6h12z"/></svg>;
        case 'k': return <svg viewBox="0 0 45 45" style={style}><path d="M22.5 6L19.5 12h6zM15 13h15v18h-15zM12 31h21v5h-21z"/></svg>;
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
                                <div className="w-full h-full p-1" style={{ color: piece.color === 'w' ? 'var(--piece-p1)' : 'var(--piece-p2)', stroke: piece.color === 'w' ? 'var(--piece-p2)' : 'var(--piece-p1)' }}>
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
