
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Gamepad2, Loader2, BrainCircuit, Layers, Spade, Puzzle } from 'lucide-react';
import { GameAvailability } from '@/context/auth-context';


export default function GameAvailabilityPage() {
    const [availability, setAvailability] = useState<GameAvailability>({
        practiceChess: true,
        multiplayerChess: true,
        practiceCheckers: true,
        multiplayerCheckers: true,
        practiceOmi: true,
        puzzles: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchSettings = async () => {
            const settingsRef = doc(db, 'settings', 'gameAvailability');
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
                setAvailability(settingsSnap.data() as GameAvailability);
            }
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleToggle = (game: keyof GameAvailability) => {
        setAvailability(prev => ({ ...prev, [game]: !prev[game] }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const settingsRef = doc(db, 'settings', 'gameAvailability');
            await setDoc(settingsRef, availability, { merge: true });
            toast({ title: 'Success!', description: 'Game availability settings have been saved.' });
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({ variant: "destructive", title: 'Error', description: 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };
    
    if (loading) {
        return <Skeleton className="w-full h-96" />
    }

    const gameModes: { key: keyof GameAvailability; label: string; icon: React.ReactNode, type: 'practice' | 'multiplayer' | 'feature' }[] = [
        { key: 'practiceChess', label: 'Practice Chess', icon: <BrainCircuit />, type: 'practice' },
        { key: 'multiplayerChess', label: 'Multiplayer Chess', icon: <BrainCircuit />, type: 'multiplayer' },
        { key: 'practiceCheckers', label: 'Practice Checkers', icon: <Layers />, type: 'practice' },
        { key: 'multiplayerCheckers', label: 'Multiplayer Checkers', icon: <Layers />, type: 'multiplayer' },
        { key: 'practiceOmi', label: 'Practice Omi', icon: <Spade />, type: 'practice' },
        { key: 'puzzles', label: 'Puzzles', icon: <Puzzle />, type: 'feature' },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Gamepad2 /> Game Availability</CardTitle>
                <CardDescription>Enable or disable specific games and modes for all users.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gameModes.map(mode => (
                         <Card key={mode.key}>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="text-primary">{mode.icon}</div>
                                    <div className="space-y-0.5">
                                        <Label htmlFor={mode.key} className="text-base">{mode.label}</Label>
                                        <p className="text-sm text-muted-foreground capitalize">
                                        {mode.type}
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    id={mode.key}
                                    checked={availability[mode.key]}
                                    onCheckedChange={() => handleToggle(mode.key)}
                                />
                            </CardContent>
                         </Card>
                    ))}
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSave} disabled={saving}>
                    {saving ? <><Loader2 className="animate-spin mr-2" /> Saving...</> : "Save Settings"}
                </Button>
            </CardFooter>
        </Card>
    );
}
