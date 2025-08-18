
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Loader2, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, serverTimestamp, increment, setDoc } from 'firebase/firestore';
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
        setLoading(false);
        return;
    }

    setLoading(true);
    const fetchBonusConfig = async () => {
        try {
            const campaignsRef = collection(db, 'signup_bonus_campaigns');
            const q = query(campaignsRef, where("isActive", "==", true), where("userLimit", ">", 0));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const campaignDoc = querySnapshot.docs[0];
                const campaignData = { id: campaignDoc.id, ...campaignDoc.data() } as BonusCampaign;

                if ((campaignData.claimsCount || 0) >= campaignData.userLimit) {
                    setActiveCampaign(null);
                    setHasClaimed(true);
                    setLoading(false);
                    return;
                }

                const userClaimQuery = query(collection(db, `bonus_claims`), where('userId', '==', user.uid), where('campaignId', '==', campaignData.id));
                const userClaimSnapshot = await getDocs(userClaimQuery);
                
                if(!userClaimSnapshot.empty) {
                    setHasClaimed(true);
                    setActiveCampaign(null); 
                } else {
                    setActiveCampaign(campaignData);
                    setHasClaimed(false);
                }
            } else {
                 setActiveCampaign(null);
                 setHasClaimed(true);
            }
        } catch (error) {
            console.error("Error fetching bonus config:", error);
            setHasClaimed(true); 
            setActiveCampaign(null);
        } finally {
            setLoading(false);
        }
    };
    fetchBonusConfig();
  }, [user]);

  const handleClaimBonus = async () => {
    if (!user || !activeCampaign || hasClaimed) return;
    setIsClaiming(true);

    try {
        const claimRef = doc(collection(db, `bonus_claims`));
        await setDoc(claimRef, {
            userId: user.uid,
            type: 'signup',
            amount: activeCampaign.bonusAmount,
            status: 'pending',
            campaignId: activeCampaign.id,
            campaignTitle: `Signup Bonus: ${activeCampaign.title}`,
            createdAt: serverTimestamp()
        });

        toast({ title: 'Bonus Claimed!', description: `Your bonus of LKR ${activeCampaign.bonusAmount.toFixed(2)} is pending admin approval.` });
        setHasClaimed(true);

    } catch (error) {
        console.error("Error claiming bonus:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not claim bonus. Please try again.' });
    } finally {
        setIsClaiming(false);
    }
  }

  if (loading || hasClaimed || !activeCampaign) {
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
