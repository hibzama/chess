
'use client'
import MainLayout from "@/components/layout/main-layout";
import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Award, Loader2 } from "lucide-react";
import { CampaignTask, Campaign } from "../admin/referral-campaigns/page";
import { boyAvatars, girlAvatars } from "@/components/icons/avatars";
import { renderToString } from "react-dom/server";
import React from 'react';

export default function DashboardLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { user, userData, setUserData, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();

    const [showProfileSetup, setShowProfileSetup] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);

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

        if (userData && !userData.firstName) {
            setShowProfileSetup(true);
        }
        
        // Check for pending campaign tasks ONLY if campaignInfo exists
        if (userData && userData.campaignInfo && userData.campaignInfo.campaignId) {
            const fetchCampaign = async () => {
                try {
                    const campaignDoc = await getDoc(doc(db, 'referral_campaigns', userData.campaignInfo!.campaignId));
                    if (campaignDoc.exists()) {
                        const campaignData = campaignDoc.data() as Campaign;
                        const completedTaskIds = new Set(userData.campaignInfo!.completedTasks || []);
                        
                        const allTasksCompleted = campaignData.tasks.every(task => completedTaskIds.has(task.id));
                        
                        if (!allTasksCompleted && pathname !== '/dashboard/your-task') {
                            router.push('/dashboard/your-task');
                        } else if (allTasksCompleted && pathname === '/dashboard/your-task') {
                            router.push('/dashboard');
                        }
                    } else {
                         if (pathname === '/dashboard/your-task') {
                            router.push('/dashboard');
                        }
                    }
                } catch(e) {
                    console.error("Permission error fetching campaign, redirecting.", e)
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
    
     const handleProfileSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userData) return;
        setIsSavingProfile(true);
        
        const target = e.target as typeof e.target & {
            'first-name': { value: string };
            'last-name': { value: string };
            'phone': { value: string };
            'address': { value: string };
            'city': { value: string };
            'country': { value: string };
            'gender': { value: string };
        };

        const gender = target.gender.value;
        if (!gender) {
            toast({ variant: "destructive", title: "Please select a gender."});
            setIsSavingProfile(false);
            return;
        }

        const avatarCollection = gender === 'male' ? boyAvatars : girlAvatars;
        const randomAvatar = avatarCollection[Math.floor(Math.random() * avatarCollection.length)];
        const svgString = renderToString(React.createElement(randomAvatar));
        const defaultAvatarUri = `data:image/svg+xml;base64,${btoa(svgString)}`;

        const profileData = {
            firstName: target['first-name'].value,
            lastName: target['last-name'].value,
            phone: target.phone.value,
            address: target.address.value,
            city: target.city.value,
            country: target.country.value,
            gender: gender,
            photoURL: defaultAvatarUri,
        };

        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, profileData);
            setUserData(prev => prev ? { ...prev, ...profileData } : null);
            setShowProfileSetup(false);
            toast({ title: "Profile Updated!", description: "Welcome to Nexbattle!"});
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Could not save your profile." });
        } finally {
            setIsSavingProfile(false);
        }
    }


    if (loading || !user || userData?.role === 'admin' || userData?.role === 'marketer' || showProfileSetup) {
         return (
             <>
                <div className="flex flex-col p-8">
                <div className="mb-12">
                    <Skeleton className="h-12 w-3/4 mb-2" />
                    <Skeleton className="h-6 w-1/2" />
                </div>
                </div>
                 <Dialog open={showProfileSetup} onOpenChange={setShowProfileSetup}>
                    <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()} hideCloseButton>
                        <form onSubmit={handleProfileSetup}>
                            <DialogHeader>
                                <DialogTitle>Complete Your Profile</DialogTitle>
                                <DialogDescription>
                                    Welcome! Please provide a few more details to get started.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1"><Label htmlFor="first-name">First Name</Label><Input id="first-name" required /></div>
                                    <div className="space-y-1"><Label htmlFor="last-name">Last Name</Label><Input id="last-name" required /></div>
                                </div>
                                <div className="space-y-1"><Label htmlFor="phone">Phone</Label><Input id="phone" type="tel" required /></div>
                                <div className="space-y-1"><Label htmlFor="address">Address</Label><Input id="address" required /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1"><Label htmlFor="city">City</Label><Input id="city" required /></div>
                                    <div className="space-y-1"><Label htmlFor="country">Country</Label><Input id="country" required /></div>
                                </div>
                                 <div className="space-y-2">
                                    <Label>Gender</Label>
                                    <RadioGroup name="gender" className="flex gap-4">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="male" id="male" /><Label htmlFor="male">Male</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="female" id="female" /><Label htmlFor="female">Female</Label></div>
                                    </RadioGroup>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isSavingProfile}>
                                    {isSavingProfile ? <Loader2 className="animate-spin" /> : "Save & Continue"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
             </>
        )
    }

    return (
        <MainLayout>
            {children}
        </MainLayout>
    )
  }
