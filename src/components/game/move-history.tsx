
'use client'
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGame } from '@/context/game-context';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { History } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function MoveHistory() {
  const { moveHistory, isMounted } = useGame();
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollViewportRef.current) {
        const { scrollHeight } = scrollViewportRef.current;
        scrollViewportRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' });
    }
  }, [moveHistory.length]);
  
  return (
    <Card className="flex flex-col flex-1">
        <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5"/>
                Move History
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 relative">
          <div className="absolute inset-0">
            <ScrollArea className="h-full w-full" viewportRef={scrollViewportRef}>
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-1/4">#</TableHead>
                    <TableHead>White</TableHead>
                    <TableHead>Black</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isMounted && moveHistory.length > 0 ? moveHistory.map((move, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{move.turn}</TableCell>
                      <TableCell>{move.white}</TableCell>
                      <TableCell>{move.black}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground pt-8">No moves yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
    </Card>
  );
}
