
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
  avatarSrc?: string;
};

export default function PlayerInfo({ playerName, avatarSrc }: PlayerInfoProps) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <Avatar className="h-16 w-16 border-2 border-primary/50">
          <AvatarImage src={avatarSrc} alt={playerName} />
          <AvatarFallback>{playerName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-semibold text-lg truncate">{playerName}</h3>
        </div>
      </CardContent>
    </Card>
  );
}

    