
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Download, Loader2 } from 'lucide-react';
import { BonusCard } from './bonus-card';
import { useState } from 'react';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';

const Logo = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-16 h-16 text-primary"
    >
      <path
        fillRule="evenodd"
        d="M12.96 2.544a3 3 0 00-1.92 0L8.14 4.167a1.5 1.5 0 01-1.39.07l-3.03-1.684a1.5 1.5 0 00-1.74 2.29l1.684 3.03a1.5 1.5 0 01-.07 1.39L3.02 12.86a3 3 0 000 1.92l1.623 2.9a1.5 1.5 0 01.07 1.39l-1.684 3.03a1.5 1.5 0 002.29 1.74l3.03-1.684a1.5 1.5 0 011.39.07l2.9 1.623a3 3 0 001.92 0l2.9-1.623a1.5 1.5 0 011.39-.07l3.03 1.684a1.5 1.5 0 001.74-2.29l-1.684-3.03a1.5 1.5 0 01.07-1.39l1.623-2.9a3 3 0 000-1.92l-1.623-2.9a1.5 1.5 0 01-.07-1.39l1.684-3.03a1.5 1.5 0 00-2.29-1.74l-3.03 1.684a1.5 1.5 0 01-1.39-.07l-2.9-1.623z"
        clipRule="evenodd"
      />
    </svg>
  );


export default function LandingPage() {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const storage = getStorage();
      const apkRef = ref(storage, 'Nexbattle (1).apk');
      const url = await getDownloadURL(apkRef);

      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Nexbattle.apk'); 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download Started",
        description: "Your download will begin shortly.",
      });

    } catch (error: any) {
      console.error("Error downloading APK:", error);
       toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Could not find the APK file. Please contact support.",
      });
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <div className="mb-8">
          <Logo />
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-4">
          Nexbattle
        </h1>
        <p className="max-w-2xl mx-auto text-muted-foreground md:text-lg mb-12">
          Welcome to the ultimate strategy gaming experience. Where your skill meets your investment. Log in or register to continue your journey.
        </p>

        <div className="w-full max-w-md mx-auto space-y-8">
          <BonusCard />
          
          <div className="flex items-center justify-center gap-4">
            <Link href="/login" passHref>
              <Button size="lg" className="px-12 bg-gradient-to-r from-primary to-purple-600">Login</Button>
            </Link>
            <Link href="/register" passHref>
              <Button size="lg" variant="outline" className="px-12">Register</Button>
            </Link>
          </div>
          

          <Card className="bg-card/50 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-center gap-2">
                <Trophy className="w-6 h-6 text-primary" />
                Join the Marketing Team
              </CardTitle>
              <CardDescription>Are you an influencer? Apply to join our exclusive marketing team.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/marketing/register">Apply Now</Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-center gap-2">
                <Download className="w-6 h-6 text-accent" />
                Download for Android
              </CardTitle>
              <CardDescription>Get the best experience with our dedicated mobile app.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleDownload} disabled={isDownloading} className="w-full bg-accent hover:bg-accent/90">
                {isDownloading ? <Loader2 className="animate-spin" /> : 'Download APK'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">You may need to "Allow from this source" in your phone's settings to install the app.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
