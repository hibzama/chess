
'use client'
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Palette, Check, Loader2, Edit, PlusCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Theme {
    id: string;
    name: string;
    colors: {
        primary: string; // HSL format e.g., "326 100% 60%"
        background: string;
        accent: string;
    };
    landingPage: {
        bgImageUrl: string;
        heroImageUrl: string;
        heroTitle: string;
        heroSubtitle: string;
        apkUrl?: string;
        features?: string[];
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
            toast({ title: 'Success!', description: 'Active theme updated successfully. Changes will be visible on the public site.' });
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
    
    const handleUpdateLandingFeature = (index: number, value: string) => {
        if (!editingTheme) return;
        const newFeatures = [...(editingTheme.landingPage.features || [])];
        newFeatures[index] = value;
        handleUpdateNestedThemeValue('landingPage', 'features', newFeatures);
    }

    const handleUpdateNestedThemeValue = (section: keyof Theme, field: string, value: string | string[]) => {
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

    const handleCreateNewTheme = async () => {
        const newThemeName = prompt("Enter a name for the new theme:", "New Theme");
        if (!newThemeName) return;

        const newThemeId = newThemeName.toLowerCase().replace(/\s+/g, '_');
        
        const newThemeData = {
            name: newThemeName,
            colors: {
                primary: '210 40% 96.1%',
                background: '0 0% 3.9%',
                accent: '217.2 91.2% 59.8%',
            },
            landingPage: {
                bgImageUrl: 'https://placehold.co/1920x1080.png',
                heroImageUrl: 'https://placehold.co/600x400.png',
                heroTitle: 'New Theme Title',
                heroSubtitle: 'New theme subtitle goes here.',
                 apkUrl: '#',
                features: ['Feature 1', 'Feature 2', 'Feature 3', 'Feature 4']
            },
            aboutContent: 'About content for the new theme.',
            supportDetails: {
                phone: '',
                whatsapp: '',
                telegram: '',
                email: '',
            },
            termsContent: 'Terms and conditions for the new theme.',
            createdAt: serverTimestamp(),
        };

        try {
            await setDoc(doc(db, 'themes', newThemeId), newThemeData);
            toast({ title: 'Theme Created!', description: 'New theme has been added successfully.' });
            fetchThemes();
        } catch (error) {
            console.error("Error creating new theme:", error);
            toast({ variant: "destructive", title: 'Error', description: 'Could not create new theme.' });
        }
    }

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
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Manage Themes</h2>
                    <Button variant="outline" onClick={handleCreateNewTheme}><PlusCircle className="mr-2"/> Create New Theme</Button>
                </div>
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
                            <CardHeader><CardTitle>Theme Colors</CardTitle><CardDescription>Enter HSL values without units (e.g., 210 40% 96.1%).</CardDescription></CardHeader>
                            <CardContent className="grid md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Primary Color</Label>
                                    <Input value={editingTheme.colors?.primary || ''} onChange={e => handleUpdateNestedThemeValue('colors', 'primary', e.target.value)} />
                                </div>
                                 <div className="space-y-2">
                                    <Label>Background Color</Label>
                                    <Input value={editingTheme.colors?.background || ''} onChange={e => handleUpdateNestedThemeValue('colors', 'background', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Accent Color</Label>
                                    <Input value={editingTheme.colors?.accent || ''} onChange={e => handleUpdateNestedThemeValue('colors', 'accent', e.target.value)} />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Landing Page</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Background Image URL</Label>
                                    <Input value={editingTheme.landingPage.bgImageUrl} onChange={e => handleUpdateNestedThemeValue('landingPage', 'bgImageUrl', e.target.value)} />
                                </div>
                                 <div className="space-y-2">
                                    <Label>Hero/Banner Image URL</Label>
                                    <Input value={editingTheme.landingPage.heroImageUrl} onChange={e => handleUpdateNestedThemeValue('landingPage', 'heroImageUrl', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Hero Title</Label>
                                    <Input value={editingTheme.landingPage.heroTitle} onChange={e => handleUpdateNestedThemeValue('landingPage', 'heroTitle', e.target.value)} />
                                </div>
                                 <div className="space-y-2">
                                    <Label>Hero Subtitle</Label>
                                    <Textarea value={editingTheme.landingPage.heroSubtitle} onChange={e => handleUpdateNestedThemeValue('landingPage', 'heroSubtitle', e.target.value)} />
                                </div>
                                {editingTheme.id === 'default' && (
                                <>
                                 <div className="space-y-2">
                                    <Label>Download APK URL</Label>
                                    <Input value={editingTheme.landingPage.apkUrl || ''} onChange={e => handleUpdateNestedThemeValue('landingPage', 'apkUrl', e.target.value)} placeholder="https://example.com/app.apk"/>
                                </div>
                                <div className="space-y-2">
                                    <Label>Landing Page Features</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {(editingTheme.landingPage.features || []).map((feature, index) => (
                                            <Input 
                                                key={index}
                                                value={feature}
                                                onChange={e => handleUpdateLandingFeature(index, e.target.value)}
                                            />
                                        ))}
                                    </div>
                                </div>
                                </>
                                )}
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
