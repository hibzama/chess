
'use client'
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Palette, Check, Loader2, Edit } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Theme {
    id: string;
    name: string;
    landingPage: {
        bgImageUrl: string;
        heroTitle: string;
        heroSubtitle: string;
    };
    aboutContent: string;
    supportDetails: {
        phone: string;
        whatsapp: string;
        telegram: string;
        email: string;
    };
    termsContent: string;
}

export default function ThemeSettingsPage() {
    const [themes, setThemes] = useState<Theme[]>([]);
    const [activeThemeId, setActiveThemeId] = useState('');
    const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    const fetchThemes = useCallback(async () => {
        setLoading(true);
        try {
            const [themesSnapshot, configSnap] = await Promise.all([
                getDocs(collection(db, 'themes')),
                getDoc(doc(db, 'settings', 'siteConfig'))
            ]);
            
            const themesData = themesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Theme));
            setThemes(themesData);

            if (configSnap.exists()) {
                setActiveThemeId(configSnap.data().activeThemeId || 'default');
            } else {
                setActiveThemeId('default');
            }
        } catch (error) {
            console.error("Error fetching theme data:", error);
            toast({ variant: "destructive", title: 'Error', description: 'Failed to load theme data.' });
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchThemes();
    }, [fetchThemes]);
    
    const handleSaveActiveTheme = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'settings', 'siteConfig'), { activeThemeId });
            toast({ title: 'Success!', description: 'Active theme updated successfully.' });
        } catch (error) {
            console.error("Error saving active theme:", error);
            toast({ variant: "destructive", title: 'Error', description: 'Failed to save active theme.' });
        } finally {
            setSaving(false);
        }
    };
    
    const handleUpdateEditingTheme = (field: keyof Theme, value: any) => {
        if (!editingTheme) return;
        setEditingTheme(prev => ({ ...prev!, [field]: value }));
    };

    const handleUpdateNestedThemeValue = (section: keyof Theme, field: string, value: string) => {
        if (!editingTheme) return;
        setEditingTheme(prev => ({
            ...prev!,
            [section]: {
                // @ts-ignore
                ...prev[section],
                [field]: value
            }
        }));
    };

    const handleSaveThemeDetails = async () => {
        if (!editingTheme) return;
        setSaving(true);
        try {
            const { id, ...themeData } = editingTheme;
            await setDoc(doc(db, 'themes', id), themeData);
            toast({ title: 'Success!', description: `${editingTheme.name} theme details updated.` });
            setEditingTheme(null);
            fetchThemes(); // Re-fetch to get the latest data
        } catch (error) {
            console.error("Error saving theme details:", error);
            toast({ variant: "destructive", title: 'Error', description: 'Failed to save theme details.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <Skeleton className="w-full h-96" />;
    }
    
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Palette /> Theme Settings</CardTitle>
                    <CardDescription>Select the active theme for your website and customize its content.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Active Website Theme</Label>
                         <Select value={activeThemeId} onValueChange={setActiveThemeId}>
                            <SelectTrigger className="w-full md:w-1/2">
                                <SelectValue placeholder="Select a theme" />
                            </SelectTrigger>
                            <SelectContent>
                                {themes.map(theme => (
                                    <SelectItem key={theme.id} value={theme.id}>{theme.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">This theme will be shown to all non-logged-in users.</p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSaveActiveTheme} disabled={saving}>{saving ? <Loader2 className="animate-spin"/> : 'Save Active Theme'}</Button>
                </CardFooter>
            </Card>

            <div className="space-y-4">
                <h2 className="text-2xl font-bold">Manage Themes</h2>
                {themes.map(theme => (
                    <Card key={theme.id}>
                        <CardHeader className="flex flex-row justify-between items-center">
                            <div>
                                <CardTitle>{theme.name}</CardTitle>
                                <CardDescription>ID: {theme.id}</CardDescription>
                            </div>
                            <Button variant="outline" onClick={() => setEditingTheme(theme)}><Edit className="mr-2"/> Edit Content</Button>
                        </CardHeader>
                    </Card>
                ))}
            </div>

            {editingTheme && (
                 <Card className="fixed inset-0 z-50 overflow-auto bg-background p-4 md:p-8">
                     <CardHeader>
                        <CardTitle>Editing: {editingTheme.name}</CardTitle>
                        <CardDescription>Make changes to the content for this theme.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle>Landing Page</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Background Image URL</Label>
                                    <Input value={editingTheme.landingPage.bgImageUrl} onChange={e => handleUpdateNestedThemeValue('landingPage', 'bgImageUrl', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Hero Title</Label>
                                    <Input value={editingTheme.landingPage.heroTitle} onChange={e => handleUpdateNestedThemeValue('landingPage', 'heroTitle', e.target.value)} />
                                </div>
                                 <div className="space-y-2">
                                    <Label>Hero Subtitle</Label>
                                    <Textarea value={editingTheme.landingPage.heroSubtitle} onChange={e => handleUpdateNestedThemeValue('landingPage', 'heroSubtitle', e.target.value)} />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                             <CardHeader><CardTitle>About Us Content</CardTitle></CardHeader>
                             <CardContent><Textarea value={editingTheme.aboutContent} onChange={e => handleUpdateEditingTheme('aboutContent', e.target.value)} rows={10}/></CardContent>
                        </Card>
                        <Card>
                             <CardHeader><CardTitle>Support Details</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2"><Label>Phone</Label><Input value={editingTheme.supportDetails.phone} onChange={e => handleUpdateNestedThemeValue('supportDetails', 'phone', e.target.value)} /></div>
                                <div className="space-y-2"><Label>WhatsApp</Label><Input value={editingTheme.supportDetails.whatsapp} onChange={e => handleUpdateNestedThemeValue('supportDetails', 'whatsapp', e.target.value)} /></div>
                                <div className="space-y-2"><Label>Telegram</Label><Input value={editingTheme.supportDetails.telegram} onChange={e => handleUpdateNestedThemeValue('supportDetails', 'telegram', e.target.value)} /></div>
                                <div className="space-y-2"><Label>Email</Label><Input value={editingTheme.supportDetails.email} onChange={e => handleUpdateNestedThemeValue('supportDetails', 'email', e.target.value)} /></div>
                            </CardContent>
                        </Card>
                         <Card>
                             <CardHeader><CardTitle>Terms & Conditions</CardTitle></CardHeader>
                             <CardContent><Textarea value={editingTheme.termsContent} onChange={e => handleUpdateEditingTheme('termsContent', e.target.value)} rows={10} /></CardContent>
                        </Card>
                    </CardContent>
                    <CardFooter className="gap-4">
                        <Button onClick={handleSaveThemeDetails} disabled={saving}>{saving ? <Loader2 className="animate-spin"/> : 'Save Changes'}</Button>
                        <Button variant="outline" onClick={() => setEditingTheme(null)}>Cancel</Button>
                    </CardFooter>
                 </Card>
            )}
        </div>
    );
}
