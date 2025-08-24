
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
import { CreditCard, Loader2, Banknote, Percent, MessageSquare } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

const TelegramIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
)

export default function PaymentGatewaySettingsPage() {
    const [config, setConfig] = useState({
        bankDepositEnabled: true,
        bankName: 'Bank of Ceylon (Boc)',
        bankBranch: 'Galenbidunuwewa',
        bankAccountName: 'Jd Aththanayaka',
        bankAccountNumber: '81793729',
        binancePayEnabled: true,
        binancePayId: '38881724',
        withdrawalFeePercentage: 5,
        supportWhatsapp: '94704894587',
        supportTelegram: 'nexbattle_help',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchConfig = async () => {
            const configRef = doc(db, 'settings', 'paymentConfig');
            const configSnap = await getDoc(configRef);
            if (configSnap.exists()) {
                setConfig(prev => ({ ...prev, ...configSnap.data() }));
            }
            setLoading(false);
        };
        fetchConfig();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const configRef = doc(db, 'settings', 'paymentConfig');
            await setDoc(configRef, { 
                ...config, 
                withdrawalFeePercentage: Number(config.withdrawalFeePercentage) 
            }, { merge: true });
            toast({ title: 'Success!', description: 'Payment settings have been saved.' });
        } catch (error) {
            console.error("Error saving payment config:", error);
            toast({ variant: "destructive", title: 'Error', description: 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };
    
    const handleChange = (field: keyof typeof config, value: string | number | boolean) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return <Skeleton className="w-full h-96" />
    }

    return (
        <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><CreditCard /> Payment Gateway Settings</CardTitle>
                <CardDescription>Manage deposit and withdrawal methods, fees, and support contacts.</CardDescription>
            </CardHeader>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Deposit Methods</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Bank Deposit */}
                    <div className="space-y-4 rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="bank-enabled" className="text-base font-semibold flex items-center gap-2"><Banknote/> Bank Deposit</Label>
                            <Switch id="bank-enabled" checked={config.bankDepositEnabled} onCheckedChange={(v) => handleChange('bankDepositEnabled', v)} />
                        </div>
                        <Separator/>
                        <div className={cn("space-y-4", !config.bankDepositEnabled && "opacity-50 pointer-events-none")}>
                            <div className="space-y-2"><Label>Bank Name</Label><Input value={config.bankName} onChange={(e) => handleChange('bankName', e.target.value)} /></div>
                            <div className="space-y-2"><Label>Branch</Label><Input value={config.bankBranch} onChange={(e) => handleChange('bankBranch', e.target.value)} /></div>
                            <div className="space-y-2"><Label>Account Holder Name</Label><Input value={config.bankAccountName} onChange={(e) => handleChange('bankAccountName', e.target.value)} /></div>
                            <div className="space-y-2"><Label>Account Number</Label><Input value={config.bankAccountNumber} onChange={(e) => handleChange('bankAccountNumber', e.target.value)} /></div>
                        </div>
                    </div>
                     {/* Binance Pay */}
                     <div className="space-y-4 rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="binance-enabled" className="text-base font-semibold flex items-center gap-2"><img src="https://upload.wikimedia.org/wikipedia/commons/5/57/Binance_Logo.png" alt="Binance" className="w-5 h-5"/> Binance Pay</Label>
                            <Switch id="binance-enabled" checked={config.binancePayEnabled} onCheckedChange={(v) => handleChange('binancePayEnabled', v)} />
                        </div>
                        <Separator/>
                         <div className={cn("space-y-2", !config.binancePayEnabled && "opacity-50 pointer-events-none")}>
                            <Label>Binance PayID</Label>
                            <Input value={config.binancePayId} onChange={(e) => handleChange('binancePayId', e.target.value)} />
                        </div>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Withdrawal & Support</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-6">
                    <div className="space-y-2 rounded-lg border p-4">
                         <Label className="text-base font-semibold flex items-center gap-2"><Percent/> Withdrawal Fee</Label>
                         <div className="flex items-center gap-2">
                            <Input type="number" value={config.withdrawalFeePercentage} onChange={(e) => handleChange('withdrawalFeePercentage', e.target.value)} />
                            <span className="text-muted-foreground">%</span>
                         </div>
                    </div>

                    <div className="space-y-4 rounded-lg border p-4">
                        <Label className="text-base font-semibold">Support Contacts</Label>
                        <p className="text-sm text-muted-foreground">These contacts are shown to users for deposit verification.</p>
                        <Separator/>
                         <div className="space-y-2">
                             <Label className="flex items-center gap-2"><MessageSquare/> WhatsApp Number</Label>
                            <Input value={config.supportWhatsapp} onChange={(e) => handleChange('supportWhatsapp', e.target.value)} placeholder="e.g., 94704894587"/>
                         </div>
                          <div className="space-y-2">
                             <Label className="flex items-center gap-2"><TelegramIcon/> Telegram Username</Label>
                            <Input value={config.supportTelegram} onChange={(e) => handleChange('supportTelegram', e.target.value)} placeholder="e.g., nexbattle_help"/>
                         </div>
                    </div>
                 </CardContent>
            </Card>
        </div>
        <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
                {saving ? <><Loader2 className="animate-spin mr-2"/> Saving...</> : 'Save All Settings'}
            </Button>
        </div>
        </div>
    )
}
