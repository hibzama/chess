
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db, rtdb } from '@/lib/firebase';
import { doc, onSnapshot, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';
import { ref, onValue, off, set, onDisconnect, serverTimestamp as rtdbServerTimestamp } from "firebase/database";

interface CurrencyConfig {
    symbol: string;
    usdtRate: number;
}

export interface GameAvailability {
    practiceChess: boolean;
    multiplayerChess: boolean;
    practiceCheckers: boolean;
    multiplayerCheckers: boolean;
    practiceOmi: boolean;
    puzzles: boolean;
}

interface PaymentConfig {
    bankDepositEnabled: boolean;
    bankName: string;
    bankBranch: string;
    bankAccountName: string;
    bankAccountNumber: string;
    binancePayEnabled: boolean;
    binancePayId: string;
    withdrawalFeePercentage: number;
    supportWhatsapp: string;
    supportTelegram: string;
    telegramChannelUrl?: string;
    whatsappCommunityUrl?: string;
    telegramCommunityUrl?: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  currencyConfig: CurrencyConfig;
  gameAvailability: GameAvailability;
  paymentConfig: PaymentConfig;
  loading: boolean;
  logout: () => Promise<void>;
  setUserData: React.Dispatch<React.SetStateAction<UserData | null>>;
}

interface EquipmentSettings {
    chess: {
        pieceStyle: string;
        boardTheme: string;
    },
    checkers: {
        pieceStyle: string;
        boardTheme: string;
    }
}

interface CampaignInfo {
    campaignId: string;
    referrerId: string;
    completedTasks: string[];
    answers: Record<string, string>;
    totalTasks: number;
}

interface UserData {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    binancePayId?: string;
    balance: number;
    role: 'user' | 'admin' | 'marketer';
    equipment?: EquipmentSettings;
    referredBy?: string;
    bonusReferralCount?: number;
    referralChain?: string[];
    createdAt: any;
    l1Count?: number;
    photoURL?: string;
    friends?: string[];
    status?: 'online' | 'offline';
    lastSeen?: any;
    wins?: number;
    emailVerified?: boolean;
    marketingBalance?: number;
    campaignInfo?: CampaignInfo;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [currencyConfig, setCurrencyConfig] = useState<CurrencyConfig>({ symbol: 'LKR', usdtRate: 310 });
  const [gameAvailability, setGameAvailability] = useState<GameAvailability>({
    practiceChess: true,
    multiplayerChess: true,
    practiceCheckers: true,
    multiplayerCheckers: true,
    practiceOmi: true,
    puzzles: true,
  });
   const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
        bankDepositEnabled: true,
        bankName: 'Bank of Ceylon (Boc)',
        bankBranch: 'Galenbidunuwewa',
        bankAccountName: 'Jd Aththanayaka',
        bankAccountNumber: '81793729',
        binancePayEnabled: true,
        binancePayId: '38881724',
        withdrawalFeePercentage: 5,
        supportWhatsapp: '94704894587',
        supportTelegram: 'nexbattle_help',
        telegramChannelUrl: 'https://t.me/nexbattlerooms',
        whatsappCommunityUrl: 'https://chat.whatsapp.com/EJFHx4y9n9EDstQ971Bvf5?mode=ac_t',
        telegramCommunityUrl: 'https://t.me/nexbattlechat',
    });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setUserData(null);
        setLoading(false);
      }
    });

    const unsubCurrency = onSnapshot(doc(db, 'settings', 'currencyConfig'), (docSnap) => {
        if (docSnap.exists()) setCurrencyConfig(docSnap.data() as CurrencyConfig);
    });

    const unsubAvailability = onSnapshot(doc(db, 'settings', 'gameAvailability'), (docSnap) => {
        if (docSnap.exists()) setGameAvailability(docSnap.data() as GameAvailability);
    });

    const unsubPayment = onSnapshot(doc(db, 'settings', 'paymentConfig'), (docSnap) => {
        if (docSnap.exists()) setPaymentConfig(docSnap.data() as PaymentConfig);
    });

    return () => {
        unsubscribeAuth();
        unsubCurrency();
        unsubAvailability();
        unsubPayment();
    };
  }, []);

  useEffect(() => {
    let unsubscribeFirestore: () => void;
    if (user) {
      setLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      
      unsubscribeFirestore = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setUserData(doc.data() as UserData);
        } else {
          setUserData(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching user data:", error);
        setUserData(null);
        setLoading(false);
      });

      // Presence system
      const userStatusDatabaseRef = ref(rtdb, '/status/' + user.uid);
      const userStatusFirestoreRef = doc(db, '/users/' + user.uid);

      const isOfflineForDatabase = {
        state: 'offline',
        last_changed: rtdbServerTimestamp(),
      };
      
      const isOnlineForDatabase = {
        state: 'online',
        last_changed: rtdbServerTimestamp(),
      };

      const isOfflineForFirestore = {
          status: 'offline',
          lastSeen: serverTimestamp(),
      };

      const isOnlineForFirestore = {
          status: 'online',
          lastSeen: serverTimestamp(),
      };

      onValue(ref(rtdb, '.info/connected'), (snapshot) => {
        if (snapshot.val() === false) {
           getDoc(userStatusFirestoreRef).then(docSnap => {
                if (docSnap.exists() && docSnap.data().status !== 'offline') {
                    updateDoc(userStatusFirestoreRef, isOfflineForFirestore);
                }
            });
          return;
        }

        onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
             getDoc(userStatusFirestoreRef).then(docSnap => {
                if (docSnap.exists()) {
                    set(userStatusDatabaseRef, isOnlineForDatabase);
                    updateDoc(userStatusFirestoreRef, isOnlineForFirestore);
                }
            });
        });
      });

    }

    return () => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, [user]);


  const logout = async () => {
    if(user) {
        const userStatusFirestoreRef = doc(db, '/users/' + user.uid);
         await updateDoc(userStatusFirestoreRef, {
          status: 'offline',
          lastSeen: serverTimestamp(),
        });
    }
    await auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, logout, setUserData, currencyConfig, gameAvailability, paymentConfig }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
