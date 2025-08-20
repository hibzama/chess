
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Ruler, Loader2, Plus, X, BrainCircuit, Layers } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface ResignTier {
    fromPieces: number;
    toPieces: number;
    resignerRefund: number;
    opponentPayout: number;
}

interface GameRules {
    minimumWager: number;
    winPayout: number;
    drawPayout: number;
    standardLossPayout: number;
    timeoutWinnerPayout: number;
    timeoutLoserPayout: number;
    resignTiers: ResignTier[];
}

const defaultRules: GameRules = {
    minimumWager: 10,
    winPayout: 180,
    drawPayout: 90,
    standardLossPayout: 0,
    timeoutWinnerPayout: 180,
    timeoutLoserPayout: 0,
    resignTiers: [
        { fromPieces: 0, toPieces: 2, resignerRefund: 25, opponentPayout: 130 },
        { fromPieces: 3, toPieces: 5, resignerRefund: 35, opponentPayout: 130 },
        { fromPieces: 6, toPieces: 16, resignerRefund: 50, opponentPayout: 130 },
    ],
};

const GameRulesForm = ({ gameType, rules, setRules }: { gameType: 'chess' | 'checkers', rules: GameRules, setRules: React.Dispatch<React.SetStateAction<GameRules>>}) => {

    const handleTierChange = (index: number, field: keyof ResignTier, value: string) => {
        const newTiers = [...rules.resignTiers];
        newTiers[index] = { ...newTiers[index], [field]: Number(value) };
        setRules(prev => ({...prev, resignTiers: newTiers}));
    };

    const addTier = () => {
        setRules(prev => ({...prev, resignTiers: [...prev.resignTiers, { fromPieces: 0, toPieces: 0, resignerRefund: 0, opponentPayout: 0}]}));
    };
    
    const removeTier = (index: number) => {
        const newTiers = rules.resignTiers.filter((_, i) => i !== index);
        setRules(prev => ({...prev, resignTiers: newTiers}));
    };
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>General Rules</CardTitle></CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Minimum Wager</Label>
                        <Input type="number" value={rules.minimumWager} onChange={(e) => setRules(p => ({...p, minimumWager: Number(e.target.value)}))} />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Payout Percentages (%)</CardTitle></CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2"><Label>Standard Win (Checkmate/Capture)</Label><Input type="number" value={rules.winPayout} onChange={(e) => setRules(p => ({...p, winPayout: Number(e.target.value)}))} /></div>
                    <div className="space-y-2"><Label>Standard Loss %</Label><Input type="number" value={rules.standardLossPayout} onChange={(e) => setRules(p => ({...p, standardLossPayout: Number(e.target.value)}))} /></div>
                    <div className="space-y-2"><Label>Draw</Label><Input type="number" value={rules.drawPayout} onChange={(e) => setRules(p => ({...p, drawPayout: Number(e.target.value)}))} /></div>
                    <div className="space-y-2"><Label>Timeout Winner</Label><Input type="number" value={rules.timeoutWinnerPayout} onChange={(e) => setRules(p => ({...p, timeoutWinnerPayout: Number(e.target.value)}))} /></div>
                    <div className="space-y-2"><Label>Timeout Loser</Label><Input type="number" value={rules.timeoutLoserPayout} onChange={(e) => setRules(p => ({...p, timeoutLoserPayout: Number(e.target.value)}))} /></div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Resignation Rules</CardTitle>
                    <CardDescription>Define refund/payout percentages based on the number of pieces the resigning player has left.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     {rules.resignTiers.map((tier, index) => (
                        <div key={index} className="flex items-end gap-4 p-4 border rounded-md">
                            <div className="flex-1 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2"><Label>From Pieces</Label><Input type="number" value={tier.fromPieces} onChange={(e) => handleTierChange(index, 'fromPieces', e.target.value)}/></div>
                                <div className="space-y-2"><Label>To Pieces</Label><Input type="number" value={tier.toPieces} onChange={(e) => handleTierChange(index, 'toPieces', e.target.value)}/></div>
                                <div className="space-y-2"><Label>Resigner Refund %</Label><Input type="number" value={tier.resignerRefund} onChange={(e) => handleTierChange(index, 'resignerRefund', e.target.value)}/></div>
                                <div className="space-y-2"><Label>Opponent Payout %</Label><Input type="number" value={tier.opponentPayout} onChange={(e) => handleTierChange(index, 'opponentPayout', e.target.value)}/></div>
                            </div>
                            <Button variant="destructive" size="icon" onClick={() => removeTier(index)}><X className="w-4 h-4" /></Button>
                        </div>
                    ))}
                    <Button variant="outline" onClick={addTier}><Plus className="mr-2 h-4 w-4"/> Add Tier</Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default function GameRulesSettingsPage() {
    const [chessRules, setChessRules] = useState<GameRules>(defaultRules);
    const [checkersRules, setCheckersRules] = useState<GameRules>(defaultRules);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchConfig = async () => {
            setLoading(true);
            const chessRef = doc(db, 'settings', 'gameRules_chess');
            const checkersRef = doc(db, 'settings', 'gameRules_checkers');
            const [chessSnap, checkersSnap] = await Promise.all([getDoc(chessRef), getDoc(checkersRef)]);
            
            if (chessSnap.exists()) setChessRules(chessSnap.data() as GameRules);
            if (checkersSnap.exists()) setCheckersRules(checkersSnap.data() as GameRules);

            setLoading(false);
        };
        fetchConfig();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const chessRef = doc(db, 'settings', 'gameRules_chess');
            const checkersRef = doc(db, 'settings', 'gameRules_checkers');
            await setDoc(chessRef, { ...chessRules, resignTiers: chessRules.resignTiers.sort((a,b) => a.fromPieces - b.fromPieces) }, { merge: true });
            await setDoc(checkersRef, { ...checkersRules, resignTiers: checkersRules.resignTiers.sort((a,b) => a.fromPieces - b.fromPieces) }, { merge: true });
            toast({ title: 'Success!', description: 'Game rules have been saved.' });
        } catch (error) {
            console.error("Error saving game rules:", error);
            toast({ variant: "destructive", title: 'Error', description: 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };
    
    if (loading) {
        return <Skeleton className="w-full h-96" />
    }

    return (
        <>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Ruler /> Game Rules & Payouts</CardTitle>
                <CardDescription>Define the core financial rules for multiplayer games.</CardDescription>
            </CardHeader>
        </Card>
        <Tabs defaultValue="chess" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chess"><BrainCircuit className="mr-2"/> Chess Rules</TabsTrigger>
                <TabsTrigger value="checkers"><Layers className="mr-2"/> Checkers Rules</TabsTrigger>
            </TabsList>
            <TabsContent value="chess">
                <GameRulesForm gameType="chess" rules={chessRules} setRules={setChessRules} />
            </TabsContent>
            <TabsContent value="checkers">
                <GameRulesForm gameType="checkers" rules={checkersRules} setRules={setCheckersRules} />
            </TabsContent>
        </Tabs>

        <div className="mt-6">
             <Button onClick={handleSave} disabled={saving} size="lg">
                {saving ? <><Loader2 className="animate-spin mr-2"/> Saving...</> : 'Save All Rules'}
            </Button>
        </div>
        </>
    )
}
