
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
import { Coins, Loader2 } from 'lucide-react';

export default function CurrencySettingsPage() {
    const [config, setConfig] = useState({
        symbol: 'LKR',
        usdtRate: 310,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchConfig = async () => {
            const configRef = doc(db, 'settings', 'currencyConfig');
            const configSnap = await getDoc(configRef);
            if (configSnap.exists()) {
                setConfig(configSnap.data() as any);
            }
            setLoading(false);
        };
        fetchConfig();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const configRef = doc(db, 'settings', 'currencyConfig');
            await setDoc(configRef, { ...config, usdtRate: Number(config.usdtRate) }, { merge: true });
            toast({ title: 'Success!', description: 'Currency settings have been saved.' });
        } catch (error) {
            console.error("Error saving currency config:", error);
            toast({ variant: "destructive", title: 'Error', description: 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };
    
    const handleChange = (field: keyof typeof config, value: string | number) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return <Skeleton className="w-full h-96" />
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Coins /> Currency Settings</CardTitle>
                <CardDescription>Define the primary currency and exchange rate for the entire application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="symbol">Currency Symbol</Label>
                        <Input id="symbol" placeholder="e.g., LKR, $" value={config.symbol} onChange={(e) => handleChange('symbol', e.target.value)} />
                        <p className="text-xs text-muted-foreground">This symbol will be displayed next to all monetary values.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="usdtRate">USDT Exchange Rate</Label>
                        <Input id="usdtRate" type="number" placeholder="e.g., 310" value={config.usdtRate} onChange={(e) => handleChange('usdtRate', e.target.value)} />
                        <p className="text-xs text-muted-foreground">The value of 1 USDT in your main currency.</p>
                    </div>
                </div>
            </CardContent>
             <CardFooter>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? <><Loader2 className="animate-spin mr-2"/> Saving...</> : 'Save Settings'}
                </Button>
            </CardFooter>
        </Card>
    )
}
