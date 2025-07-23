
'use client'
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';
import { formatTime } from '@/lib/time';
import { Skeleton } from '../ui/skeleton';

type PlayerInfoProps = {
  playerName: string;
  avatarSrc: string;
  isTurn: boolean;
  timeRemaining: number;
  'data-ai-hint': string;
};

export default function PlayerInfo({ playerName, avatarSrc, isTurn, timeRemaining, ...props }: PlayerInfoProps) {
  return (
    <Card className={cn(
      'transition-all',
      isTurn ? 'border-primary ring-2 ring-primary shadow-lg' : 'border-border'
    )}>
      <CardContent className="p-4 flex items-center gap-4">
        <Avatar className="h-16 w-16 border-2 border-primary/50">
          <AvatarImage src={avatarSrc} alt={playerName} {...props} />
          <AvatarFallback>{playerName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{playerName}</h3>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            {typeof timeRemaining === 'number' ? <span>{formatTime(timeRemaining)}</span> : <Skeleton className="w-16 h-4" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
