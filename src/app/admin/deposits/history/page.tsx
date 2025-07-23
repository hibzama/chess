import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DepositHistoryPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Deposit History</CardTitle>
            </CardHeader>
            <CardContent>
                <p>This page will display a history of all approved and rejected deposits.</p>
            </CardContent>
        </Card>
    )
}
