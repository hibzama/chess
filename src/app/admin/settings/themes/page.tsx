
'use client'
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, serverTimestamp } from 'firestore/lite';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Palette, Check, Loader2, Edit, PlusCircle, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LandingSection {
    title: string;
    buttonText: string;
    buttonLink?: string;
    image: string;
    aiHint?: string;
    overlayText?: string;
    borderColor?: string;
    buttonStyle?: 'link' | 'box';
    buttonTextColor?: string;
    buttonBgColor?: string;
}

interface Theme {
    id: string;
    name: string;
    logoUrl?: string;
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
        heroTitleAlign?: 'left' | 'center' | 'right';
        apkUrl?: string;
        features?: string[];
        landingSections?: LandingSection[];
        playingNow?: string;
        gamesToday?: string;
    };
    aboutContent: string;
    supportDetails: {
        phone: string;
        whatsapp: string;
        telegram: string;
        email: string;
    };
    termsContent: string;
    marketingContent: string;
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
    
    const handleUpdateLandingSection = (index: number, field: keyof LandingSection, value: any) => {
        if (!editingTheme) return;
        const newSections = [...(editingTheme.landingPage.landingSections || [])];
        newSections[index] = { ...newSections[index], [field]: value };
        handleUpdateNestedThemeValue('landingPage', 'landingSections', newSections);
    };
    
    const handleAddLandingSection = () => {
        if (!editingTheme) return;
        const newSections = [...(editingTheme.landingPage.landingSections || []), { 
            title: 'New Section', 
            buttonText: 'Learn More',
            buttonLink: '#',
            image: 'https://placehold.co/500x500.png', 
            aiHint: '',
            overlayText: 'Overlay Text',
            borderColor: '#262421',
            buttonStyle: 'box',
            buttonTextColor: '#FFFFFF',
            buttonBgColor: '#4A5568',
        }];
        handleUpdateNestedThemeValue('landingPage', 'landingSections', newSections);
    };

    const handleRemoveLandingSection = (index: number) => {
        if (!editingTheme) return;
        const newSections = (editingTheme.landingPage.landingSections || []).filter((_, i) => i !== index);
        handleUpdateNestedThemeValue('landingPage', 'landingSections', newSections);
    };

    const handleUpdateNestedThemeValue = (section: keyof Theme, field: string, value: any) => {
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
            await setDoc(doc(db, 'themes', id), themeData, { merge: true });
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
        
        const newThemeData: Omit<Theme, 'id'> = {
            name: newThemeName,
            logoUrl: 'https://placehold.co/120x40.png',
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
                features: ['Feature 1', 'Feature 2', 'Feature 3', 'Feature 4'],
                landingSections: [],
                playingNow: '0',
                gamesToday: '0',
            },
            aboutContent: 'About content for the new theme.',
            supportDetails: {
                phone: '',
                whatsapp: '',
                telegram: '',
                email: '',
            },
            termsContent: 'Terms and conditions for the new theme.',
            marketingContent: 'Marketing content for the new theme.'
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
                            <Button variant="outline" onClick={() => setEditingTheme(JSON.parse(JSON.stringify(theme)))}><Edit className="mr-2"/> Edit Content</Button>
                        </CardHeader>
                    </Card>
                ))}
            </div>

            {editingTheme && (
                 <Card className="fixed inset-0 z-50 overflow-auto bg-background p-4 md:p-8">
                    <ScrollArea className="h-full pr-6">
                     <CardHeader>
                        <CardTitle>Editing: {editingTheme.name}</CardTitle>
                        <CardDescription>Make changes to the content for this theme.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Common Settings */}
                        <Card>
                             <CardHeader><CardTitle>General Settings</CardTitle></CardHeader>
                             <CardContent className="space-y-4">
                                 <div className="space-y-2">
                                    <Label>Logo Image URL</Label>
                                    <Input value={editingTheme.logoUrl || ''} onChange={e => handleUpdateEditingTheme('logoUrl', e.target.value)} />
                                </div>
                                <Card>
                                    <CardHeader><CardTitle>Theme Colors</CardTitle><CardDescription>Enter HSL values without units (e.g., 210 40% 96.1%).</CardDescription></CardHeader>
                                    <CardContent className="grid md:grid-cols-3 gap-4">
                                        <div className="space-y-2"><Label>Primary Color</Label><Input value={editingTheme.colors?.primary || ''} onChange={e => handleUpdateNestedThemeValue('colors', 'primary', e.target.value)} /></div>
                                        <div className="space-y-2"><Label>Background Color</Label><Input value={editingTheme.colors?.background || ''} onChange={e => handleUpdateNestedThemeValue('colors', 'background', e.target.value)} /></div>
                                        <div className="space-y-2"><Label>Accent Color</Label><Input value={editingTheme.colors?.accent || ''} onChange={e => handleUpdateNestedThemeValue('colors', 'accent', e.target.value)} /></div>
                                    </CardContent>
                                </Card>
                            </CardContent>
                        </Card>

                        {/* Theme Specific Settings */}
                        <Card>
                            <CardHeader><CardTitle>Landing Page Content</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {editingTheme.id === 'chess_king' && (
                                    <div className="space-y-4">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="space-y-2"><Label>Playing Now Count</Label><Input value={editingTheme.landingPage.playingNow || ''} onChange={e => handleUpdateNestedThemeValue('landingPage', 'playingNow', e.target.value)} /></div>
                                            <div className="space-y-2"><Label>Games Today Count</Label><Input value={editingTheme.landingPage.gamesToday || ''} onChange={e => handleUpdateNestedThemeValue('landingPage', 'gamesToday', e.target.value)} /></div>
                                        </div>
                                        <Separator />
                                        <div className="space-y-2"><Label>Banner Image URL</Label><Input value={editingTheme.landingPage.heroImageUrl || ''} onChange={e => handleUpdateNestedThemeValue('landingPage', 'heroImageUrl', e.target.value)} /></div>
                                        <div className="space-y-2"><Label>Banner Title (use `\n` for new lines)</Label><Textarea value={editingTheme.landingPage.heroTitle || ''} onChange={e => handleUpdateNestedThemeValue('landingPage', 'heroTitle', e.target.value)} /></div>
                                        <div className="space-y-2">
                                            <Label>Banner Title Alignment</Label>
                                            <Select value={editingTheme.landingPage.heroTitleAlign || 'left'} onValueChange={(v) => handleUpdateNestedThemeValue('landingPage', 'heroTitleAlign', v)}>
                                                <SelectTrigger><SelectValue/></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="left">Left</SelectItem>
                                                    <SelectItem value="center">Center</SelectItem>
                                                    <SelectItem value="right">Right</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        
                                        <div className="space-y-4 border-t pt-4">
                                            <h3 className="text-lg font-semibold">Feature Sections</h3>
                                            {(editingTheme.landingPage.landingSections || []).map((section, index) => (
                                                <Card key={index} className="p-4 bg-muted/50">
                                                    <div className="flex justify-between items-center mb-2"><h4 className="font-semibold">Section {index + 1}</h4><Button variant="destructive" size="icon" onClick={() => handleRemoveLandingSection(index)}><Trash2 className="w-4 h-4" /></Button></div>
                                                    <div className="space-y-2">
                                                        <Label>Title</Label><Input value={section.title || ''} onChange={e => handleUpdateLandingSection(index, 'title', e.target.value)} />
                                                        <Label>Image URL</Label><Input value={section.image || ''} onChange={e => handleUpdateLandingSection(index, 'image', e.target.value)} />
                                                        <Label>Overlay Text</Label><Input value={section.overlayText || ''} onChange={e => handleUpdateLandingSection(index, 'overlayText', e.target.value)} />
                                                        <Label>AI Image Hint</Label><Input value={section.aiHint || ''} onChange={e => handleUpdateLandingSection(index, 'aiHint', e.target.value)} />
                                                        <Label>Button Text</Label><Input value={section.buttonText || ''} onChange={e => handleUpdateLandingSection(index, 'buttonText', e.target.value)} />
                                                        <Label>Button Link</Label><Input value={section.buttonLink || ''} onChange={e => handleUpdateLandingSection(index, 'buttonLink', e.target.value)} placeholder="e.g., /puzzles" />
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div><Label>Background Color</Label><Input type="color" value={section.borderColor || '#333333'} onChange={e => handleUpdateLandingSection(index, 'borderColor', e.target.value)} /></div>
                                                            <div><Label>Button Style</Label>
                                                                <Select value={section.buttonStyle || 'link'} onValueChange={(v) => handleUpdateLandingSection(index, 'buttonStyle', v)}>
                                                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="link">Link</SelectItem>
                                                                        <SelectItem value="box">Box</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                             <div><Label>Button Text Color</Label><Input type="color" value={section.buttonTextColor || '#FFFFFF'} onChange={e => handleUpdateLandingSection(index, 'buttonTextColor', e.target.value)} /></div>
                                                             <div><Label>Button Background</Label><Input type="color" value={section.buttonBgColor || '#4A5568'} onChange={e => handleUpdateLandingSection(index, 'buttonBgColor', e.target.value)} /></div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                            <Button variant="outline" onClick={handleAddLandingSection}><PlusCircle className="mr-2"/> Add Section</Button>
                                        </div>
                                    </div>
                                )}
                                {editingTheme.id === 'default' && (
                                     <div className="space-y-4">
                                        <div className="space-y-2"><Label>Background Image URL</Label><Input value={editingTheme.landingPage.bgImageUrl || ''} onChange={e => handleUpdateNestedThemeValue('landingPage', 'bgImageUrl', e.target.value)} /></div>
                                        <div className="space-y-2"><Label>Hero/Banner Image URL</Label><Input value={editingTheme.landingPage.heroImageUrl || ''} onChange={e => handleUpdateNestedThemeValue('landingPage', 'heroImageUrl', e.target.value)} /></div>
                                        <div className="space-y-2"><Label>Hero Title</Label><Textarea value={editingTheme.landingPage.heroTitle || ''} onChange={e => handleUpdateNestedThemeValue('landingPage', 'heroTitle', e.target.value)} /></div>
                                        <div className="space-y-2"><Label>Hero Subtitle</Label><Textarea value={editingTheme.landingPage.heroSubtitle || ''} onChange={e => handleUpdateNestedThemeValue('landingPage', 'heroSubtitle', e.target.value)} /></div>
                                        <div className="space-y-2"><Label>Download APK URL</Label><Input value={editingTheme.landingPage.apkUrl || ''} onChange={e => handleUpdateNestedThemeValue('landingPage', 'apkUrl', e.target.value)} placeholder="https://example.com/app.apk"/></div>
                                        <div className="space-y-2">
                                            <Label>Landing Page Features</Label>
                                            <div className="grid grid-cols-2 gap-4">
                                                {(editingTheme.landingPage.features || ['', '', '', '']).map((feature, index) => (<Input key={index} value={feature || ''} onChange={e => handleUpdateLandingFeature(index, e.target.value)}/>))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        
                        {/* Common Content Sections */}
                        <Card><CardHeader><CardTitle>About Us Content</CardTitle><CardDescription>Use markdown-style `## Title` for headings.</CardDescription></CardHeader><CardContent><Textarea value={editingTheme.aboutContent || ''} onChange={e => handleUpdateEditingTheme('aboutContent', e.target.value)} rows={10}/></CardContent></Card>
                        <Card><CardHeader><CardTitle>Join Marketing Team Content</CardTitle></CardHeader><CardContent><Textarea value={editingTheme.marketingContent || ''} onChange={e => handleUpdateEditingTheme('marketingContent', e.target.value)} rows={6}/></CardContent></Card>
                        <Card><CardHeader><CardTitle>Support Details</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2"><Label>Phone</Label><Input value={editingTheme.supportDetails?.phone || ''} onChange={e => handleUpdateNestedThemeValue('supportDetails', 'phone', e.target.value)} /></div>
                                <div className="space-y-2"><Label>WhatsApp (include country code, no +)</Label><Input value={editingTheme.supportDetails?.whatsapp || ''} onChange={e => handleUpdateNestedThemeValue('supportDetails', 'whatsapp', e.target.value)} /></div>
                                <div className="space-y-2"><Label>Telegram Username (without @)</Label><Input value={editingTheme.supportDetails?.telegram || ''} onChange={e => handleUpdateNestedThemeValue('supportDetails', 'telegram', e.target.value)} /></div>
                                <div className="space-y-2"><Label>Email</Label><Input value={editingTheme.supportDetails?.email || ''} onChange={e => handleUpdateNestedThemeValue('supportDetails', 'email', e.target.value)} /></div>
                            </CardContent>
                        </Card>
                         <Card><CardHeader><CardTitle>Terms & Conditions Content</CardTitle><CardDescription>Use markdown-style `## Title` for headings.</CardDescription></CardHeader><CardContent><Textarea value={editingTheme.termsContent || ''} onChange={e => handleUpdateEditingTheme('termsContent', e.target.value)} rows={10} /></CardContent></Card>
                    </CardContent>
                    <CardFooter className="gap-4">
                        <Button onClick={handleSaveThemeDetails} disabled={saving}>{saving ? <Loader2 className="animate-spin"/> : 'Save Changes'}</Button>
                        <Button variant="outline" onClick={() => setEditingTheme(null)}>Cancel</Button>
                    </CardFooter>
                    </ScrollArea>
                 </Card>
            )}
        </div>
    );
}
