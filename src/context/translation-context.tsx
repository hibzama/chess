
'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface Language {
    id: string;
    code: string;
    name: string;
}

interface TranslationContextType {
    languages: Language[];
    currentLang: string;
    changeLanguage: (langCode: string) => void;
    loading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
    const [languages, setLanguages] = useState<Language[]>([]);
    const [currentLang, setCurrentLang] = useState('en');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLanguages = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'languages'));
                const langData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Language));
                // Ensure English is always first and present
                const english = { id: 'en_default', code: 'en', name: 'English' };
                const otherLangs = langData.filter(l => l.code !== 'en');
                setLanguages([english, ...otherLangs]);
            } catch (error) {
                console.error("Failed to fetch languages, defaulting to English.", error);
                setLanguages([{ id: 'en_default', code: 'en', name: 'English' }]);
            } finally {
                setLoading(false);
            }
        };
        
        fetchLanguages();

        const savedLang = localStorage.getItem('appLanguage');
        if (savedLang) {
            setCurrentLang(savedLang);
        }

    }, []);

    const changeLanguage = useCallback((langCode: string) => {
        setCurrentLang(langCode);
        localStorage.setItem('appLanguage', langCode);
        window.location.reload(); // Simple way to force re-fetch of translations
    }, []);

    return (
        <TranslationContext.Provider value={{ languages, currentLang, changeLanguage, loading }}>
            {children}
        </TranslationContext.Provider>
    );
};

export const useTranslationSystem = () => {
    const context = useContext(TranslationContext);
    if (context === undefined) {
        throw new Error('useTranslationSystem must be used within a TranslationProvider');
    }
    return context;
};
