import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const moves = [
  { turn: 1, white: 'e4', black: 'e5' },
  { turn: 2, white: 'Nf3', black: 'Nc6' },
  { turn: 3, white: 'Bb5', black: 'a6' },
  { turn: 4, white: 'Ba4', black: 'Nf6' },
  { turn: 5, white: 'O-O', black: 'Be7' },
  { turn: 6, white: 'Re1', black: 'b5' },
  { turn: 7, white: 'Bb3', black: 'd6' },
  { turn: 8, white: 'c3', black: 'O-O' },
  { turn: 9, white: 'h3', black: 'Nb8' },
];

export default function MoveHistory() {
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
          {moves.map((move) => (
            <TableRow key={move.turn}>
              <TableCell className="font-medium">{move.turn}</TableCell>
              <TableCell>{move.white}</TableCell>
              <TableCell>{move.black}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
