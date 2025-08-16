
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
import { CampaignTask, Campaign } from "../admin/referral-campaigns/page";


export default function DashboardLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { user, userData, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.push('/login');
            return;
        }

        if (userData?.role === 'admin') {
            router.push('/admin');
            return;
        }
         if (userData?.role === 'marketer') {
            router.push('/marketing/dashboard');
            return;
        }
        
        // Check for pending campaign tasks
        if (userData?.campaignInfo) {
            const fetchCampaign = async () => {
                const campaignDoc = await getDoc(doc(db, 'referral_campaigns', userData.campaignInfo!.campaignId));
                if (campaignDoc.exists()) {
                    const campaignData = campaignDoc.data() as Campaign;
                    const completedTaskIds = new Set(userData.campaignInfo!.completedTasks || []);
                    
                    const allTasksCompleted = campaignData.tasks.every(task => completedTaskIds.has(task.id));
                    
                    if (!allTasksCompleted && pathname !== '/dashboard/your-task') {
                        // User has pending tasks and is NOT on the task page -> redirect TO task page
                        router.push('/dashboard/your-task');
                    } else if (allTasksCompleted && pathname === '/dashboard/your-task') {
                        // User has completed all tasks and IS on the task page -> redirect AWAY from task page
                        router.push('/dashboard');
                    }
                } else {
                    // Campaign may have been deleted by admin
                    if (pathname === '/dashboard/your-task') {
                        router.push('/dashboard');
                    }
                }
            };
            fetchCampaign();
        } else if (pathname === '/dashboard/your-task') {
            // User has no campaign info but is trying to access task page -> redirect away
            router.push('/dashboard');
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
