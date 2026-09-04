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
  getDocsFromServer,
  getDocFromServer,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
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
  clearAllTradesFromCloud: (advisorId?: string) => Promise<void>;
  testFirestoreWrite: () => Promise<void>;
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
  const firestoreQueueRef = useRef<Promise<void>>(Promise.resolve());
  const resetInProgressRef = useRef(false);
  const syncGenerationRef = useRef(0);

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
          const rawPorts = safeArray<any>(d.portfolios);
          const portfolios: AdvisorPortfolio[] = rawPorts.map((p) => ({
            ...p,
            status: (p.status || '').toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
            activationDate: p.activationDate || p.createdAt || new Date().toISOString().split('T')[0],
            deactivationDate: p.deactivationDate || undefined,
          }));
          return {
            advisors: safeArray<Advisor>(d.advisors),
            portfolios,
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
          const rawPorts = safeArray<any>(p.portfolios);
          const portfolios: AdvisorPortfolio[] = rawPorts.map((port) => ({
            ...port,
            status: (port.status || '').toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
            activationDate: port.activationDate || port.createdAt || new Date().toISOString().split('T')[0],
            deactivationDate: port.deactivationDate || undefined,
          }));
          return {
            advisors: safeArray<Advisor>(p.advisors),
            portfolios,
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
          const rawStatus = (port.status || '').toUpperCase();
          const status = rawStatus === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
          const activationDate = port.activationDate || port.createdAt || new Date().toISOString().split('T')[0];
          const deactivationDate = port.deactivationDate || undefined;

          portfoliosMap.set(id, {
            id,
            advisorId: port.advisorId || '',
            name: port.name || 'Main Basket',
            type: port.type || 'CORE_LONG_TERM',
            status,
            activationDate,
            deactivationDate,
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
      portfolios: AdvisorPortfolio[] = [],
      targetUid?: string
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

      const activeUid = targetUid || auth.currentUser?.uid || user?.uid;
      if (!activeUid || !auth.currentUser) {
        setIsCloudSynced(false);
        setSyncStatus('offline');
        return;
      }

      const saveOperation = firestoreQueueRef.current.catch(() => undefined).then(async () => {
        if (resetInProgressRef.current) return;

        setSyncStatus('saving');
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
        const consolidatedRef = doc(db, 'users', activeUid, 'portfolio', 'main');
        await setDoc(consolidatedRef, payload, { merge: true });

        // 2. Also write to user root doc for maximum compatibility
        const userRef = doc(db, 'users', activeUid);
        await setDoc(userRef, { portfolio: payload, lastLogin: new Date().toISOString(), initialized: true }, { merge: true });

        const collections = [
          ['advisors', sanitizedAdvisors],
          ['portfolios', sanitizedPortfolios],
          ['transactions', sanitizedTransactions],
          ['dividends', sanitizedDividends],
        ] as const;
        for (const [collectionName, records] of collections) {
          for (let start = 0; start < records.length; start += 450) {
            const batch = writeBatch(db);
            records.slice(start, start + 450).forEach((record: any) => {
              if (record?.id) {
                const recordRef = doc(db, 'users', activeUid, collectionName, record.id);
                batch.set(recordRef, { ...record, userId: activeUid, updatedAt: new Date().toISOString() }, { merge: true });
              }
            });
            await batch.commit();
          }
        }

        isQuotaHitRef.current = false;
        setIsQuotaExceeded(false);
        setIsCloudSynced(true);
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
      }).catch((err: any) => {
        console.error('Error saving user data to Firestore:', err);
        try {
          handleFirestoreError(err, OperationType.WRITE, `users/${activeUid}`);
        } catch (structuredError) {
          console.error(structuredError);
        }
        if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota') || err?.message?.includes('quota')) {
          markQuotaExceeded();
          console.warn('Firestore daily write quota limit hit. Changes remain safely preserved in LocalStorage.');
        } else if (err?.code === 'permission-denied' || err?.message?.includes('permission') || err?.message?.includes('Permissions')) {
          console.warn('Firestore permission notice:', err?.message || err);
          setSyncStatus('error');
        } else {
          setSyncStatus('error');
        }
      });
      firestoreQueueRef.current = saveOperation.catch(() => undefined);
      await saveOperation;
    },
    [user, markQuotaExceeded]
  );

  const testFirestoreWrite = useCallback(async () => {
    const activeUid = auth.currentUser?.uid || user?.uid;
    if (!activeUid || !auth.currentUser) {
      throw new Error('You must be signed in before testing a Firestore write.');
    }

    const testPath = `users/${activeUid}/firestore_poc/test`;
    try {
      await setDoc(doc(db, 'users', activeUid, 'firestore_poc', 'test'), {
        userId: activeUid,
        message: 'Firestore write test succeeded',
        writtenAt: serverTimestamp(),
      }, { merge: true });
    } catch (error: any) {
      const code = error?.code ? ` [${error.code}]` : '';
      throw new Error(`${error?.message || String(error)}${code} Path: ${testPath}`);
    }
  }, [user]);

  // Monitor Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const syncGeneration = ++syncGenerationRef.current;
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        setSyncStatus('saving');
        try {
          // Fetch user data from consolidated single document or subcollections
          const loaded = await fetchAllUserData(currentUser.uid);
          if (syncGeneration !== syncGenerationRef.current || resetInProgressRef.current) return;
          if (loaded !== null) {
            // User document exists in cloud (even if empty after reset)
            if (onCloudDataLoaded) {
              onCloudDataLoaded(loaded);
            }
            setIsCloudSynced(true);
            setSyncStatus('synced');
            setLastSyncedAt(new Date());
          } else {
            // A new account starts empty. Do not seed or upload local data.
            onCloudDataLoaded?.({
              advisors: [],
              portfolios: [],
              transactions: [],
              dividends: [],
              quotes: {},
            });
            setIsCloudSynced(true);
            setSyncStatus('synced');
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
  }, [markQuotaExceeded, onCloudDataLoaded, saveUserDataToCloud]);

  // Complete reset to clean 0 state: deletes all subcollections & resets cloud + local data
  const clearAllUserData = useCallback(async () => {
    // 1. Wipe all local storage keys
    const storageKeysToClear = [
      'tradewise_advisors_v1',
      'tradewise_portfolios_v1',
      'tradewise_transactions_v1',
      'tradewise_dividends_v1',
      'tradewise_quotes_v1',
      'multi_advisor_portfolio_advisors_v1',
      'multi_advisor_portfolio_portfolios_v1',
      'multi_advisor_portfolio_transactions_v1',
      'multi_advisor_portfolio_dividends_v1',
      'multi_advisor_portfolio_quotes_v1',
      'tradewise_active_tab',
      'tradewise_timeframe',
    ];
    storageKeysToClear.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });

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

    const activeUid = auth.currentUser?.uid || user?.uid;
    if (activeUid && auth.currentUser) {
      syncGenerationRef.current++;
      resetInProgressRef.current = true;
      setSyncStatus('saving');
      const resetOperation = firestoreQueueRef.current.catch(() => undefined).then(async () => {
        const subcollections = ['advisors', 'portfolios', 'transactions', 'dividends', 'quotes'];
        for (const subcollectionName of subcollections) {
          try {
            const snapshot = await getDocs(collection(db, 'users', activeUid, subcollectionName));
            for (let start = 0; start < snapshot.docs.length; start += 450) {
              const batch = writeBatch(db);
              snapshot.docs.slice(start, start + 450).forEach((documentSnapshot) => batch.delete(documentSnapshot.ref));
              await batch.commit();
            }
          } catch (scErr) {
            console.warn(`Error clearing subcollection ${subcollectionName}:`, scErr);
          }
        }

        // Set consolidated document to clean zero state
        await setDoc(doc(db, 'users', activeUid, 'portfolio', 'main'), {
          advisors: [],
          portfolios: [],
          transactions: [],
          dividends: [],
          quotes: {},
          lastUpdated: new Date().toISOString(),
          dataVersion: '2.0',
        });

        // Set user doc to empty portfolio
        await setDoc(doc(db, 'users', activeUid), {
          portfolio: {
            advisors: [],
            portfolios: [],
            transactions: [],
            dividends: [],
            quotes: {},
            lastUpdated: new Date().toISOString(),
            dataVersion: '2.0',
          },
          lastResetAt: new Date().toISOString(),
          initialized: true,
        }, { merge: true });

        setIsCloudSynced(true);
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
      }).catch((e: any) => {
        console.error('Error clearing cloud data:', e);
        if (e?.code === 'resource-exhausted' || e?.message?.includes('Quota') || e?.message?.includes('quota')) {
          markQuotaExceeded();
        } else {
          setSyncStatus('error');
        }
      }).finally(() => {
        resetInProgressRef.current = false;
      });
      firestoreQueueRef.current = resetOperation.catch(() => undefined);
      await resetOperation;
    }
  }, [user, onCloudDataLoaded, markQuotaExceeded]);

  // Clean up trades specifically: removes trade transactions while preserving Advisors and Portfolios
  const clearAllTradesFromCloud = useCallback(
    async (advisorId?: string) => {
      // 1. Immediately update LocalStorage transactions for instant safety
      try {
        if (advisorId) {
          const raw = localStorage.getItem('tradewise_transactions_v1');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const remaining = parsed.filter((t: any) => t.advisorId !== advisorId);
              localStorage.setItem('tradewise_transactions_v1', JSON.stringify(remaining));
            }
          }
        } else {
          localStorage.setItem('tradewise_transactions_v1', JSON.stringify([]));
        }
      } catch (err) {
        console.warn('LocalStorage clear trades error:', err);
      }

      const activeUid = auth.currentUser?.uid || user?.uid;
      if (!activeUid || !auth.currentUser) {
        setIsCloudSynced(false);
        setSyncStatus('offline');
        return;
      }

      syncGenerationRef.current++;
      setSyncStatus('saving');

      const operation = firestoreQueueRef.current.catch(() => undefined).then(async () => {
        // 1. Delete matching documents from subcollection
        try {
          const snapshot = await getDocs(collection(db, 'users', activeUid, 'transactions'));
          const toDelete = advisorId
            ? snapshot.docs.filter((d) => d.data()?.advisorId === advisorId)
            : snapshot.docs;

          for (let start = 0; start < toDelete.length; start += 450) {
            const batch = writeBatch(db);
            toDelete.slice(start, start + 450).forEach((documentSnapshot) => {
              batch.delete(documentSnapshot.ref);
            });
            await batch.commit();
          }
        } catch (subErr) {
          console.warn('Subcollection transaction delete warning:', subErr);
        }

        // 2. Update consolidated document
        const consolidatedRef = doc(db, 'users', activeUid, 'portfolio', 'main');
        try {
          const mainSnap = await getDoc(consolidatedRef);
          if (mainSnap.exists()) {
            const existingData = mainSnap.data();
            const existingTxs: Transaction[] = Array.isArray(existingData.transactions) ? existingData.transactions : [];
            const remainingTxs = advisorId
              ? existingTxs.filter((t) => t.advisorId !== advisorId)
              : [];
            await setDoc(
              consolidatedRef,
              {
                ...existingData,
                transactions: remainingTxs,
                lastUpdated: new Date().toISOString(),
              },
              { merge: true }
            );
          } else {
            await setDoc(
              consolidatedRef,
              {
                transactions: [],
                lastUpdated: new Date().toISOString(),
                dataVersion: '2.0',
              },
              { merge: true }
            );
          }
        } catch (mainErr) {
          console.warn('Consolidated doc update warning:', mainErr);
        }

        // 3. Update root user doc
        try {
          const userRef = doc(db, 'users', activeUid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists() && userSnap.data()?.portfolio) {
            const p = userSnap.data().portfolio;
            const existingTxs = Array.isArray(p.transactions) ? p.transactions : [];
            const remainingTxs = advisorId
              ? existingTxs.filter((t: any) => t.advisorId !== advisorId)
              : [];
            await setDoc(
              userRef,
              {
                portfolio: {
                  ...p,
                  transactions: remainingTxs,
                  lastUpdated: new Date().toISOString(),
                },
              },
              { merge: true }
            );
          }
        } catch (userErr) {
          console.warn('Root user doc update warning:', userErr);
        }

        setIsCloudSynced(true);
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
      }).catch((e: any) => {
        console.error('Error clearing trades in cloud:', e);
        if (e?.code === 'resource-exhausted' || e?.message?.includes('Quota') || e?.message?.includes('quota')) {
          markQuotaExceeded();
        } else {
          setSyncStatus('error');
        }
      });

      firestoreQueueRef.current = operation.catch(() => undefined);
      await operation;
    },
    [user, markQuotaExceeded]
  );

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
        clearAllTradesFromCloud,
        testFirestoreWrite,
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
