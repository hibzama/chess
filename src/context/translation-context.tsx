
'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { LanguageDirection } from '@/app/admin/settings/languages/page';

interface Language {
    id: string;
    code: string;
    name: string;
    direction?: LanguageDirection;
}

interface TranslationContextType {
    languages: Language[];
    currentLang: string;
    textDirection: 'ltr' | 'rtl';
    layoutDirection: 'ltr' | 'rtl';
    changeLanguage: (langCode: string) => void;
    loading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
    const [languages, setLanguages] = useState<Language[]>([]);
    const [currentLang, setCurrentLang] = useState('en');
    const [textDirection, setTextDirection] = useState<'ltr' | 'rtl'>('ltr');
    const [layoutDirection, setLayoutDirection] = useState<'ltr' | 'rtl'>('ltr');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLanguages = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'languages'));
                const langData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Language));
                const english: Language = { id: 'en_default', code: 'en', name: 'English', direction: 'ltr' };
                const otherLangs = langData.filter(l => l.code !== 'en');
                const allLangs = [english, ...otherLangs];
                setLanguages(allLangs);

                const savedLangCode = localStorage.getItem('appLanguage') || 'en';
                const savedLang = allLangs.find(l => l.code === savedLangCode) || english;
                setCurrentLang(savedLang.code);
                
                const direction = savedLang.direction || 'ltr';
                setTextDirection(direction.startsWith('rtl') ? 'rtl' : 'ltr');
                setLayoutDirection(direction === 'rtl-full' ? 'rtl' : 'ltr');

            } catch (error) {
                console.error("Failed to fetch languages, defaulting to English.", error);
                setLanguages([{ id: 'en_default', code: 'en', name: 'English', direction: 'ltr' }]);
                setTextDirection('ltr');
                setLayoutDirection('ltr');
            } finally {
                setLoading(false);
            }
        };
        
        fetchLanguages();

    }, []);

    const changeLanguage = useCallback((langCode: string) => {
        const selectedLang = languages.find(l => l.code === langCode);
        if (selectedLang) {
            const direction = selectedLang.direction || 'ltr';
            setCurrentLang(selectedLang.code);
            setTextDirection(direction.startsWith('rtl') ? 'rtl' : 'ltr');
            setLayoutDirection(direction === 'rtl-full' ? 'rtl' : 'ltr');
            localStorage.setItem('appLanguage', selectedLang.code);
            window.location.reload(); 
        }
    }, [languages]);

    return (
        <TranslationContext.Provider value={{ languages, currentLang, textDirection, layoutDirection, changeLanguage, loading }}>
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
