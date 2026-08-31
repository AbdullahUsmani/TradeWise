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
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { Advisor, AdvisorPortfolio, Dividend, StockQuote, Transaction } from '../types/portfolio';
import {
  INITIAL_ADVISORS,
  INITIAL_PORTFOLIOS,
  INITIAL_DIVIDENDS,
  INITIAL_STOCK_QUOTES,
  INITIAL_TRANSACTIONS,
} from '../data/initialData';

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
  deletePortfolioFromCloud: (portfolioId: string) => Promise<void>;
  deleteTransactionFromCloud: (transactionId: string) => Promise<void>;
  deleteDividendFromCloud: (dividendId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to remove any undefined fields before sending to Firestore to prevent serialization errors
function deepSanitize(val: any): any {
  if (val === undefined) return null;
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) {
    return val.map((item) => deepSanitize(item)).filter((item) => item !== undefined);
  }
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    if (v !== undefined) {
      clean[k] = deepSanitize(v);
    }
  }
  return clean;
}

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

  const markQuotaExceeded = useCallback(() => {
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

  // Comprehensive Fetch: Uses consolidated doc as primary source of truth, falls back to subcollections or user doc
  const fetchAllUserData = async (uid: string): Promise<CloudPortfolioData | null> => {
    try {
      const safeArray = <T,>(val: any): T[] => (Array.isArray(val) ? val : []);
      const safeObject = <T extends object>(val: any): T =>
        val && typeof val === 'object' && !Array.isArray(val) ? val : ({} as T);

      // 1. Primary Source of Truth: Consolidated document (/users/{uid}/portfolio/main)
      try {
        const consolidatedRef = doc(db, 'users', uid, 'portfolio', 'main');
        const consolidatedSnap = await getDoc(consolidatedRef);
        if (consolidatedSnap.exists()) {
          const d = consolidatedSnap.data();
          return {
            advisors: safeArray<Advisor>(d.advisors),
            portfolios: safeArray<AdvisorPortfolio>(d.portfolios),
            transactions: safeArray<Transaction>(d.transactions),
            dividends: safeArray<Dividend>(d.dividends),
            quotes: safeObject<Record<string, StockQuote>>(d.quotes),
          };
        }
      } catch (e) {
        console.warn('Consolidated doc read notice:', e);
      }

      // 2. Legacy Fallback: Root user doc portfolio field
      try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data()?.portfolio) {
          const p = userSnap.data().portfolio;
          return {
            advisors: safeArray<Advisor>(p.advisors),
            portfolios: safeArray<AdvisorPortfolio>(p.portfolios),
            transactions: safeArray<Transaction>(p.transactions),
            dividends: safeArray<Dividend>(p.dividends),
            quotes: safeObject<Record<string, StockQuote>>(p.quotes),
          };
        }
      } catch (e) {
        console.warn('Root user doc read notice:', e);
      }

      // 3. Subcollections Fallback
      const advisorsMap = new Map<string, Advisor>();
      const portfoliosMap = new Map<string, AdvisorPortfolio>();
      const transactionsMap = new Map<string, Transaction>();
      const dividendsMap = new Map<string, Dividend>();
      const quotesMap: Record<string, StockQuote> = {};

      const addAdvisor = (adv: any) => {
        if (!adv) return;
        const id = adv.id || `adv-${adv.name || Math.random().toString(36).substr(2, 6)}`;
        if (!advisorsMap.has(id)) {
          advisorsMap.set(id, {
            id,
            name: adv.name || 'Unnamed Advisor',
            type: adv.type || 'TRADING_AGENT',
            sebiRegNo: adv.sebiRegNo || undefined,
            color: adv.color || '#059669',
            badgeBg: adv.badgeBg || 'bg-emerald-50 text-emerald-700 border-emerald-200',
            description: adv.description || '',
            strategyStyle: adv.strategyStyle || 'Discretionary',
            feeStructure: adv.feeStructure || undefined,
            contactEmail: adv.contactEmail || undefined,
            createdAt: adv.createdAt || new Date().toISOString().split('T')[0],
          });
        }
      };

      const addPortfolio = (port: any) => {
        if (!port) return;
        const id = port.id || `port-${port.name || Math.random().toString(36).substr(2, 6)}`;
        if (!portfoliosMap.has(id)) {
          portfoliosMap.set(id, {
            id,
            advisorId: port.advisorId || '',
            name: port.name || 'Main Basket',
            type: port.type || 'CORE_LONG_TERM',
            description: port.description || '',
            targetAllocationPct: typeof port.targetAllocationPct === 'number' ? port.targetAllocationPct : undefined,
            color: port.color || undefined,
            createdAt: port.createdAt || new Date().toISOString().split('T')[0],
          });
        }
      };

      const addTransaction = (tx: any) => {
        if (!tx) return;
        const id = tx.id || `tx-${tx.symbol || Math.random().toString(36).substr(2, 6)}`;
        if (!transactionsMap.has(id)) {
          transactionsMap.set(id, {
            id,
            advisorId: tx.advisorId || '',
            portfolioId: tx.portfolioId || undefined,
            symbol: tx.symbol || '',
            name: tx.name || tx.symbol || '',
            sector: tx.sector || 'General',
            marketCap: tx.marketCap || 'Mid Cap',
            type: tx.type === 'SELL' ? 'SELL' : 'BUY',
            date: tx.date || new Date().toISOString().split('T')[0],
            quantity: Number(tx.quantity) || 0,
            price: Number(tx.price) || 0,
            charges: Number(tx.charges) || 0,
            notes: tx.notes || undefined,
            tradeTag: tx.tradeTag || undefined,
          });
        }
      };

      const addDividend = (div: any) => {
        if (!div) return;
        const id = div.id || `div-${div.symbol || Math.random().toString(36).substr(2, 6)}`;
        if (!dividendsMap.has(id)) {
          dividendsMap.set(id, {
            id,
            advisorId: div.advisorId || '',
            portfolioId: div.portfolioId || undefined,
            symbol: div.symbol || '',
            name: div.name || div.symbol || '',
            exDate: div.exDate || undefined,
            creditDate: div.creditDate || new Date().toISOString().split('T')[0],
            sharesEligible: Number(div.sharesEligible) || 0,
            perShareAmount: Number(div.perShareAmount) || 0,
            totalAmount: Number(div.totalAmount) || 0,
            tdsDeducted: typeof div.tdsDeducted === 'number' ? div.tdsDeducted : undefined,
            notes: div.notes || undefined,
          });
        }
      };

      const addQuote = (sym: string, q: any) => {
        if (!sym || !q) return;
        if (!quotesMap[sym]) {
          quotesMap[sym] = {
            symbol: sym,
            name: q.name || sym,
            sector: q.sector || 'General',
            marketCap: q.marketCap || 'Mid Cap',
            currentPrice: Number(q.currentPrice) || Number(q.price) || 0,
            dayChange: Number(q.dayChange) || 0,
            dayChangePercent: Number(q.dayChangePercent) || 0,
          };
        }
      };

      try {
        const advSnap = await getDocs(collection(db, 'users', uid, 'advisors'));
        advSnap.forEach((d) => addAdvisor({ ...d.data(), id: d.id || (d.data() as any).id }));
      } catch (e) {}

      try {
        const portSnap = await getDocs(collection(db, 'users', uid, 'portfolios'));
        portSnap.forEach((d) => addPortfolio({ ...d.data(), id: d.id || (d.data() as any).id }));
      } catch (e) {}

      try {
        const txSnap = await getDocs(collection(db, 'users', uid, 'transactions'));
        txSnap.forEach((d) => addTransaction({ ...d.data(), id: d.id || (d.data() as any).id }));
      } catch (e) {}

      try {
        const divSnap = await getDocs(collection(db, 'users', uid, 'dividends'));
        divSnap.forEach((d) => addDividend({ ...d.data(), id: d.id || (d.data() as any).id }));
      } catch (e) {}

      try {
        const quotesSnap = await getDocs(collection(db, 'users', uid, 'quotes'));
        quotesSnap.forEach((d) => {
          const q = d.data() as any;
          const sym = q.symbol || d.id;
          addQuote(sym, q);
        });
      } catch (e) {}

      const allAdvisors = Array.from(advisorsMap.values());
      const allPortfolios = Array.from(portfoliosMap.values());
      const allTransactions = Array.from(transactionsMap.values());
      const allDividends = Array.from(dividendsMap.values());

      if (allAdvisors.length > 0 || allTransactions.length > 0 || allPortfolios.length > 0 || allDividends.length > 0) {
        return {
          advisors: allAdvisors,
          portfolios: allPortfolios,
          transactions: allTransactions,
          dividends: allDividends,
          quotes: quotesMap,
        };
      }

      return null;
    } catch (e: any) {
      if (e?.code === 'resource-exhausted' || e?.message?.includes('Quota') || e?.message?.includes('quota')) {
        markQuotaExceeded();
        console.warn('Firestore quota reached on read; falling back to local storage.');
      } else {
        console.error('Failed to load user data from Firestore:', e);
      }
      return null;
    }
  };

  // Ultra-reliable Firestore write with batching and fallback
  const saveUserDataToCloud = useCallback(
    async (
      advisors: Advisor[],
      transactions: Transaction[],
      dividends: Dividend[],
      quotes: Record<string, StockQuote>,
      portfolios: AdvisorPortfolio[] = []
    ) => {
      // 1. Immediately persist to localStorage for instant browser safety
      try {
        localStorage.setItem('tradewise_advisors_v1', JSON.stringify(advisors || []));
        localStorage.setItem('tradewise_portfolios_v1', JSON.stringify(portfolios || []));
        localStorage.setItem('tradewise_transactions_v1', JSON.stringify(transactions || []));
        localStorage.setItem('tradewise_dividends_v1', JSON.stringify(dividends || []));
        localStorage.setItem('tradewise_quotes_v1', JSON.stringify(quotes || {}));
      } catch (err) {
        console.warn('LocalStorage save error:', err);
      }

      if (!user) {
        setIsCloudSynced(false);
        setSyncStatus('offline');
        return;
      }

      setSyncStatus('saving');
      try {
        const sanitizedAdvisors = deepSanitize(Array.isArray(advisors) ? advisors : []);
        const sanitizedPortfolios = deepSanitize(Array.isArray(portfolios) ? portfolios : []);
        const sanitizedTransactions = deepSanitize(Array.isArray(transactions) ? transactions : []);
        const sanitizedDividends = deepSanitize(Array.isArray(dividends) ? dividends : []);
        const sanitizedQuotes = deepSanitize(
          quotes && typeof quotes === 'object' && !Array.isArray(quotes) ? quotes : {}
        );

        const payload = {
          advisors: sanitizedAdvisors,
          portfolios: sanitizedPortfolios,
          transactions: sanitizedTransactions,
          dividends: sanitizedDividends,
          quotes: sanitizedQuotes,
          lastUpdated: new Date().toISOString(),
          dataVersion: '2.0',
        };

        // 1. Write to consolidated document
        const consolidatedRef = doc(db, 'users', user.uid, 'portfolio', 'main');
        await setDoc(consolidatedRef, payload, { merge: true });

        // 2. Also write to user root doc for maximum compatibility
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { portfolio: payload, lastLogin: new Date().toISOString() }, { merge: true });

        // 3. Write subcollections asynchronously so individual collection queries are also fully up to date
        try {
          const batch = writeBatch(db);
          let batchOps = 0;
          
          // Advisors
          sanitizedAdvisors.forEach((adv: any) => {
            if (adv?.id && batchOps < 450) {
              const r = doc(db, 'users', user.uid, 'advisors', adv.id);
              batch.set(r, { ...adv, userId: user.uid, updatedAt: new Date().toISOString() }, { merge: true });
              batchOps++;
            }
          });

          // Portfolios
          sanitizedPortfolios.forEach((port: any) => {
            if (port?.id && batchOps < 450) {
              const r = doc(db, 'users', user.uid, 'portfolios', port.id);
              batch.set(r, { ...port, userId: user.uid, updatedAt: new Date().toISOString() }, { merge: true });
              batchOps++;
            }
          });

          // Transactions
          sanitizedTransactions.forEach((tx: any) => {
            if (tx?.id && batchOps < 450) {
              const r = doc(db, 'users', user.uid, 'transactions', tx.id);
              batch.set(r, { ...tx, userId: user.uid, updatedAt: new Date().toISOString() }, { merge: true });
              batchOps++;
            }
          });

          // Dividends
          sanitizedDividends.forEach((div: any) => {
            if (div?.id && batchOps < 450) {
              const r = doc(db, 'users', user.uid, 'dividends', div.id);
              batch.set(r, { ...div, userId: user.uid, updatedAt: new Date().toISOString() }, { merge: true });
              batchOps++;
            }
          });

          if (batchOps > 0) {
            await batch.commit();
          }
        } catch (subErr) {
          console.warn('Subcollection sync notice (consolidated doc already saved):', subErr);
        }

        isQuotaHitRef.current = false;
        setIsQuotaExceeded(false);
        setIsCloudSynced(true);
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
      } catch (err: any) {
        if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota') || err?.message?.includes('quota')) {
          markQuotaExceeded();
          console.warn('Firestore daily write quota limit hit. Changes remain safely preserved in LocalStorage.');
        } else {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/portfolio/main`);
          setSyncStatus('error');
        }
      }
    },
    [user, markQuotaExceeded]
  );

  // Monitor Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        setSyncStatus('saving');
        try {
          // Fetch user data from consolidated single document or subcollections
          const loaded = await fetchAllUserData(currentUser.uid);
          if (loaded && (loaded.advisors.length > 0 || loaded.transactions.length > 0 || (loaded.portfolios && loaded.portfolios.length > 0))) {
            if (onCloudDataLoaded) {
              onCloudDataLoaded(loaded);
            }
            setIsCloudSynced(true);
            setSyncStatus('synced');
            setLastSyncedAt(new Date());
          } else {
            // Check if local storage has data from guest/offline session
            let localAdvisors: Advisor[] = [];
            try {
              const savedAdv = localStorage.getItem('tradewise_advisors_v1');
              if (savedAdv) {
                const parsed = JSON.parse(savedAdv);
                if (Array.isArray(parsed) && parsed.length > 0) localAdvisors = parsed;
              }
            } catch {}

            let localPortfolios: AdvisorPortfolio[] = [];
            try {
              const savedPort = localStorage.getItem('tradewise_portfolios_v1');
              if (savedPort) {
                const parsed = JSON.parse(savedPort);
                if (Array.isArray(parsed) && parsed.length > 0) localPortfolios = parsed;
              }
            } catch {}

            let localTransactions: Transaction[] = [];
            try {
              const savedTx = localStorage.getItem('tradewise_transactions_v1');
              if (savedTx) {
                const parsed = JSON.parse(savedTx);
                if (Array.isArray(parsed) && parsed.length > 0) localTransactions = parsed;
              }
            } catch {}

            let localDividends: Dividend[] = [];
            try {
              const savedDiv = localStorage.getItem('tradewise_dividends_v1');
              if (savedDiv) {
                const parsed = JSON.parse(savedDiv);
                if (Array.isArray(parsed) && parsed.length > 0) localDividends = parsed;
              }
            } catch {}

            let localQuotes: Record<string, StockQuote> = {};
            try {
              const savedQuotes = localStorage.getItem('tradewise_quotes_v1');
              if (savedQuotes) {
                const parsed = JSON.parse(savedQuotes);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                  localQuotes = parsed;
                }
              }
            } catch {}

            // If local storage is empty, initialize with default initial portfolio dataset
            const finalAdvisors = localAdvisors.length > 0 ? localAdvisors : INITIAL_ADVISORS;
            const finalPortfolios = localPortfolios.length > 0 ? localPortfolios : INITIAL_PORTFOLIOS;
            const finalTransactions = localTransactions.length > 0 ? localTransactions : INITIAL_TRANSACTIONS;
            const finalDividends = localDividends.length > 0 ? localDividends : INITIAL_DIVIDENDS;
            const finalQuotes = Object.keys(localQuotes).length > 0 ? localQuotes : INITIAL_STOCK_QUOTES;

            const payloadToSync: CloudPortfolioData = {
              advisors: finalAdvisors,
              portfolios: finalPortfolios,
              transactions: finalTransactions,
              dividends: finalDividends,
              quotes: finalQuotes,
            };

            if (onCloudDataLoaded) {
              onCloudDataLoaded(payloadToSync);
            }

            // Immediately persist to user's Cloud Firestore
            await saveUserDataToCloud(
              finalAdvisors,
              finalTransactions,
              finalDividends,
              finalQuotes,
              finalPortfolios
            );
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
  }, [markQuotaExceeded, onCloudDataLoaded, saveUserDataToCloud]);

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
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { portfolio: emptyData, lastLogin: new Date().toISOString() }, { merge: true });
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
      } catch (e: any) {
        if (e?.code === 'resource-exhausted' || e?.message?.includes('Quota') || e?.message?.includes('quota')) {
          markQuotaExceeded();
        }
      }
    }
  }, [user, onCloudDataLoaded, markQuotaExceeded]);

  const deleteAdvisorFromCloud = useCallback(async (advisorId: string) => {
    if (user && !isQuotaHitRef.current) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'advisors', advisorId));
      } catch (e) {}
    }
  }, [user]);

  const deletePortfolioFromCloud = useCallback(async (portfolioId: string) => {
    if (user && !isQuotaHitRef.current) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'portfolios', portfolioId));
      } catch (e) {}
    }
  }, [user]);

  const deleteTransactionFromCloud = useCallback(async (transactionId: string) => {
    if (user && !isQuotaHitRef.current) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'transactions', transactionId));
      } catch (e) {}
    }
  }, [user]);

  const deleteDividendFromCloud = useCallback(async (dividendId: string) => {
    if (user && !isQuotaHitRef.current) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'dividends', dividendId));
      } catch (e) {}
    }
  }, [user]);

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
        deletePortfolioFromCloud,
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
