import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Users, Sword } from 'lucide-react';

export default function LobbyPage() {
  const openGames = [
    { id: '1', type: 'Chess', player: 'Magnus', skill: 'Expert' },
    { id: '2', type: 'Checkers', player: 'CheckerKing', skill: 'Intermediate' },
    { id: '3', type: 'Chess', player: 'RookieRook', skill: 'Beginner' },
  ];

  const CheckersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-5 w-5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );

  const ChessIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-5 w-5">
      <path d="M18 8a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2Z"/>
      <path d="M18 14v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-2"/>
      <path d="M12 18v2"/>
      <path d="M12 6V4"/>
      <path d="M12 2v2"/>
    </svg>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Nexbattle</h1>
      </header>
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">Welcome to the Arena</h2>
          <p className="max-w-2xl mx-auto text-muted-foreground md:text-lg">
            Challenge players from around the world in classic games of strategy.
            Choose your game and find an opponent.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sword className="w-6 h-6 text-primary" />
                Quick Match
              </CardTitle>
              <CardDescription>Start a new game against a random opponent.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Link href="/game/chess" passHref>
                <Button size="lg" className="w-full">
                  <ChessIcon /> Play Chess
                </Button>
              </Link>
              <Link href="/game/checkers" passHref>
                <Button size="lg" variant="secondary" className="w-full">
                  <CheckersIcon />
                  Play Checkers
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Open Games
              </CardTitle>
              <CardDescription>Join a game created by another player.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Game</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Skill Level</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openGames.map((game) => (
                    <TableRow key={game.id}>
                      <TableCell className="font-medium">{game.type}</TableCell>
                      <TableCell>{game.player}</TableCell>
                      <TableCell>{game.skill}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">Join</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Card className="lg:col-span-3">
             <CardHeader>
                <CardTitle>Challenge a Friend</CardTitle>
                <CardDescription>Enter your friend's game ID to challenge them directly.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex w-full items-center space-x-2">
                    <Input type="text" placeholder="Friend's Game ID" />
                    <Button type="submit">Challenge</Button>
                </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
