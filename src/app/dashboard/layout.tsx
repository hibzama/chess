
'use client'
import MainLayout from "@/components/layout/main-layout";
import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Award, Loader2 } from "lucide-react";


function CampaignTaskCompletion() {
    const { user, userData } = useAuth();
    const [campaign, setCampaign] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [answer, setAnswer] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!userData?.campaignInfo || userData.campaignInfo.taskCompleted) {
            setLoading(false);
            return;
        }

        const fetchCampaign = async () => {
            const campaignDoc = await getDoc(doc(db, 'referral_campaigns', userData.campaignInfo.campaignId));
            if (campaignDoc.exists()) {
                setCampaign(campaignDoc.data());
            }
            setLoading(false);
        }
        fetchCampaign();
    }, [userData]);

    const handleSubmit = async () => {
        if (!answer.trim() || !user || !userData?.campaignInfo) return;
        setIsSubmitting(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                'campaignInfo.taskCompleted': true,
                'campaignInfo.taskAnswer': answer,
                balance: increment(campaign?.refereeBonus || 0)
            });
            
            if (campaign?.refereeBonus > 0) {
                 const transactionRef = doc(collection(db, 'transactions'));
                 await setDoc(transactionRef, {
                     userId: user.uid,
                     type: 'bonus',
                     amount: campaign.refereeBonus,
                     status: 'completed',
                     description: `Referral Task Bonus: ${campaign.title}`,
                     createdAt: serverTimestamp(),
                 });
            }

            toast({ title: "Task Completed!", description: `LKR ${campaign.refereeBonus} has been added to your balance!`});
            setCampaign(null); // Hide the banner
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: "Could not submit your task."});
        } finally {
            setIsSubmitting(false);
        }
    }

    if (loading || !campaign) {
        return null;
    }

    return (
        <Alert className="mb-4 border-primary bg-primary/5">
            <Award className="h-4 w-4 text-primary" />
            <AlertTitle className="font-bold text-primary">Complete Your Referral Task!</AlertTitle>
            <AlertDescription>
                {campaign.taskDescription}
                <div className="mt-2 space-y-2">
                    <p className="text-sm font-semibold">{campaign.verificationQuestion}</p>
                    <div className="flex gap-2">
                        <Input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer..." />
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin"/> : "Submit"}
                        </Button>
                    </div>
                </div>
            </AlertDescription>
        </Alert>
    )
}


export default function DashboardLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { user, userData, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
        if (!loading && user && userData?.role === 'admin') {
            router.push('/admin');
        }
         if (!loading && user && userData?.role === 'marketer') {
            router.push('/marketing/dashboard');
        }
    }, [user, userData, loading, router, pathname]);
    
    if (loading || !user || userData?.role === 'admin' || userData?.role === 'marketer') {
         return (
             <div className="flex flex-col p-8">
              <div className="mb-12">
                <Skeleton className="h-12 w-3/4 mb-2" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            </div>
        )
    }

    return (
        <MainLayout>
            <CampaignTaskCompletion />
            {children}
        </MainLayout>
    )
  }
