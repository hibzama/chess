
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const RegisterForm = dynamic(() => import('./register-form'), {
  ssr: false,
  loading: () => (
    <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <Skeleton className="h-8 w-24 mx-auto" />
            <Skeleton className="h-5 w-48 mx-auto mt-2" />
        </CardHeader>
        <CardContent className="grid gap-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </CardContent>
    </Card>
  )
});

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <RegisterForm />
    </div>
  );
}
