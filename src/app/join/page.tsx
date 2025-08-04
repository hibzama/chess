
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
)

export default function JoinPage() {
    // Replace this with your actual WhatsApp group link
    const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/EJFHx4y9n9EDstQ971Bvf5?mode=ac_t";

    return (
        <div className="relative flex items-center justify-center min-h-screen w-full bg-background text-white p-4">
            <div className="absolute inset-0 z-0 opacity-40">
                <Image
                    src="https://allnews.ltd/wp-content/uploads/2025/07/video-game-controller-with-bright-neon-light-streaks-computer-gamer-background-3d-octane-render-game-concept-ideas-ai-generative-free-photo.jpg"
                    alt="Gaming background"
                    fill
                    className="object-cover"
                    data-ai-hint="neon gamepad"
                    priority
                />
            </div>
            <div className="absolute inset-0 z-10 bg-black/70" />

            <Card className="w-full max-w-md z-20 text-center bg-card/50 border-primary/30 animate-in fade-in-50 zoom-in-95">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold tracking-tight text-primary">You're Invited!</CardTitle>
                    <CardDescription className="text-lg text-muted-foreground pt-2">Join the Nexbattle Player Community</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-foreground/90">
                        You've found the hub for Sri Lanka's most competitive minds. Join our official WhatsApp group to find opponents, discuss strategy, and be the first to know about exclusive tournaments and rewards.
                    </p>
                    <div className="p-4 bg-primary/10 rounded-lg">
                        <h3 className="font-semibold text-lg">Your Next Battle Awaits.</h3>
                        <p className="text-sm text-muted-foreground">Are you ready to prove your skill?</p>
                    </div>
                     <Button 
                        asChild 
                        size="lg" 
                        className="w-full bg-green-500 hover:bg-green-600 text-white animate-pulse"
                        style={{animationDuration: '3s'}}
                    >
                        <a href={WHATSAPP_GROUP_LINK} target="_blank" rel="noopener noreferrer">
                            <WhatsAppIcon className="mr-2 h-6 w-6"/>
                            Join the WhatsApp Group
                        </a>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
