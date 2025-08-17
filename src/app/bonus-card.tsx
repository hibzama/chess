
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Loader2, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, getCountFromServer, doc, getDoc, writeBatch, serverTimestamp, increment, addDoc } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface BonusCampaign {
    id: string;
    title: string;
    bonusAmount: number;
    userLimit: number;
    claimsCount: number;
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

    const fetchBonusConfig = async () => {
        const campaignsRef = collection(db, 'signup_bonus_campaigns');
        const q = query(campaignsRef, where("isActive", "==", true));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            for (const docRef of querySnapshot.docs) {
                const campaignData = { id: docRef.id, ...docRef.data() } as Omit<BonusCampaign, 'claimsCount'>;
                const claimsRef = collection(db, `signup_bonus_campaigns/${docRef.id}/claims`);
                
                const [claimsSnapshot, userClaimDoc] = await Promise.all([
                    getCountFromServer(claimsRef),
                    getDoc(doc(claimsRef, user.uid))
                ]);

                if(userClaimDoc.exists()) {
                    setHasClaimed(true);
                    setActiveCampaign(null);
                    return; // User has claimed this campaign, stop checking
                }

                const claimsCount = claimsSnapshot.data().count;

                if (claimsCount < campaignData.userLimit) {
                    setActiveCampaign({ ...campaignData, claimsCount });
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
        const userRef = doc(db, 'users', user.uid);
        const campaignRef = doc(db, 'signup_bonus_campaigns', activeCampaign.id);
        const claimRef = doc(campaignRef, 'claims', user.uid);
        const transactionRef = doc(collection(db, 'transactions'));
        
        const batch = writeBatch(db);
        
        batch.update(userRef, { balance: increment(activeCampaign.bonusAmount) });
        batch.set(claimRef, { userId: user.uid, claimedAt: serverTimestamp() });
        batch.set(transactionRef, {
            userId: user.uid,
            type: 'bonus',
            amount: activeCampaign.bonusAmount,
            status: 'completed',
            description: `Sign-up Bonus: ${activeCampaign.title}`,
            createdAt: serverTimestamp(),
        });

        await batch.commit();

        toast({ title: 'Bonus Claimed!', description: `LKR ${activeCampaign.bonusAmount.toFixed(2)} has been added to your wallet.` });
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

  const spotsLeft = activeCampaign.userLimit - activeCampaign.claimsCount;

  return (
    <Card className="bg-card/50 border-primary/20">
      <CardHeader className="text-center">
        <CardTitle className="text-lg flex items-center justify-center gap-2">
          <Gift className="w-6 h-6 text-yellow-300" />
          <span className="text-yellow-300">{activeCampaign.bonusAmount} LKR Registration Bonus!</span>
        </CardTitle>
        <CardDescription>{activeCampaign.title} - The next {spotsLeft} users to register get a free bonus!</CardDescription>
      </CardHeader>
      <CardFooter>
          <Button className="w-full" onClick={handleClaimBonus} disabled={isClaiming}>
            {isClaiming ? <Loader2 className="animate-spin" /> : 'Claim Bonus'}
          </Button>
      </CardFooter>
    </Card>
  );
}
