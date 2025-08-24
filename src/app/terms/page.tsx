
'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/context/theme-context";
import { Skeleton } from "@/components/ui/skeleton";

export default function TermsAndConditionsPage() {
    const { theme, loading } = useTheme();

    if (loading || !theme) {
        return (
             <div className="max-w-4xl mx-auto">
                 <div className="text-center mb-12">
                    <Skeleton className="h-10 w-1/2 mx-auto" />
                    <Skeleton className="h-5 w-1/4 mx-auto mt-2" />
                </div>
                <Card>
                    <CardContent className="p-8 space-y-6">
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-20 w-full" />
                         <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-20 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }
    
    const sections = theme.termsContent.split('## ').slice(1).map(section => {
        const [title, ...contentParts] = section.split('\n');
        return { title: title.trim(), content: contentParts.join('\n').trim() };
    });

    return (
        <div className="max-w-4xl mx-auto">
             <div className="text-center mb-12">
                <h1 className="text-4xl font-bold tracking-tight">Terms & Conditions</h1>
                <p className="text-muted-foreground mt-2">Last updated: [Date]</p>
            </div>
            
            <Card>
                <CardContent className="p-8 space-y-6">
                    {sections.map((section, index) => (
                         <div className="space-y-2" key={index}>
                            <h2 className="text-2xl font-semibold">{section.title}</h2>
                            <p className="text-muted-foreground whitespace-pre-line">
                                {section.content}
                            </p>
                        </div>
                    ))}
                    {sections.length === 0 && <p className="text-muted-foreground">{theme.termsContent}</p>}
                </CardContent>
            </Card>
        </div>
    )
}
