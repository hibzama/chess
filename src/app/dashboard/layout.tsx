
'use client'
import MainLayout from "@/components/layout/main-layout";
import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { doc, getDoc, updateDoc, increment, setDoc, collection, serverTimestamp, writeBatch, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Award, Loader2 } from "lucide-react";
import { CampaignTask } from "../admin/referral-campaigns/page";


function CampaignTaskCompletion() {
    const { user, userData, setUserData } = useAuth();
    const [campaign, setCampaign] = useState<{id: string, tasks: CampaignTask[]} | null>(null);
    const [currentTask, setCurrentTask] = useState<CampaignTask | null>(null);
    const [loading, setLoading] = useState(true);
    const [answer, setAnswer] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!userData?.campaignInfo) {
            setLoading(false);
            return;
        }

        const fetchCampaign = async () => {
            const campaignDoc = await getDoc(doc(db, 'referral_campaigns', userData.campaignInfo.campaignId));
            if (campaignDoc.exists()) {
                const campaignData = campaignDoc.data() as { tasks: CampaignTask[], id: string };
                setCampaign({ ...campaignData, id: campaignDoc.id });
                
                const completedTasks = userData.campaignInfo.completedTasks || [];
                const nextTask = campaignData.tasks.find(task => !completedTasks.includes(task.id));
                setCurrentTask(nextTask || null);

            } else {
                // Campaign might have been deleted, clean up user data
                const userRef = doc(db, 'users', userData.uid);
                await updateDoc(userRef, { campaignInfo: null });
            }
            setLoading(false);
        }
        fetchCampaign();
    }, [userData]);

    const handleSubmit = async () => {
        if (!answer.trim() || !user || !userData?.campaignInfo || !currentTask || !campaign) return;
        setIsSubmitting(true);
        
        try {
            const batch = writeBatch(db);
            const userRef = doc(db, 'users', user.uid);
            const newCompletedTasks = [...(userData.campaignInfo.completedTasks || []), currentTask.id];
            
            batch.update(userRef, {
                'campaignInfo.completedTasks': newCompletedTasks,
                'campaignInfo.answers': {
                    ...userData.campaignInfo.answers,
                    [currentTask.id]: answer
                },
            });
            
            // Create a bonus claim for the admin to approve
            if(currentTask.refereeBonus > 0) {
                 const claimRef = doc(collection(db, 'bonus_claims'));
                 batch.set(claimRef, {
                    userId: user.uid,
                    amount: currentTask.refereeBonus,
                    campaignTitle: `Task: ${currentTask.description.substring(0, 30)}...`,
                    type: 'referee',
                    status: 'pending',
                    createdAt: serverTimestamp(),
                    refereeId: user.uid, // The new user is the referee
                    campaignId: campaign.id,
                    referrerId: userData.campaignInfo.referrerId
                 });
            }

            await batch.commit();

            toast({ title: "Task Submitted!", description: `Your task completion has been submitted for review.`});
            
            // This will trigger the useEffect to find the next task
            setUserData(prev => prev ? ({
                ...prev,
                campaignInfo: {
                    ...prev.campaignInfo!,
                    completedTasks: newCompletedTasks
                }
            }) : null);
            setAnswer('');

        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: "Could not submit your task."});
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const isLinkTask = currentTask && ['whatsapp', 'telegram', 'facebook', 'tiktok', 'link'].includes(currentTask.type);

    if (loading || !currentTask) {
        return null;
    }

    return (
        <Alert className="mb-4 border-primary bg-primary/5">
            <Award className="h-4 w-4 text-primary" />
            <AlertTitle className="font-bold text-primary">Complete Your Referral Task!</AlertTitle>
            <AlertDescription>
                {currentTask.description}
                 {isLinkTask && currentTask.link && (
                    <Button asChild size="sm" className="my-2">
                        <a href={currentTask.link} target="_blank" rel="noopener noreferrer">
                            Open Link
                        </a>
                    </Button>
                )}
                <div className="mt-2 space-y-2">
                    <p className="text-sm font-semibold">{currentTask.verificationQuestion}</p>
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
            {children}
        </MainLayout>
    )
  }
