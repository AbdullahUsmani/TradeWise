import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { Advisor, AdvisorPortfolio, Dividend, StockQuote, Transaction } from '../types/portfolio';

export interface CloudPortfolioData {
  advisors: Advisor[];
  portfolios?: AdvisorPortfolio[];
  transactions: Transaction[];
  dividends: Dividend[];
  quotes: Record<string, StockQuote>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isCloudSynced: boolean;
  syncStatus: 'synced' | 'saving' | 'offline' | 'error' | 'quota_exceeded';
  lastSyncedAt: Date | null;
  initialSyncDone: boolean;
  isQuotaExceeded: boolean;
  resetQuotaStatus: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearAllUserData: () => Promise<void>;
  saveUserDataToCloud: (
    advisors: Advisor[],
    transactions: Transaction[],
    dividends: Dividend[],
    quotes: Record<string, StockQuote>,
    portfolios?: AdvisorPortfolio[]
  ) => Promise<void>;
  deleteAdvisorFromCloud: (advisorId: string) => Promise<void>;
  deleteTransactionFromCloud: (transactionId: string) => Promise<void>;
  deleteDividendFromCloud: (dividendId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to identify old legacy demo data
const isLegacyDemoData = (advisorsList: Advisor[]) => {
  const legacyNames = ['Ethica Invest', 'Capital Mind Momentum', 'Niveshaay Smallcap', 'Growth Momentum Smallcase'];
  return advisorsList.some((a) => legacyNames.includes(a.name));
};

export const AuthProvider: React.FC<{
  children: React.ReactNode;
  onCloudDataLoaded?: (data: CloudPortfolioData) => void;
}> = ({ children, onCloudDataLoaded }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline' | 'error' | 'quota_exceeded'>('offline');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const isQuotaHitRef = useRef(false);

  // Check if quota limit was already reached today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const recordedQuotaDay = localStorage.getItem('tradewise_quota_exceeded_day');
    if (recordedQuotaDay === today) {
      isQuotaHitRef.current = true;
      setIsQuotaExceeded(true);
      setSyncStatus('quota_exceeded');
    }
  }, []);

  const markQuotaExceeded = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('tradewise_quota_exceeded_day', today);
    isQuotaHitRef.current = true;
    setIsQuotaExceeded(true);
    setSyncStatus('quota_exceeded');
  }, []);

  const resetQuotaStatus = useCallback(() => {
    localStorage.removeItem('tradewise_quota_exceeded_day');
    isQuotaHitRef.current = false;
    setIsQuotaExceeded(false);
    setSyncStatus('synced');
  }, []);

  // Monitor Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        setSyncStatus(isQuotaHitRef.current ? 'quota_exceeded' : 'saving');
        try {
          // Fetch user data from consolidated single document or subcollections
          const loaded = await fetchAllUserData(currentUser.uid);
          if (loaded) {
            // Check if loaded data is old demo data - if so, purge to clean state in UI
            if (isLegacyDemoData(loaded.advisors)) {
              const cleanState: CloudPortfolioData = {
                advisors: [],
                portfolios: [],
                transactions: [],
                dividends: [],
                quotes: {},
              };
              if (onCloudDataLoaded) {
                onCloudDataLoaded(cleanState);
              }
            } else {
              if (onCloudDataLoaded) {
                onCloudDataLoaded(loaded);
              }
            }
            setIsCloudSynced(true);
            setSyncStatus(isQuotaHitRef.current ? 'quota_exceeded' : 'synced');
            setLastSyncedAt(new Date());
          } else {
            // First time user: initialize clean empty portfolio
            if (onCloudDataLoaded) {
              onCloudDataLoaded({
                advisors: [],
                portfolios: [],
                transactions: [],
                dividends: [],
                quotes: {},
              });
            }
            setIsCloudSynced(true);
            setSyncStatus(isQuotaHitRef.current ? 'quota_exceeded' : 'synced');
            setLastSyncedAt(new Date());
          }
          setInitialSyncDone(true);
        } catch (error: any) {
          console.error('Error initializing user cloud data:', error);
          if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota') || error?.message?.includes('quota')) {
            markQuotaExceeded();
          } else {
            setSyncStatus('error');
          }
          setInitialSyncDone(true);
        }
      } else {
        setIsCloudSynced(false);
        setSyncStatus('offline');
        setInitialSyncDone(true);
      }
    });

    return () => unsubscribe();
  }, [markQuotaExceeded, onCloudDataLoaded]);

  // Efficient Fetch: Checks consolidated single document first (1 read), fallback to subcollections
  const fetchAllUserData = async (uid: string): Promise<CloudPortfolioData | null> => {
    try {
      // 1. Try single consolidated portfolio document (v2 format - 1 read unit)
      const consolidatedRef = doc(db, 'users', uid, 'portfolio', 'main');
      const consolidatedSnap = await getDoc(consolidatedRef);

      const safeArray = <T,>(val: any): T[] => (Array.isArray(val) ? val : []);
      const safeObject = <T extends object>(val: any): T =>
        val && typeof val === 'object' && !Array.isArray(val) ? val : ({} as T);

      if (consolidatedSnap.exists()) {
        const data = consolidatedSnap.data();
        return {
          advisors: safeArray<Advisor>(data.advisors),
          portfolios: safeArray<AdvisorPortfolio>(data.portfolios),
          transactions: safeArray<Transaction>(data.transactions),
          dividends: safeArray<Dividend>(data.dividends),
          quotes: safeObject<Record<string, StockQuote>>(data.quotes),
        };
      }

      // 2. Check root user doc portfolio field
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data().portfolio) {
        const p = userSnap.data().portfolio;
        return {
          advisors: safeArray<Advisor>(p.advisors),
          portfolios: safeArray<AdvisorPortfolio>(p.portfolios),
          transactions: safeArray<Transaction>(p.transactions),
          dividends: safeArray<Dividend>(p.dividends),
          quotes: safeObject<Record<string, StockQuote>>(p.quotes),
        };
      }

      // 3. Fallback to legacy subcollections if exists
      const advSnap = await getDocs(collection(db, 'users', uid, 'advisors'));
      const advisorsList: Advisor[] = [];
      advSnap.forEach((d) => advisorsList.push(d.data() as Advisor));

      const txSnap = await getDocs(collection(db, 'users', uid, 'transactions'));
      const txList: Transaction[] = [];
      txSnap.forEach((d) => txList.push(d.data() as Transaction));

      const divSnap = await getDocs(collection(db, 'users', uid, 'dividends'));
      const divList: Dividend[] = [];
      divSnap.forEach((d) => divList.push(d.data() as Dividend));

      const quotesSnap = await getDocs(collection(db, 'users', uid, 'quotes'));
      const quotesMap: Record<string, StockQuote> = {};
      quotesSnap.forEach((d) => {
        const q = d.data() as StockQuote;
        if (q.symbol) {
          quotesMap[q.symbol] = q;
        }
      });

      if (advisorsList.length > 0 || txList.length > 0 || divList.length > 0) {
        return {
          advisors: advisorsList,
          portfolios: [],
          transactions: txList,
          dividends: divList,
          quotes: quotesMap,
        };
      }

      return null;
    } catch (e: any) {
      if (e?.code === 'resource-exhausted' || e?.message?.includes('Quota') || e?.message?.includes('quota')) {
        isQuotaHitRef.current = true;
        setIsQuotaExceeded(true);
        console.warn('Firestore quota exceeded on read; falling back to local storage.');
      } else {
        console.error('Failed to load user data from Firestore:', e);
      }
      return null;
    }
  };

  // Ultra-efficient single-document write (Consumes exactly 1 write unit per save)
  const saveUserDataToCloud = useCallback(
    async (
      advisors: Advisor[],
      transactions: Transaction[],
      dividends: Dividend[],
      quotes: Record<string, StockQuote>,
      portfolios: AdvisorPortfolio[] = []
    ) => {
      if (!user) return;
      if (isQuotaHitRef.current) {
        // Quota has already been hit: keep in local storage and notify status quietly
        setSyncStatus('quota_exceeded');
        return;
      }

      setSyncStatus('saving');
      try {
        const consolidatedRef = doc(db, 'users', user.uid, 'portfolio', 'main');
        await setDoc(
          consolidatedRef,
          {
            advisors: Array.isArray(advisors) ? advisors : [],
            portfolios: Array.isArray(portfolios) ? portfolios : [],
            transactions: Array.isArray(transactions) ? transactions : [],
            dividends: Array.isArray(dividends) ? dividends : [],
            quotes: quotes && typeof quotes === 'object' && !Array.isArray(quotes) ? quotes : {},
            lastUpdated: new Date().toISOString(),
            dataVersion: '2.0',
          },
          { merge: true }
        );

        setSyncStatus('synced');
        setLastSyncedAt(new Date());
      } catch (err: any) {
        if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota') || err?.message?.includes('quota')) {
          markQuotaExceeded();
          console.warn('Firestore daily write quota reached (Free Tier limit). All changes are safely preserved in LocalStorage.');
        } else {
          console.error('Failed to save user data to Cloud Firestore:', err);
          setSyncStatus('error');
        }
      }
    },
    [user, markQuotaExceeded]
  );

  // Complete reset to clean 0 state
  const clearAllUserData = useCallback(async () => {
    localStorage.removeItem('tradewise_advisors_v1');
    localStorage.removeItem('tradewise_portfolios_v1');
    localStorage.removeItem('tradewise_transactions_v1');
    localStorage.removeItem('tradewise_dividends_v1');
    localStorage.removeItem('tradewise_quotes_v1');
    localStorage.removeItem('multi_advisor_portfolio_advisors_v1');
    localStorage.removeItem('multi_advisor_portfolio_portfolios_v1');
    localStorage.removeItem('multi_advisor_portfolio_transactions_v1');
    localStorage.removeItem('multi_advisor_portfolio_dividends_v1');
    localStorage.removeItem('multi_advisor_portfolio_quotes_v1');

    const emptyData: CloudPortfolioData = {
      advisors: [],
      portfolios: [],
      transactions: [],
      dividends: [],
      quotes: {},
    };

    if (onCloudDataLoaded) {
      onCloudDataLoaded(emptyData);
    }

    if (user && !isQuotaHitRef.current) {
      try {
        const consolidatedRef = doc(db, 'users', user.uid, 'portfolio', 'main');
        await setDoc(consolidatedRef, {
          ...emptyData,
          lastUpdated: new Date().toISOString(),
          dataVersion: '2.0',
        });
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
      } catch (e: any) {
        if (e?.code === 'resource-exhausted' || e?.message?.includes('Quota') || e?.message?.includes('quota')) {
          markQuotaExceeded();
        }
      }
    }
  }, [user, onCloudDataLoaded, markQuotaExceeded]);

  const deleteAdvisorFromCloud = useCallback(async (_advisorId: string) => {
    // Handled automatically via consolidated document save
  }, []);

  const deleteTransactionFromCloud = useCallback(async (_transactionId: string) => {
    // Handled automatically via consolidated document save
  }, []);

  const deleteDividendFromCloud = useCallback(async (_dividendId: string) => {
    // Handled automatically via consolidated document save
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      throw error;
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      console.error('Email Sign In Error:', error);
      throw error;
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, pass: string, name?: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (name && cred.user) {
        await updateProfile(cred.user, { displayName: name });
      }
    } catch (error: any) {
      console.error('Email Sign Up Error:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fbSignOut(auth);
      setUser(null);
      setIsCloudSynced(false);
      setSyncStatus('offline');
      localStorage.removeItem('tradewise_advisors_v1');
      localStorage.removeItem('tradewise_transactions_v1');
      localStorage.removeItem('tradewise_dividends_v1');
      localStorage.removeItem('tradewise_quotes_v1');
      localStorage.removeItem('multi_advisor_portfolio_advisors_v1');
      localStorage.removeItem('multi_advisor_portfolio_transactions_v1');
      localStorage.removeItem('multi_advisor_portfolio_dividends_v1');
      localStorage.removeItem('multi_advisor_portfolio_quotes_v1');
    } catch (error: any) {
      console.error('Sign Out Error:', error);
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isCloudSynced,
        syncStatus,
        lastSyncedAt,
        initialSyncDone,
        isQuotaExceeded,
        resetQuotaStatus,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        clearAllUserData,
        saveUserDataToCloud,
        deleteAdvisorFromCloud,
        deleteTransactionFromCloud,
        deleteDividendFromCloud,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
