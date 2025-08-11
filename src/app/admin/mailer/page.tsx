
'use client';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { Mail, AlertTriangle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function MailerPage() {
    const { toast } = useToast();

    const handleSendEmail = async () => {
        toast({
            variant: 'destructive',
            title: 'Feature Disabled',
            description: 'The mailer feature is temporarily disabled due to a deployment issue. Please try again later.',
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail /> Custom Mailer</CardTitle>
                <CardDescription>
                    This feature is temporarily disabled.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Feature Currently Unavailable</AlertTitle>
                  <AlertDescription>
                    The bulk email feature is undergoing maintenance to resolve a deployment issue. We apologize for the inconvenience and are working to bring it back online as soon as possible.
                  </AlertDescription>
                </Alert>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSendEmail} disabled={true} className="w-full">
                    Send Email
                </Button>
            </CardFooter>
        </Card>
    );
}
