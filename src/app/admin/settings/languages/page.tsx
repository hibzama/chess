
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Loader2, Languages, HelpCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

export interface Language {
    id: string;
    code: string;
    name: string;
}

export default function LanguageSettingsPage() {
    const [languages, setLanguages] = useState<Language[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newLangCode, setNewLangCode] = useState('');
    const [newLangName, setNewLangName] = useState('');
    const { toast } = useToast();

    const fetchLanguages = async () => {
        setLoading(true);
        const snapshot = await getDocs(collection(db, 'languages'));
        const langData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Language));
        setLanguages(langData);
        setLoading(false);
    };

    useEffect(() => {
        fetchLanguages();
    }, []);

    const handleAddLanguage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLangCode || !newLangName) {
            toast({ variant: "destructive", title: "Error", description: "Please provide both a language code and a name." });
            return;
        }
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'languages'), {
                code: newLangCode,
                name: newLangName,
                createdAt: serverTimestamp()
            });
            toast({ title: "Success", description: "Language added successfully." });
            setNewLangCode('');
            setNewLangName('');
            fetchLanguages();
        } catch (error) {
            console.error("Error adding language:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to add language. Check Firestore rules." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (langId: string) => {
        try {
            await deleteDoc(doc(db, 'languages', langId));
            toast({ title: 'Language Removed', description: 'The language has been deleted.' });
            fetchLanguages();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete language.' });
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><PlusCircle /> Add New Language</CardTitle>
                        <CardDescription>Add a new language option for your users.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleAddLanguage}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="lang-code">Language Code (e.g., en, es, si)</Label>
                                <Input id="lang-code" value={newLangCode} onChange={(e) => setNewLangCode(e.target.value)} placeholder="si" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lang-name">Language Name</Label>
                                <Input id="lang-name" value={newLangName} onChange={(e) => setNewLangName(e.target.value)} placeholder="Sinhala" required />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Add Language'}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><HelpCircle /> Need Help?</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CardDescription>
                            Not sure which language code to use? Check our list of supported languages for easy reference.
                        </CardDescription>
                        <Button asChild variant="outline" className="w-full mt-4">
                             <Link href="/admin/settings/languages/supported">View Supported Languages</Link>
                        </Button>
                    </CardContent>
                 </Card>
            </div>
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Languages /> Supported Languages</CardTitle>
                        <CardDescription>The list of languages available to your users.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Code</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {languages.map(lang => (
                                        <TableRow key={lang.id}>
                                            <TableCell className="font-medium">{lang.name}</TableCell>
                                            <TableCell>{lang.code}</TableCell>
                                            <TableCell className="text-right">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button size="sm" variant="destructive" disabled={lang.code === 'en'}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(lang.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
