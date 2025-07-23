import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PendingDepositsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Pending Deposits</CardTitle>
            </CardHeader>
            <CardContent>
                <p>This page will display a list of pending deposit requests for admin approval.</p>
            </CardContent>
        </Card>
    )
}
