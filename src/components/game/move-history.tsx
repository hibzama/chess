
'use client'
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGame } from '@/context/game-context';

export default function MoveHistory() {
  const { moveHistory } = useGame();
  
  return (
    <ScrollArea className="h-64 xl:h-96">
      <Table>
        <TableHeader className="sticky top-0 bg-card">
          <TableRow>
            <TableHead className="w-1/4">#</TableHead>
            <TableHead>White</TableHead>
            <TableHead>Black</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {moveHistory.length > 0 ? moveHistory.map((move) => (
            <TableRow key={move.turn}>
              <TableCell className="font-medium">{move.turn}</TableCell>
              <TableCell>{move.white}</TableCell>
              <TableCell>{move.black}</TableCell>
            </TableRow>
          )) : (
            <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">No moves yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
