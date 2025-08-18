
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Loader2, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, writeBatch, serverTimestamp, increment, addDoc } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface BonusCampaign {
    id: string;
    title: string;
    bonusAmount: number;
    userLimit: number;
    claimsCount?: number;
    isActive: boolean;
}

export function BonusCard() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [activeCampaign, setActiveCampaign] = useState<BonusCampaign | null>(null);
  const [hasClaimed, setHasClaimed] = useState<boolean | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    if (!user) {
        setHasClaimed(true); // Don't show if not logged in
        return;
    }

    // Check if the user is new (created within the last 24 hours)
    const creationTime = user.metadata.creationTime ? new Date(user.metadata.creationTime) : new Date();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    if (creationTime < twentyFourHoursAgo) {
        setHasClaimed(true); // User is not new, so they can't claim
        return;
    }


    const fetchBonusConfig = async () => {
        const campaignsRef = collection(db, 'signup_bonus_campaigns');
        const q = query(campaignsRef, where("isActive", "==", true));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            for (const docRef of querySnapshot.docs) {
                const campaignData = { id: docRef.id, ...docRef.data() } as BonusCampaign;
                
                // Check if user has already claimed this specific campaign
                const userClaimDoc = await getDoc(doc(db, `signup_bonus_campaigns/${docRef.id}/claims`, user.uid));
                if(userClaimDoc.exists()) {
                    setHasClaimed(true);
                    setActiveCampaign(null); // Ensure we don't show any campaign if one has been claimed.
                    return; // User has claimed this campaign, stop checking
                }

                // Check against the aggregated claimsCount on the document
                if ((campaignData.claimsCount || 0) < campaignData.userLimit) {
                    setActiveCampaign(campaignData);
                    setHasClaimed(false);
                    return; // Found an active, available campaign
                }
            }
        }
        // If loop finishes, no active and available campaign was found
        setHasClaimed(true); 
        setActiveCampaign(null);
    };
    fetchBonusConfig();
  }, [user]);

  const handleClaimBonus = async () => {
    if (!user || !activeCampaign || hasClaimed) return;
    setIsClaiming(true);

    try {
        const claimRef = doc(collection(db, `signup_bonus_campaigns/${activeCampaign.id}/claims`), user.uid);
        await addDoc(collection(db, `signup_bonus_campaigns/${activeCampaign.id}/claims`), {
            userId: user.uid,
            claimedAt: serverTimestamp()
        });

        toast({ title: 'Bonus Claimed!', description: `LKR ${activeCampaign.bonusAmount.toFixed(2)} is being added to your wallet.` });
        setHasClaimed(true);

    } catch (error) {
        console.error("Error claiming bonus:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not claim bonus. Please try again.' });
    } finally {
        setIsClaiming(false);
    }
  }

  if (hasClaimed === null || hasClaimed || !activeCampaign) {
    return null;
  }

  const spotsLeft = activeCampaign.userLimit - (activeCampaign.claimsCount || 0);

  return (
    <Card className="bg-card/50 border-primary/20">
      <CardHeader className="text-center">
        <CardTitle className="text-lg flex items-center justify-center gap-2">
          <Gift className="w-6 h-6 text-yellow-300" />
          <span className="text-yellow-300">{activeCampaign.bonusAmount} LKR Registration Bonus!</span>
        </CardTitle>
        <CardDescription>{activeCampaign.title} - The next {spotsLeft > 0 ? spotsLeft : 0} users to register get a free bonus!</CardDescription>
      </CardHeader>
      <CardFooter>
          <Button className="w-full" onClick={handleClaimBonus} disabled={isClaiming}>
            {isClaiming ? <Loader2 className="animate-spin" /> : 'Claim Bonus'}
          </Button>
      </CardFooter>
    </Card>
  );
}

    