import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function WithdrawalHistoryPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Withdrawal History</CardTitle>
            </CardHeader>
            <CardContent>
                <p>This page will display a history of all completed and rejected withdrawals.</p>
            </CardContent>
        </Card>
    )
}
