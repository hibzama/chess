'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { ChessPiece, Crown } from 'lucide-react';

type GameType = 'chess' | 'checkers';
type PlayerColor = 'white' | 'black' | 'red';
type TimeLimit = '5' | '10' | '15';

export default function PracticePage() {
    const [selectedGame, setSelectedGame] = useState<GameType>('chess');
    const [playerColor, setPlayerColor] = useState<PlayerColor>('white');
    const [timeLimit, setTimeLimit] = useState<TimeLimit>('10');
    const router = useRouter();

    const handleStartGame = () => {
        // For now, this just navigates to the corresponding game page.
        // Logic for passing game settings will be added later.
        router.push(`/game/${selectedGame}`);
    };
    
    const handleGameSelection = (game: GameType) => {
        setSelectedGame(game);
        if(game === 'checkers') {
            setPlayerColor('red');
        } else {
            setPlayerColor('white');
        }
    }

    const gameOptions = [
        { id: 'chess', name: 'Chess', icon: <ChessPiece className="w-16 h-16" /> },
        { id: 'checkers', name: 'Checkers', icon: <Crown className="w-16 h-16" /> }
    ];

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2">Practice Mode</h1>
        <p className="text-muted-foreground md:text-lg">
          Hone your skills against our bot. It's free!
        </p>
      </div>

        <Card className="w-full max-w-4xl">
            <CardHeader>
                <CardTitle>Game Setup</CardTitle>
                <CardDescription>Choose your game and configure the match settings.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Game Selection */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">1. Choose your game</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {gameOptions.map((game) => (
                                <Card
                                key={game.id}
                                className={`p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${selectedGame === game.id ? 'ring-2 ring-primary' : 'hover:bg-primary/5'}`}
                                onClick={() => handleGameSelection(game.id as GameType)}
                                >
                                    {game.icon}
                                    <span className="font-semibold">{game.name}</span>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Game Configuration */}
                    <div className="space-y-6">
                        <div className="space-y-4">
                             <h3 className="text-lg font-medium">2. Your Color</h3>
                             <RadioGroup value={playerColor} onValueChange={(value) => setPlayerColor(value as PlayerColor)}>
                                {selectedGame === 'chess' ? (
                                    <>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="white" id="white" />
                                        <Label htmlFor="white">White</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="black" id="black" />
                                        <Label htmlFor="black">Black</Label>
                                    </div>
                                    </>
                                ) : (
                                    <>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="red" id="red" />
                                        <Label htmlFor="red">Red</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="black" id="black" />
                                        <Label htmlFor="black">Black</Label>
                                    </div>
                                    </>
                                )}
                             </RadioGroup>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">3. Time Limit</h3>
                            <Select value={timeLimit} onValueChange={(value) => setTimeLimit(value as TimeLimit)}>
                                <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                                <SelectContent>
                                <SelectItem value="5">5 minutes</SelectItem>
                                <SelectItem value="10">10 minutes</SelectItem>
                                <SelectItem value="15">15 minutes</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">4. Your Equipment (Coming Soon)</h3>
                            <p className="text-sm text-muted-foreground">Custom board and piece styles will be available here.</p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t">
                    <Button size="lg" className="w-full" onClick={handleStartGame}>
                        Start Practice Game
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
