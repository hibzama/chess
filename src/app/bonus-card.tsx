
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';

interface BonusCampaign {
    title: string;
    bonusAmount: number;
    userLimit: number;
    claimsCount: number;
    isActive: boolean;
}

export function BonusCard() {
  const [activeCampaign, setActiveCampaign] = useState<BonusCampaign | null>(null);

  useEffect(() => {
    const fetchBonusConfig = async () => {
        const campaignsRef = collection(db, 'signup_bonus_campaigns');
        const q = query(campaignsRef, where("isActive", "==", true), where("userLimit", ">", 0));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            // Find a campaign that is not yet full
            for (const doc of querySnapshot.docs) {
                const campaignData = doc.data() as Omit<BonusCampaign, 'claimsCount'>;
                const claimsRef = collection(db, `signup_bonus_campaigns/${doc.id}/claims`);
                const claimsSnapshot = await getCountFromServer(claimsRef);
                const claimsCount = claimsSnapshot.data().count;

                if (claimsCount < campaignData.userLimit) {
                    setActiveCampaign({ ...campaignData, claimsCount });
                    break; // Stop after finding the first available campaign
                }
            }
        }
    };
    fetchBonusConfig();
  }, []);

  if (!activeCampaign) {
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
    </Card>
  );
}
