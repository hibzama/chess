
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
    const style = { width: '100%', height: '100%', fill: 'currentColor' };
    switch(type) {
        case 'p': return <svg viewBox="0 0 45 45" style={style}><path d="M22.5 9C19.5 9 19 10.5 19 10.5L19 13C19 13 20.5 13 22.5 13C24.5 13 26 13 26 13L26 10.5C26 10.5 25.5 9 22.5 9Z M17.5 14L17.5 26L27.5 26L27.5 14L17.5 14Z M14.5 27.5L14.5 30L30.5 30L30.5 27.5L14.5 27.5Z" /></svg>;
        case 'r': return <svg viewBox="0 0 45 45" style={style}><path d="M9 13L9 16L12 16L12 13L9 13ZM15 13L15 16L18 16L18 13L15 13ZM21 13L21 16L24 16L24 13L21 13ZM27 13L27 16L30 16L30 13L27 13ZM33 13L33 16L36 16L36 13L33 13ZM9 19L9 30L36 30L36 19L9 19ZM9 33L9 36L36 36L36 33L9 33Z" /></svg>;
        case 'n': return <svg viewBox="0 0 45 45" style={style}><path d="M22,10C32.5,10,31.5,18.5,31.5,18.5C31.5,24,28,29,28,29L15.5,29C15.5,29,13.5,24.5,13.5,24.5C13.5,24.5,13.5,19.5,13.5,19.5C13.5,19.5,14,16.5,14,16.5C14,16.5,11.5,14.5,11.5,14.5C11.5,14.5,10.5,12,10.5,12C10.5,12,12.5,10,12.5,10C12.5,10,15,11.5,15,11.5C15,11.5,16,10,22,10ZM12.5,32L31.5,32L31.5,39L12.5,39L12.5,32Z" /></svg>;
        case 'b': return <svg viewBox="0 0 45 45" style={style}><path d="M15 14L15 17L18 17L18 14L15 14ZM21 14L21 17L24 17L24 14L21 14ZM27 14L27 17L30 17L30 14L27 14ZM9 19L9 22L12 22L12 19L9 19ZM33 19L33 22L36 22L36 19L33 19ZM15 25L15 33L30 33L30 25L15 25ZM9 36L9 39L36 39L36 36L9 36Z" /></svg>;
        case 'q': return <svg viewBox="0 0 45 45" style={style}><path d="M8 12L14 4.5L22.5 7L31 4.5L37 12L8 12ZM8 15L37 15L37 26L8 26L8 15ZM14 29.5L31 29.5L31 31.5L14 31.5L14 29.5ZM11 34L34 34L34 36L11 36L11 34ZM12.5 38L32.5 38L32.5 40L12.5 40L12.5 38Z" /></svg>;
        case 'k': return <svg viewBox="0 0 45 45" style={style}><path d="M22.5 6L20 11L25 11L22.5 6ZM21 11.5L21 14.5L24 14.5L24 11.5L21 11.5ZM12 14.5L12 21.5L33 21.5L33 14.5L12 14.5ZM12 23.5L12 25.5L33 25.5L33 23.5L12 23.5ZM14 27.5L14 36.5L31 36.5L31 27.5L14 27.5ZM16 38.5L16 40.5L29 40.5L29 38.5L16 38.5Z" /></svg>;
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
                        <div key={`${rowIndex}-${colIndex}`} className={cn('w-full h-full', isLight ? 'bg-[--board-light]' : 'bg-[--board-dark]')}>
                           {piece && (
                                <div className="w-full h-full p-1" style={{ color: piece.color === 'w' ? 'var(--piece-p1)' : 'var(--piece-p2)' }}>
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
