
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
    imageWidth?: number;
    imageHeight?: number;
    padding?: number;
}

interface ThemeColors {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    input: string;
    ring: string;
}

const defaultColors: ThemeColors = {
    background: "260 69% 8%",
    foreground: "257 20% 90%",
    card: "260 69% 12%",
    cardForeground: "257 20% 90%",
    popover: "260 69% 7%",
    popoverForeground: "257 20% 90%",
    primary: "326 100% 60%",
    primaryForeground: "257 20% 90%",
    secondary: "257 41% 20%",
    secondaryForeground: "257 20% 90%",
    muted: "257 41% 20%",
    mutedForeground: "257 20% 65%",
    accent: "326 100% 60%",
    accentForeground: "257 20% 90%",
    destructive: "0 100% 67%",
    destructiveForeground: "0 0% 98%",
    border: "257 41% 20%",
    input: "257 41% 20%",
    ring: "326 100% 60%",
};

const chessKingDraftColors: ThemeColors = {
    background: "25 35% 15%",
    foreground: "35 33% 88%",
    card: "25 35% 18%",
    cardForeground: "35 33% 88%",
    popover: "25 35% 12%",
    popoverForeground: "35 33% 88%",
    primary: "95 38% 48%",
    primaryForeground: "35 33% 98%",
    secondary: "25 25% 25%",
    secondaryForeground: "35 33% 90%",
    muted: "25 25% 25%",
    mutedForeground: "35 20% 65%",
    accent: "95 38% 48%",
    accentForeground: "35 33% 98%",
    destructive: "0 63% 40%",
    destructiveForeground: "35 33% 98%",
    border: "25 30% 30%",
    input: "25 30% 30%",
    ring: "95 38% 48%",
};


const defaultThemeData: Theme = {
    id: 'default',
    name: 'Default',
    logoUrl: '',
    landingPage: {
        bgImageUrl: "https://allnews.ltd/wp-content/uploads/2025/07/futuristic-video-game-controller-background-with-text-space_1017-54730.avif",
        heroImageUrl: "https://i.postimg.cc/CL41DGdt/video-game-controller-with-bright-neon-light-streaks-computer-gamer-background-3d-octane-render-game.jpg",
        heroTitle: "Your Skill is Your Investment",
        heroSubtitle: "Your earnings are unlimited and have no restrictions. Promote Nexbattle and start increasing your earnings today!",
        apkUrl: "#",
        features: [
            "High Conversion",
            "Profitable Commission",
            "Real-Time Statistics",
            "Marketing Support"
        ],
        landingSections: [],
        playingNow: '0',
        gamesToday: '0',
    },
    aboutContent: `## Our Mission\nNexbattle is the ultimate online arena where strategy, skill, and stakes collide. We provide a secure and engaging platform for Chess and Checkers enthusiasts to compete for real rewards, fostering a global community of strategic thinkers.\n\n## Multiplayer Rules & Payouts\nIn Multiplayer Mode, your wager is your investment. A standard win earns you a 180% return. A draw results in a 90% refund. If you resign, you get a 75% refund, while your opponent gets a 105% payout.`,
    supportDetails: {
        phone: "+94704894587",
        whatsapp: "94704894587",
        telegram: "nexbattle_help",
        email: "nexbattlehelp@gmail.com",
    },
    termsContent: `## 1. Introduction\nWelcome to Nexbattle. These are the terms and conditions governing your access to and use of the website Nexbattle... (Placeholder text)`,
    marketingContent: `Our Marketing Partner Program unlocks a powerful 20-level deep referral network. As a marketer, you earn a 3% commission from every game played by a vast network of players, creating a significant passive income stream.\n\nIf you are a community builder with a vision for growth, we want you on our team. Apply now to get started.`,
    colors: defaultColors,
};

// Function to initialize themes in Firestore if they don't exist
const initializeThemes = async () => {
    const themes = {
        'default': defaultThemeData,
        'chess_king': {
            ...defaultThemeData,
            id: 'chess_king',
            name: 'Chess King',
            logoUrl: 'https://i.ibb.co/L0xJ0Pj/chess-king-logo.png',
            landingPage: {
                ...defaultThemeData.landingPage,
                bgImageUrl: '', // Not used in the same way
                heroImageUrl: 'https://i.postimg.cc/d3F9zdbb/index-illustration-9d2cb1c3-2x.png',
                heroTitle: 'Play chess.\nImprove your game.\nHave fun!',
                heroTitleAlign: 'left',
                heroSubtitle: '', // Not used
                playingNow: '168,623',
                gamesToday: '19,057,572',
                landingSections: [
                    { title: "Play vs Computer", buttonText: "Play vs Computer", image: "https://i.postimg.cc/44N8XfW6/index-computervs-1f9f5a6b-2x.png", aiHint: "chess computer", overlayText: "Play against a powerful engine", borderColor: "#262421", buttonStyle: "box", buttonTextColor: "#FFFFFF", buttonBgColor: "#4A5568", imageWidth: 500, imageHeight: 500, padding: 24, },
                    { title: "Multiplayer System", buttonText: "Play Online", image: "https://i.postimg.cc/Qx7p6M2P/index-play-friend-2e3d362e-2x.png", aiHint: "chess world", overlayText: "Challenge players from around the globe", borderColor: "#262421", buttonStyle: "box", buttonTextColor: "#FFFFFF", buttonBgColor: "#4a5568", imageWidth: 500, imageHeight: 500, padding: 24, },
                ]
            },
            colors: chessKingDraftColors,
        }
    };

    for (const [themeId, themeData] of Object.entries(themes)) {
        const themeRef = doc(db, 'themes', themeId);
        const themeSnap = await getDoc(themeRef);
        if (!themeSnap.exists()) {
            await setDoc(themeRef, themeData);
        }
    }
    
    const siteConfigRef = doc(db, 'settings', 'siteConfig');
    const configSnap = await getDoc(siteConfigRef);
    if (!configSnap.exists()) {
        await setDoc(siteConfigRef, { activeThemeId: 'default' });
    }
};

initializeThemes();

const HSLToHex = (h: number, s: number, l: number): string => {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return `#${[0, 8, 4].map(n => Math.round(f(n) * 255).toString(16).padStart(2, '0')).join('')}`;
};

const HexToHSL = (hex: string): string => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);
    return `${h} ${s}% ${l}%`;
};

const HSLStringToHex = (hslString: string): string => {
    const parts = hslString.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
    if (!parts) return '#000000';
    return HSLToHex(parseInt(parts[1]), parseInt(parts[2]), parseInt(parts[3]));
}

interface Theme {
    id: string;
    name: string;
    logoUrl?: string;
    colors: ThemeColors;
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
    const [colorPalette, setColorPalette] = useState('custom');
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
            imageWidth: 500,
            imageHeight: 500,
            padding: 24,
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
    
    const handlePaletteChange = (palette: string) => {
        setColorPalette(palette);
        if (palette === 'draft') {
            handleUpdateEditingTheme('colors', chessKingDraftColors);
        }
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
                background: "260 69% 8%",
                foreground: "257 20% 90%",
                card: "260 69% 12%",
                cardForeground: "257 20% 90%",
                popover: "260 69% 7%",
                popoverForeground: "257 20% 90%",
                primary: "326 100% 60%",
                primaryForeground: "257 20% 90%",
                secondary: "257 41% 20%",
                secondaryForeground: "257 20% 90%",
                muted: "257 41% 20%",
                mutedForeground: "257 20% 65%",
                accent: "326 100% 60%",
                accentForeground: "257 20% 90%",
                destructive: "0 100% 67%",
                destructiveForeground: "0 0% 98%",
                border: "257 41% 20%",
                input: "257 41% 20%",
                ring: "326 100% 60%",
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
    
    const colorFields: { key: keyof ThemeColors, label: string }[] = [
        { key: 'primary', label: 'Primary' },
        { key: 'primaryForeground', label: 'Primary Foreground' },
        { key: 'secondary', label: 'Secondary' },
        { key: 'secondaryForeground', label: 'Secondary Foreground' },
        { key: 'accent', label: 'Accent' },
        { key: 'accentForeground', label: 'Accent Foreground' },
        { key: 'destructive', label: 'Destructive' },
        { key: 'destructiveForeground', label: 'Destructive Foreground' },
        { key: 'background', label: 'Background' },
        { key: 'foreground', label: 'Foreground' },
        { key: 'card', label: 'Card' },
        { key: 'cardForeground', label: 'Card Foreground' },
        { key: 'popover', label: 'Popover' },
        { key: 'popoverForeground', label: 'Popover Foreground' },
        { key: 'muted', label: 'Muted' },
        { key: 'mutedForeground', label: 'Muted Foreground' },
        { key: 'border', label: 'Border' },
        { key: 'input', label: 'Input' },
        { key: 'ring', label: 'Ring' },
    ];

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
                                    <CardHeader><CardTitle>Theme Colors</CardTitle><CardDescription>Click the color box to open the picker. The HSL value will update automatically.</CardDescription></CardHeader>
                                    <CardContent className="space-y-4">
                                        {editingTheme.id === 'chess_king' && (
                                            <div className="space-y-2">
                                                <Label>Color Palette</Label>
                                                <Select value={colorPalette} onValueChange={handlePaletteChange}>
                                                    <SelectTrigger className="w-full md:w-1/3">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="custom">Custom</SelectItem>
                                                        <SelectItem value="draft">Draft Theme</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                        <div className="grid md:grid-cols-3 gap-4">
                                            {colorFields.map(field => (
                                                <div key={field.key} className="space-y-2">
                                                    <Label>{field.label}</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Input 
                                                            type="color" 
                                                            className="w-10 h-10 p-1"
                                                            value={HSLStringToHex(editingTheme.colors?.[field.key] || '0 0% 0%')} 
                                                            onChange={e => { handleUpdateNestedThemeValue('colors', field.key, HexToHSL(e.target.value)); setColorPalette('custom'); }} 
                                                        />
                                                        <Input 
                                                            value={editingTheme.colors?.[field.key] || ''} 
                                                            onChange={e => { handleUpdateNestedThemeValue('colors', field.key, e.target.value); setColorPalette('custom'); }} 
                                                            placeholder="e.g., 210 40% 96.1%"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
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
                                                        <div className="grid grid-cols-3 gap-4">
                                                            <div><Label>Image Width (px)</Label><Input type="number" value={section.imageWidth || 500} onChange={e => handleUpdateLandingSection(index, 'imageWidth', Number(e.target.value))} /></div>
                                                            <div><Label>Image Height (px)</Label><Input type="number" value={section.imageHeight || 500} onChange={e => handleUpdateLandingSection(index, 'imageHeight', Number(e.target.value))} /></div>
                                                            <div><Label>Padding (px)</Label><Input type="number" value={section.padding ?? 24} onChange={e => handleUpdateLandingSection(index, 'padding', Number(e.target.value))} /></div>
                                                        </div>
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
