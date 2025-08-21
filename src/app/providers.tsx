
'use client';

import { AuthProvider as FirebaseAuthProvider } from '@/context/auth-context';
import { Toaster } from '@/components/ui/toaster';
import { TranslationProvider } from '@/context/translation-context';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <FirebaseAuthProvider>
            <TranslationProvider>
                {children}
                <Toaster />
            </TranslationProvider>
        </FirebaseAuthProvider>
    );
}
