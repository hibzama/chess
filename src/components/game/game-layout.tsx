import Link from 'next/link';
import { ArrowLeft, History, Users, Settings } from 'lucide-react';
import PlayerInfo from './player-info';
import MoveHistory from './move-history';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';

type GameLayoutProps = {
  children: React.ReactNode;
  gameType: 'Chess' | 'Checkers';
};

export default function GameLayout({ children, gameType }: GameLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 px-4 lg:px-6 h-16 flex items-center justify-between border-b bg-background/80 backdrop-blur-sm">
        <Link href="/dashboard" passHref>
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </Button>
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-primary">{gameType} Match</h1>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Game Settings</span>
            </Button>
        </div>
      </header>
      <main className="flex-1 w-full grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] xl:grid-cols-[320px_1fr_320px] gap-6 p-4 md:p-6">
        <aside className="hidden lg:flex flex-col gap-6">
            <PlayerInfo
              playerName="Player 1 (You)"
              avatarSrc="https://placehold.co/100x100.png"
              data-ai-hint="player avatar"
              isTurn={true}
            />
             <Card className="flex-1">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <History className="w-5 h-5"/>
                        Move History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <MoveHistory />
                </CardContent>
            </Card>
        </aside>

        <div className="flex items-center justify-center min-h-0">
            {children}
        </div>

        <aside className="hidden lg:flex flex-col gap-6">
            <PlayerInfo
              playerName="Opponent"
              avatarSrc="https://placehold.co/100x100.png"
              data-ai-hint="gamer portrait"
              isTurn={false}
            />
            <Card className="flex-1">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Spectators
                    </CardTitle>
                    <CardDescription>0 online</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">No spectators have joined yet.</p>
                </CardContent>
            </Card>
        </aside>
      </main>
    </div>
  );
}
