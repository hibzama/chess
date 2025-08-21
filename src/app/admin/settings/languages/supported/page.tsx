
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

const supportedLanguages = [
  { name: "Afrikaans", code: "af", nativeName: "Afrikaans" },
  { name: "Arabic", code: "ar", nativeName: "العربية" },
  { name: "Bengali", code: "bn", nativeName: "বাংলা" },
  { name: "Chinese (Simplified)", code: "zh", nativeName: "中文 (简体)" },
  { name: "English", code: "en", nativeName: "English" },
  { name: "French", code: "fr", nativeName: "Français" },
  { name: "German", code: "de", nativeName: "Deutsch" },
  { name: "Hindi", code: "hi", nativeName: "हिन्दी" },
  { name: "Indonesian", code: "id", nativeName: "Bahasa Indonesia" },
  { name: "Italian", code: "it", nativeName: "Italiano" },
  { name: "Japanese", code: "ja", nativeName: "日本語" },
  { name: "Korean", code: "ko", nativeName: "한국어" },
  { name: "Malay", code: "ms", nativeName: "Bahasa Melayu" },
  { name: "Portuguese", code: "pt", nativeName: "Português" },
  { name: "Russian", code: "ru", nativeName: "Русский" },
  { name: "Sinhala", code: "si", nativeName: "සිංහල" },
  { name: "Spanish", code: "es", nativeName: "Español" },
  { name: "Tamil", code: "ta", nativeName: "தமிழ்" },
  { name: "Thai", code: "th", nativeName: "ไทย" },
  { name: "Turkish", code: "tr", nativeName: "Türkçe" },
  { name: "Urdu", code: "ur", nativeName: "اردو" },
  { name: "Vietnamese", code: "vi", nativeName: "Tiếng Việt" },
];

export default function SupportedLanguagesPage() {
    const { toast } = useToast();

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied!", description: `${text} copied to clipboard.` });
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Supported Languages</CardTitle>
                    <CardDescription>A list of common languages supported by the AI translation service.</CardDescription>
                </div>
                <Button asChild><Link href="/admin/settings/languages">Back to Language Settings</Link></Button>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Language</TableHead>
                                <TableHead>Native Name</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {supportedLanguages.map(lang => (
                                <TableRow key={lang.code}>
                                    <TableCell className="font-medium">{lang.name}</TableCell>
                                    <TableCell>{lang.nativeName}</TableCell>
                                    <TableCell className="font-mono">{lang.code}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleCopy(lang.code)}>
                                            <Copy className="w-4 h-4"/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
