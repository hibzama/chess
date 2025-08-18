
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Loader2, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, writeBatch, serverTimestamp, increment, addDoc, setDoc } from 'firebase/firestore';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
        setHasClaimed(true);
        setLoading(false);
        return;
    }

    // Check if the user is new (created within the last 24 hours)
    const creationTime = user.metadata.creationTime ? new Date(user.metadata.creationTime) : new Date();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    if (creationTime < twentyFourHoursAgo) {
        setHasClaimed(true);
        setLoading(false);
        return;
    }

    setLoading(true);
    const fetchBonusConfig = async () => {
        const campaignsRef = collection(db, 'signup_bonus_campaigns');
        const q = query(campaignsRef, where("isActive", "==", true));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            for (const docRef of querySnapshot.docs) {
                const campaignData = { id: docRef.id, ...docRef.data() } as BonusCampaign;
                
                const userClaimDoc = await getDoc(doc(db, `signup_bonus_campaigns/${docRef.id}/claims`, user.uid));
                if(userClaimDoc.exists()) {
                    setHasClaimed(true);
                    setActiveCampaign(null); 
                    setLoading(false);
                    return; 
                }

                if ((campaignData.claimsCount || 0) < campaignData.userLimit) {
                    setActiveCampaign(campaignData);
                    setHasClaimed(false);
                    setLoading(false);
                    return;
                }
            }
        }
        setHasClaimed(true); 
        setActiveCampaign(null);
        setLoading(false);
    };
    fetchBonusConfig();
  }, [user]);

  const handleClaimBonus = async () => {
    if (!user || !activeCampaign || hasClaimed) return;
    setIsClaiming(true);

    try {
        const claimRef = doc(db, `signup_bonus_campaigns/${activeCampaign.id}/claims`, user.uid);
        await setDoc(claimRef, {
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

  if (loading || hasClaimed === null || hasClaimed || !activeCampaign) {
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
