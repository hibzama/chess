
'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, collection, setDoc } from 'firebase/firestore';

interface LandingSection {
    title: string;
    buttonText: string;
    buttonLink?: string;
    image: string;
    aiHint?: string;
    overlayText?: string;
    borderColor?: string; // Will be used as background color for the section box
    buttonStyle?: 'link' | 'box';
    buttonTextColor?: string;
    buttonBgColor?: string; // New field for button background
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

interface ThemeContextType {
    theme: Theme | null;
    loading: boolean;
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
            colors: defaultColors,
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


const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setTheme] = useState<Theme | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const configRef = doc(db, 'settings', 'siteConfig');
        
        const unsubscribe = onSnapshot(configRef, async (configSnap) => {
            const activeThemeId = configSnap.exists() ? configSnap.data().activeThemeId : 'default';
            
            const themeRef = doc(db, 'themes', activeThemeId);
            const themeSnap = await getDoc(themeRef);

            if (themeSnap.exists()) {
                const themeData = { id: themeSnap.id, ...themeSnap.data() } as Theme;
                // Ensure colors object exists and has all keys, merging with defaults
                themeData.colors = { ...defaultColors, ...themeData.colors };
                setTheme(themeData);
            } else {
                setTheme(defaultThemeData); // Fallback to default
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching theme config:", error);
            setTheme(defaultThemeData); // Fallback on error
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, loading }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
