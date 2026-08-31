import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Layers } from 'lucide-react';
import {
  INITIAL_ADVISORS,
  INITIAL_PORTFOLIOS,
  INITIAL_DIVIDENDS,
  INITIAL_STOCK_QUOTES,
  INITIAL_TRANSACTIONS,
} from './data/initialData';
import {
  Advisor,
  AdvisorPortfolio,
  Dividend,
  StockQuote,
  TimeframeFilter,
  Transaction,
} from './types/portfolio';
import { computePortfolioMetrics } from './utils/portfolioMath';
import { AuthProvider, useAuth, CloudPortfolioData } from './context/AuthContext';
import { Header } from './components/Header';
import { TimeframeBar } from './components/TimeframeBar';
import { NavigationTabs, ActiveTab } from './components/NavigationTabs';
import { OverviewView } from './components/OverviewView';
import { AdvisorDetailView } from './components/AdvisorDetailView';
import { ConsolidatedKiteView } from './components/ConsolidatedKiteView';
import { ExitedTradesView } from './components/ExitedTradesView';
import { DividendsView } from './components/DividendsView';
import { TradeLedgerView } from './components/TradeLedgerView';
import { TradeModal } from './components/modals/TradeModal';
import { DividendModal } from './components/modals/DividendModal';
import { AdvisorManagerModal } from './components/modals/AdvisorManagerModal';
import { ImportExportModal } from './components/modals/ImportExportModal';
import { AuthModal } from './components/modals/AuthModal';

const STORAGE_KEYS = {
  ADVISORS: 'tradewise_advisors_v1',
  PORTFOLIOS: 'tradewise_portfolios_v1',
  TRANSACTIONS: 'tradewise_transactions_v1',
  DIVIDENDS: 'tradewise_dividends_v1',
  QUOTES: 'tradewise_quotes_v1',
};

interface PortfolioAppContentProps {
  cloudLoadedData: CloudPortfolioData | null;
}

function PortfolioAppContent({ cloudLoadedData }: PortfolioAppContentProps) {
  const {
    user,
    loading,
    saveUserDataToCloud,
    deleteAdvisorFromCloud,
    deletePortfolioFromCloud,
    deleteTransactionFromCloud,
    deleteDividendFromCloud,
    clearAllUserData,
    initialSyncDone,
  } = useAuth();

  // Load state from localStorage or fallback to clean initial dataset
  const [advisors, setAdvisors] = useState<Advisor[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ADVISORS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved advisors:', e);
      }
    }
    return INITIAL_ADVISORS;
  });

  const [portfolios, setPortfolios] = useState<AdvisorPortfolio[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PORTFOLIOS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to parse saved portfolios:', e);
      }
    }
    return INITIAL_PORTFOLIOS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to parse saved transactions:', e);
      }
    }
    return INITIAL_TRANSACTIONS;
  });

  const [dividends, setDividends] = useState<Dividend[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DIVIDENDS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to parse saved dividends:', e);
      }
    }
    return INITIAL_DIVIDENDS;
  });

  const [quotes, setQuotes] = useState<Record<string, StockQuote>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.QUOTES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to parse saved quotes:', e);
      }
    }
    return INITIAL_STOCK_QUOTES;
  });

  // Reset all portfolio data to 0
  const handleResetAllData = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    lastSavedSnapshotRef.current = JSON.stringify({ a: [], p: [], t: [], d: [] });
    
    setAdvisors([]);
    setPortfolios([]);
    setTransactions([]);
    setDividends([]);
    setQuotes({});
    setSelectedAdvisorId('');

    const storageKeysToClear = [
      STORAGE_KEYS.ADVISORS,
      STORAGE_KEYS.PORTFOLIOS,
      STORAGE_KEYS.TRANSACTIONS,
      STORAGE_KEYS.DIVIDENDS,
      STORAGE_KEYS.QUOTES,
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
    ];
    storageKeysToClear.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (e) {}
    });

    await clearAllUserData();
  };

  // Sync state when cloud data is loaded from Firestore for logged in user
  useEffect(() => {
    if (cloudLoadedData) {
      setAdvisors(Array.isArray(cloudLoadedData.advisors) ? cloudLoadedData.advisors : []);
      setPortfolios(Array.isArray(cloudLoadedData.portfolios) ? cloudLoadedData.portfolios : []);
      setTransactions(Array.isArray(cloudLoadedData.transactions) ? cloudLoadedData.transactions : []);
      setDividends(Array.isArray(cloudLoadedData.dividends) ? cloudLoadedData.dividends : []);
      setQuotes(
        cloudLoadedData.quotes && typeof cloudLoadedData.quotes === 'object' && !Array.isArray(cloudLoadedData.quotes)
          ? cloudLoadedData.quotes
          : {}
      );
    }
  }, [cloudLoadedData]);

  // Active view, filters and sidebar collapse state
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>(() => advisors[0]?.id || '');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('tradewise_sidebar_collapsed') === 'true';
  });
  const [timeframe, setTimeframe] = useState<TimeframeFilter>({
    preset: 'ALL',
    label: 'All-Time',
  });

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('tradewise_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Keep selectedAdvisorId valid when advisors change
  useEffect(() => {
    if (advisors.length > 0 && (!selectedAdvisorId || !advisors.some((a) => a.id === selectedAdvisorId))) {
      setSelectedAdvisorId(advisors[0].id);
    }
  }, [advisors, selectedAdvisorId]);

  // Modal controls
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isDividendModalOpen, setIsDividendModalOpen] = useState(false);
  const [isAdvisorModalOpen, setIsAdvisorModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [targetModalAdvisorId, setTargetModalAdvisorId] = useState<string | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Local storage persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ADVISORS, JSON.stringify(advisors));
  }, [advisors]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PORTFOLIOS, JSON.stringify(portfolios));
  }, [portfolios]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DIVIDENDS, JSON.stringify(dividends));
  }, [dividends]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes));
  }, [quotes]);

  // Debounced auto-save to Cloud Firestore when user is authenticated and initial sync has finished
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);
  const lastSavedSnapshotRef = useRef<string>('');
  const latestQuotesRef = useRef(quotes);
  latestQuotesRef.current = quotes;

  // When cloud data is loaded, update last saved snapshot so we don't immediately bounce back a write
  useEffect(() => {
    if (cloudLoadedData) {
      lastSavedSnapshotRef.current = JSON.stringify({
        a: cloudLoadedData.advisors || [],
        p: cloudLoadedData.portfolios || [],
        t: cloudLoadedData.transactions || [],
        d: cloudLoadedData.dividends || [],
      });
    }
  }, [cloudLoadedData]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!user || !initialSyncDone) return;

    const currentSnapshot = JSON.stringify({
      a: advisors,
      p: portfolios,
      t: transactions,
      d: dividends,
    });

    if (currentSnapshot === lastSavedSnapshotRef.current) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      lastSavedSnapshotRef.current = currentSnapshot;
      saveUserDataToCloud(advisors, transactions, dividends, latestQuotesRef.current, portfolios);
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [user, initialSyncDone, advisors, transactions, dividends, portfolios, saveUserDataToCloud]);

  // Compute multi-advisor performance metrics
  const portfolioMetrics = useMemo(() => {
    return computePortfolioMetrics(advisors, transactions, dividends, quotes, timeframe, portfolios);
  }, [advisors, transactions, dividends, quotes, timeframe, portfolios]);

  // Overlap stock list
  const overlapStockList = useMemo(() => {
    return portfolioMetrics.consolidatedHoldings
      .filter((h) => h.isMultiAdvisor)
      .map((h) => ({
        symbol: h.symbol,
        name: h.name,
        advisorCount: h.advisorBuckets.length,
        advisors: h.advisorBuckets.map((b) => b.advisorName),
      }));
  }, [portfolioMetrics.consolidatedHoldings]);

  // Stock price refresh
  const handleRefreshQuotes = () => {
    if (Object.keys(quotes).length === 0) return;
    setIsRefreshing(true);
    setTimeout(() => {
      setQuotes((prev) => {
        const next: Record<string, StockQuote> = { ...prev };
        Object.keys(next).forEach((sym) => {
          const q = next[sym];
          if (!q || typeof q.currentPrice !== 'number') return;
          const changeFactor = 1 + (Math.random() * 0.02 - 0.01);
          const newPrice = Number((q.currentPrice * changeFactor).toFixed(2));
          const dayChange = typeof q.dayChange === 'number' ? q.dayChange : 0;
          const diff = Number((newPrice - (q.currentPrice - dayChange)).toFixed(2));
          const basePrice = q.currentPrice - dayChange || 1;
          const diffPct = Number(((diff / basePrice) * 100).toFixed(2));

          next[sym] = {
            ...q,
            currentPrice: newPrice,
            dayChange: diff,
            dayChangePercent: diffPct,
          };
        });
        return next;
      });
      setIsRefreshing(false);
    }, 400);
  };

  // Actions
  const handleSaveTrade = (tradeData: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...tradeData,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const nextTx = [newTx, ...transactions];
    setTransactions(nextTx);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(nextTx));

    let nextQuotes = quotes;
    if (!quotes[tradeData.symbol]) {
      nextQuotes = {
        ...quotes,
        [tradeData.symbol]: {
          symbol: tradeData.symbol,
          name: tradeData.name,
          sector: tradeData.sector,
          marketCap: tradeData.marketCap,
          currentPrice: tradeData.price,
          dayChange: 0,
          dayChangePercent: 0,
        },
      };
      setQuotes(nextQuotes);
      localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(nextQuotes));
    }

    if (user) {
      saveUserDataToCloud(advisors, nextTx, dividends, nextQuotes, portfolios);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    const nextTx = transactions.filter((t) => t.id !== id);
    setTransactions(nextTx);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(nextTx));
    if (user) {
      deleteTransactionFromCloud(id);
      saveUserDataToCloud(advisors, nextTx, dividends, quotes, portfolios);
    }
  };

  const handleSaveDividend = (divData: Omit<Dividend, 'id'>) => {
    const newDiv: Dividend = {
      ...divData,
      id: `div-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const nextDiv = [newDiv, ...dividends];
    setDividends(nextDiv);
    localStorage.setItem(STORAGE_KEYS.DIVIDENDS, JSON.stringify(nextDiv));
    if (user) {
      saveUserDataToCloud(advisors, transactions, nextDiv, quotes, portfolios);
    }
  };

  const handleDeleteDividend = (id: string) => {
    const nextDiv = dividends.filter((d) => d.id !== id);
    setDividends(nextDiv);
    localStorage.setItem(STORAGE_KEYS.DIVIDENDS, JSON.stringify(nextDiv));
    if (user) {
      deleteDividendFromCloud(id);
      saveUserDataToCloud(advisors, transactions, nextDiv, quotes, portfolios);
    }
  };

  const handleAddAdvisor = (advData: Omit<Advisor, 'id' | 'createdAt'>) => {
    const newAdv: Advisor = {
      ...advData,
      id: `adv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    const nextAdv = [...advisors, newAdv];
    setAdvisors(nextAdv);
    localStorage.setItem(STORAGE_KEYS.ADVISORS, JSON.stringify(nextAdv));
    if (!selectedAdvisorId) {
      setSelectedAdvisorId(newAdv.id);
    }
    if (user) {
      saveUserDataToCloud(nextAdv, transactions, dividends, quotes, portfolios);
    }
  };

  const handleUpdateAdvisor = (updatedAdv: Advisor) => {
    const nextAdv = advisors.map((a) => (a.id === updatedAdv.id ? updatedAdv : a));
    setAdvisors(nextAdv);
    localStorage.setItem(STORAGE_KEYS.ADVISORS, JSON.stringify(nextAdv));
    if (user) {
      saveUserDataToCloud(nextAdv, transactions, dividends, quotes, portfolios);
    }
  };

  const handleDeleteAdvisor = (id: string) => {
    const nextAdv = advisors.filter((a) => a.id !== id);
    const nextPort = portfolios.filter((p) => p.advisorId !== id);
    setAdvisors(nextAdv);
    setPortfolios(nextPort);
    localStorage.setItem(STORAGE_KEYS.ADVISORS, JSON.stringify(nextAdv));
    localStorage.setItem(STORAGE_KEYS.PORTFOLIOS, JSON.stringify(nextPort));
    if (user) {
      deleteAdvisorFromCloud(id);
      saveUserDataToCloud(nextAdv, transactions, dividends, quotes, nextPort);
    }
  };

  // Portfolio handlers
  const handleAddPortfolio = (portData: Omit<AdvisorPortfolio, 'id' | 'createdAt'>) => {
    const newPort: AdvisorPortfolio = {
      ...portData,
      id: `port-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    const nextPort = [...portfolios, newPort];
    setPortfolios(nextPort);
    localStorage.setItem(STORAGE_KEYS.PORTFOLIOS, JSON.stringify(nextPort));
    if (user) {
      saveUserDataToCloud(advisors, transactions, dividends, quotes, nextPort);
    }
  };

  const handleUpdatePortfolio = (updatedPort: AdvisorPortfolio) => {
    const nextPort = portfolios.map((p) => (p.id === updatedPort.id ? updatedPort : p));
    setPortfolios(nextPort);
    localStorage.setItem(STORAGE_KEYS.PORTFOLIOS, JSON.stringify(nextPort));
    if (user) {
      saveUserDataToCloud(advisors, transactions, dividends, quotes, nextPort);
    }
  };

  const handleDeletePortfolio = (id: string) => {
    const nextPort = portfolios.filter((p) => p.id !== id);
    setPortfolios(nextPort);
    localStorage.setItem(STORAGE_KEYS.PORTFOLIOS, JSON.stringify(nextPort));
    if (user) {
      deletePortfolioFromCloud(id);
      saveUserDataToCloud(advisors, transactions, dividends, quotes, nextPort);
    }
  };

  const handleSelectAdvisorDetail = (advId: string) => {
    setSelectedAdvisorId(advId);
    setActiveTab('advisor_drilldown');
  };

  const handleOpenTradeForAdvisor = (advId: string) => {
    setTargetModalAdvisorId(advId);
    setIsTradeModalOpen(true);
  };

  const handleOpenDividendForAdvisor = (advId: string) => {
    setTargetModalAdvisorId(advId);
    setIsDividendModalOpen(true);
  };

  const handleImportTransactions = (newTx: Transaction[]) => {
    const nextTx = [...newTx, ...transactions];
    setTransactions(nextTx);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(nextTx));
    if (user) {
      saveUserDataToCloud(advisors, nextTx, dividends, quotes, portfolios);
    }
  };

  const handleImportDividends = (newDivs: Dividend[]) => {
    const nextDiv = [...newDivs, ...dividends];
    setDividends(nextDiv);
    localStorage.setItem(STORAGE_KEYS.DIVIDENDS, JSON.stringify(nextDiv));
    if (user) {
      saveUserDataToCloud(advisors, transactions, nextDiv, quotes, portfolios);
    }
  };

  const handleUpdateQuotesFromImport = (quotesToUpdate: Record<string, Partial<StockQuote>>) => {
    setQuotes((prev) => {
      const next = { ...prev };
      Object.entries(quotesToUpdate).forEach(([sym, partialQuote]) => {
        if (next[sym]) {
          next[sym] = { ...next[sym], ...partialQuote } as StockQuote;
        } else if (partialQuote.currentPrice) {
          next[sym] = {
            symbol: sym,
            name: partialQuote.name || sym,
            sector: partialQuote.sector || 'Diversified',
            marketCap: partialQuote.marketCap || 'MID',
            currentPrice: partialQuote.currentPrice,
            dayChange: partialQuote.dayChange || 0,
            dayChangePercent: partialQuote.dayChangePercent || 0,
          };
        }
      });
      localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(next));
      if (user) {
        saveUserDataToCloud(advisors, transactions, dividends, next, portfolios);
      }
      return next;
    });
  };

  const activeTabMeta = {
    overview: {
      title: 'Overview & Allocation',
      subtitle: 'Multi-advisor performance, returns, demat value, and asset allocation breakdown',
    },
    advisor_drilldown: {
      title: 'Advisor Deep Dive',
      subtitle: 'Individual advisory performance metrics, active holdings, and transaction history',
    },
    kite_reconciliation: {
      title: 'Consolidated Demat Portfolio',
      subtitle: 'Live unified portfolio across all advisors with multi-advisor overlap detection',
    },
    exited_trades: {
      title: 'Exited Trades & Realized P&L',
      subtitle: 'Historical closed positions, realized gains & losses, and holding periods',
    },
    dividends: {
      title: 'Dividend Income Tracker',
      subtitle: 'Corporate dividend payouts, yield on cost, and monthly cashflows received',
    },
    tradebook: {
      title: 'Tradebook & Transaction Ledger',
      subtitle: 'Chronological transaction logs, buy/sell executions, and rebalancing audit trail',
    },
  }[activeTab];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div className="rounded-xl bg-slate-900 p-2 text-white">
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <span className="text-sm font-medium text-slate-700">Loading your portfolio...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <AuthModal isOpen={true} onClose={() => {}} allowClose={false} onResetAllData={handleResetAllData} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased">
      
      {/* Top Header with App Logo, Live Stock Bar, and Global Actions */}
      <Header
        grandTotalCurrentValue={portfolioMetrics.grandTotalCurrentValue}
        grandTotalNetGain={portfolioMetrics.grandTotalNetGain}
        grandTotalNetReturnPct={portfolioMetrics.grandTotalNetReturnPct}
        grandTotalDividends={portfolioMetrics.grandTotalDividends}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        onOpenTradeModal={() => {
          setTargetModalAdvisorId(undefined);
          setIsTradeModalOpen(true);
        }}
        onOpenDividendModal={() => {
          setTargetModalAdvisorId(undefined);
          setIsDividendModalOpen(true);
        }}
        onOpenAdvisorModal={() => setIsAdvisorModalOpen(true)}
        onOpenImportExportModal={() => setIsImportExportModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onRefreshQuotes={handleRefreshQuotes}
        isRefreshing={isRefreshing}
        quotes={quotes}
      />

      {/* App Body: Collapsible Left Sidebar + Main Content */}
      <div className="flex-1 flex min-h-[calc(100vh-61px)]">
        {/* Left Side Navigation */}
        <NavigationTabs
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          advisorCount={advisors.length}
          overlapCount={overlapStockList.length}
          exitedTradesCount={portfolioMetrics.allExitedTrades.length}
          dividendsCount={dividends.length}
          transactionsCount={transactions.length}
          onOpenTradeModal={() => {
            setTargetModalAdvisorId(undefined);
            setIsTradeModalOpen(true);
          }}
          onOpenDividendModal={() => {
            setTargetModalAdvisorId(undefined);
            setIsDividendModalOpen(true);
          }}
          onOpenAdvisorModal={() => setIsAdvisorModalOpen(true)}
          onOpenImportExportModal={() => setIsImportExportModalOpen(true)}
        />

        {/* Main Section */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-[1600px] mx-auto w-full">

          {/* Main Section Header / View Title & Aligned Timeframe Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200/80">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                {activeTabMeta.title}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {activeTabMeta.subtitle}
              </p>
            </div>

            <div className="shrink-0">
              <TimeframeBar
                currentFilter={timeframe}
                timeframe={timeframe}
                onFilterChange={setTimeframe}
                onSelectTimeframe={setTimeframe}
              />
            </div>
          </div>

          {/* View Switcher based on Active Navigation Tab */}
          {activeTab === 'overview' && (
            <OverviewView
              advisorPerformances={portfolioMetrics.advisorPerformances}
              grandTotalInvested={portfolioMetrics.grandTotalInvested}
              grandTotalCurrentValue={portfolioMetrics.grandTotalCurrentValue}
              grandTotalUnrealizedPnL={portfolioMetrics.grandTotalUnrealizedPnL}
              grandTotalRealizedPnL={portfolioMetrics.grandTotalRealizedPnL}
              grandTotalDividends={portfolioMetrics.grandTotalDividends}
              grandTotalNetGain={portfolioMetrics.grandTotalNetGain}
              grandTotalNetReturnPct={portfolioMetrics.grandTotalNetReturnPct}
              overallXIRR={portfolioMetrics.overallXIRR}
              stockOverlaps={overlapStockList}
              timeframe={timeframe}
              onSelectAdvisor={handleSelectAdvisorDetail}
              onNavigateToOverlap={() => setActiveTab('kite_reconciliation')}
              onNavigateToExitedTrades={() => setActiveTab('exited_trades')}
              onOpenAdvisorModal={() => setIsAdvisorModalOpen(true)}
              onOpenImportExportModal={() => setIsImportExportModalOpen(true)}
            />
          )}

          {activeTab === 'advisor_drilldown' && (
            <AdvisorDetailView
              advisorPerformances={portfolioMetrics.advisorPerformances}
              selectedAdvisorId={selectedAdvisorId}
              onSelectAdvisorId={setSelectedAdvisorId}
              timeframe={timeframe}
              onAddTradeForAdvisor={handleOpenTradeForAdvisor}
              onAddDividendForAdvisor={handleOpenDividendForAdvisor}
            />
          )}

          {activeTab === 'kite_reconciliation' && (
            <ConsolidatedKiteView
              consolidatedHoldings={portfolioMetrics.consolidatedHoldings}
              onSelectAdvisor={handleSelectAdvisorDetail}
            />
          )}

          {activeTab === 'exited_trades' && (
            <ExitedTradesView
              allExitedTrades={portfolioMetrics.allExitedTrades}
              advisors={advisors}
              portfolios={portfolios}
            />
          )}

          {activeTab === 'dividends' && (
            <DividendsView
              dividends={dividends}
              advisors={advisors}
              grandTotalInvested={portfolioMetrics.grandTotalInvested}
              onOpenAddDividendModal={() => {
                setTargetModalAdvisorId(undefined);
                setIsDividendModalOpen(true);
              }}
              onDeleteDividend={handleDeleteDividend}
            />
          )}

          {activeTab === 'tradebook' && (
            <TradeLedgerView
              transactions={transactions}
              advisors={advisors}
              portfolios={portfolios}
              onOpenTradeModal={() => {
                setTargetModalAdvisorId(undefined);
                setIsTradeModalOpen(true);
              }}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

        </main>
      </div>

      {/* Modals */}
      <TradeModal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        advisors={advisors}
        portfolios={portfolios}
        quotes={quotes}
        defaultAdvisorId={targetModalAdvisorId || selectedAdvisorId}
        onSaveTrade={handleSaveTrade}
      />

      <DividendModal
        isOpen={isDividendModalOpen}
        onClose={() => setIsDividendModalOpen(false)}
        advisors={advisors}
        quotes={quotes}
        defaultAdvisorId={targetModalAdvisorId || selectedAdvisorId}
        onSaveDividend={handleSaveDividend}
      />

      <AdvisorManagerModal
        isOpen={isAdvisorModalOpen}
        onClose={() => setIsAdvisorModalOpen(false)}
        advisors={advisors}
        portfolios={portfolios}
        onAddAdvisor={handleAddAdvisor}
        onUpdateAdvisor={handleUpdateAdvisor}
        onDeleteAdvisor={handleDeleteAdvisor}
        onAddPortfolio={handleAddPortfolio}
        onUpdatePortfolio={handleUpdatePortfolio}
        onDeletePortfolio={handleDeletePortfolio}
      />

      <ImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        advisors={advisors}
        transactions={transactions}
        dividends={dividends}
        quotes={quotes}
        onImportTransactions={handleImportTransactions}
        onImportDividends={handleImportDividends}
        onUpdateQuotes={handleUpdateQuotesFromImport}
        onResetAllData={handleResetAllData}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onResetAllData={handleResetAllData}
      />

    </div>
  );
}

export default function App() {
  const [cloudLoadedData, setCloudLoadedData] = useState<CloudPortfolioData | null>(null);

  const handleCloudDataLoaded = (data: CloudPortfolioData) => {
    localStorage.setItem(STORAGE_KEYS.ADVISORS, JSON.stringify(data.advisors || []));
    localStorage.setItem(STORAGE_KEYS.PORTFOLIOS, JSON.stringify(data.portfolios || []));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data.transactions || []));
    localStorage.setItem(STORAGE_KEYS.DIVIDENDS, JSON.stringify(data.dividends || []));
    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(data.quotes || {}));
    setCloudLoadedData(data);
  };

  return (
    <AuthProvider onCloudDataLoaded={handleCloudDataLoaded}>
      <PortfolioAppContent cloudLoadedData={cloudLoadedData} />
    </AuthProvider>
  );
}
