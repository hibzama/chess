import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PendingWithdrawalsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Pending Withdrawals</CardTitle>
            </CardHeader>
            <CardContent>
                <p>This page will display a list of pending withdrawal requests for admin processing.</p>
            </CardContent>
        </Card>
    )
}
