
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


export default function DashboardLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { user, userData, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [hasPendingTasks, setHasPendingTasks] = useState(false);

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
        
        // Check for pending campaign tasks
        if (!loading && userData?.campaignInfo) {
            const fetchCampaign = async () => {
                const campaignDoc = await getDoc(doc(db, 'referral_campaigns', userData.campaignInfo.campaignId));
                if (campaignDoc.exists()) {
                    const campaignData = campaignDoc.data();
                    const completedTasks = userData.campaignInfo.completedTasks || [];
                    const nextTask = campaignData.tasks.find((task: CampaignTask) => !completedTasks.includes(task.id));
                    
                    if (nextTask && pathname !== '/dashboard/your-task') {
                        // If there's a pending task and they are not on the task page, redirect them.
                        router.push('/dashboard/your-task');
                    } else if (!nextTask && pathname === '/dashboard/your-task') {
                        // If all tasks are done and they are on the task page, redirect away.
                        router.push('/dashboard');
                    }
                }
            };
            fetchCampaign();
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
