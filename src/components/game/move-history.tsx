
'use client'
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGame } from '@/context/game-context';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { History } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function MoveHistory() {
  const { moveHistory } = useGame();
  const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);
  
  return (
    <Card className="flex-1 flex flex-col">
        <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5"/>
                Move History
            </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
            <ScrollArea className="h-48">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="w-1/4">#</TableHead>
                    <TableHead>White</TableHead>
                    <TableHead>Black</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isClient && moveHistory.length > 0 ? moveHistory.map((move, index) => (
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
        </CardContent>
    </Card>
  );
}
