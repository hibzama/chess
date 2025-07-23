'use client';

import { AuthProvider } from '@/components/auth-provider';
import { GameProvider } from '@/context/game-context';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <GameProvider>
                {children}
                <Toaster />
            </GameProvider>
        </AuthProvider>
    );
}
