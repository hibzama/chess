
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This page is a fallback to resolve a build issue.
// It immediately redirects to the correct page for managing task campaigns.
export default function TaskClaimsRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/tasks');
    }, [router]);

    return (
        <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Redirecting to Task Campaigns...</p>
            </div>
        </div>
    );
}
