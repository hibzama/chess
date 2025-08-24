
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useTranslationSystem } from '@/context/translation-context';
import { translateText } from '@/ai/flows/translator-flow';

const translationsCache: Record<string, string> = {};

export function useTranslation(text: string | null | undefined): string {
    const { currentLang } = useTranslationSystem();
    const [translatedText, setTranslatedText] = useState(text || '');

    const translate = useCallback(async () => {
        if (!text || currentLang === 'en') {
            setTranslatedText(text || '');
            return;
        }

        const cacheKey = `${currentLang}::${text}`;
        if (translationsCache[cacheKey]) {
            setTranslatedText(translationsCache[cacheKey]);
            return;
        }

        try {
            const result = await translateText({ text, targetLang: currentLang });
            translationsCache[cacheKey] = result;
            setTranslatedText(result);
        } catch (error) {
            console.error('Translation failed:', error);
            setTranslatedText(text); // Fallback to original text on error
        }
    }, [text, currentLang]);

    useEffect(() => {
        translate();
    }, [translate]);
    
    return translatedText;
}
