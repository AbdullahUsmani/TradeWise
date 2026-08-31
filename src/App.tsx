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
import { PortfolioProvider, usePortfolioData } from './context/PortfolioDataContext';
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

const isLegacyData = (advList: any[]) => {
  return Array.isArray(advList) && advList.some((a) => ['Ethica Invest', 'Capital Mind Momentum', 'Niveshaay Smallcap', 'Growth Momentum Smallcase'].includes(a.name));
};

function PortfolioAppContent() {
  const { data, loading, save } = usePortfolioData();

  const [advisors, setAdvisors] = useState<Advisor[]>(INITIAL_ADVISORS);
  const [portfolios, setPortfolios] = useState<AdvisorPortfolio[]>(INITIAL_PORTFOLIOS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [dividends, setDividends] = useState<Dividend[]>(INITIAL_DIVIDENDS);
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>(INITIAL_STOCK_QUOTES);

  useEffect(() => {
    if (isLegacyData(data.advisors)) {
      setAdvisors([]);
      setPortfolios([]);
      setTransactions([]);
      setDividends([]);
      setQuotes({});
      return;
    }

    setAdvisors(Array.isArray(data.advisors) ? data.advisors : []);
    setPortfolios(Array.isArray(data.portfolios) ? data.portfolios : []);
    setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
    setDividends(Array.isArray(data.dividends) ? data.dividends : []);
    setQuotes(data.quotes && typeof data.quotes === 'object' && !Array.isArray(data.quotes) ? data.quotes : {});
  }, [data]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>('');
  const [timeframe, setTimeframe] = useState<TimeframeFilter>({
    preset: 'ALL',
    label: 'All-Time',
  });

  useEffect(() => {
    if (advisors.length > 0 && (!selectedAdvisorId || !advisors.some((a) => a.id === selectedAdvisorId))) {
      setSelectedAdvisorId(advisors[0].id);
    }
  }, [advisors, selectedAdvisorId]);

  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isDividendModalOpen, setIsDividendModalOpen] = useState(false);
  const [isAdvisorModalOpen, setIsAdvisorModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [targetModalAdvisorId, setTargetModalAdvisorId] = useState<string | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleResetAllData = async () => {
    setAdvisors([]);
    setPortfolios([]);
    setTransactions([]);
    setDividends([]);
    setQuotes({});
    setSelectedAdvisorId('');
    await save({ advisors: [], portfolios: [], transactions: [], dividends: [], quotes: {} });
  };

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshotRef = useRef<string>('');
  const latestQuotesRef = useRef(quotes);
  latestQuotesRef.current = quotes;

  useEffect(() => {
    if (!data) return;
    lastSavedSnapshotRef.current = JSON.stringify({
      a: data.advisors || [],
      p: data.portfolios || [],
      t: data.transactions || [],
      d: data.dividends || [],
    });
  }, [data]);

  useEffect(() => {
    if (!data) return;

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
      void save({ advisors, portfolios, transactions, dividends, quotes: latestQuotesRef.current });
    }, 700);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [advisors, portfolios, transactions, dividends, data, save]);

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

  const portfolioMetrics = useMemo(() => {
    return computePortfolioMetrics(advisors, transactions, dividends, quotes, timeframe, portfolios);
  }, [advisors, transactions, dividends, quotes, timeframe, portfolios]);

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

  const handleSaveTrade = (tradeData: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...tradeData,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    setTransactions((prev) => [newTx, ...prev]);

    if (!quotes[tradeData.symbol]) {
      setQuotes((prev) => ({
        ...prev,
        [tradeData.symbol]: {
          symbol: tradeData.symbol,
          name: tradeData.name,
          sector: tradeData.sector,
          marketCap: tradeData.marketCap,
          currentPrice: tradeData.price,
          dayChange: 0,
          dayChangePercent: 0,
        },
      }));
    }
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveDividend = (divData: Omit<Dividend, 'id'>) => {
    const newDiv: Dividend = {
      ...divData,
      id: `div-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    setDividends((prev) => [newDiv, ...prev]);
  };

  const handleDeleteDividend = (id: string) => {
    setDividends((prev) => prev.filter((d) => d.id !== id));
  };

  const handleAddAdvisor = (advData: Omit<Advisor, 'id' | 'createdAt'>) => {
    const newAdv: Advisor = {
      ...advData,
      id: `adv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setAdvisors((prev) => [...prev, newAdv]);
    if (!selectedAdvisorId) {
      setSelectedAdvisorId(newAdv.id);
    }
  };

  const handleUpdateAdvisor = (updatedAdv: Advisor) => {
    setAdvisors((prev) => prev.map((a) => (a.id === updatedAdv.id ? updatedAdv : a)));
  };

  const handleDeleteAdvisor = (id: string) => {
    setAdvisors((prev) => prev.filter((a) => a.id !== id));
    setPortfolios((prev) => prev.filter((p) => p.advisorId !== id));
  };

  const handleAddPortfolio = (portData: Omit<AdvisorPortfolio, 'id' | 'createdAt'>) => {
    const newPort: AdvisorPortfolio = {
      ...portData,
      id: `port-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setPortfolios((prev) => [...prev, newPort]);
  };

  const handleUpdatePortfolio = (updatedPort: AdvisorPortfolio) => {
    setPortfolios((prev) => prev.map((p) => (p.id === updatedPort.id ? updatedPort : p)));
  };

  const handleDeletePortfolio = (id: string) => {
    setPortfolios((prev) => prev.filter((p) => p.id !== id));
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
      return next;
    });
  };

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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased">
      <Header
        grandTotalCurrentValue={portfolioMetrics.grandTotalCurrentValue}
        grandTotalNetGain={portfolioMetrics.grandTotalNetGain}
        grandTotalNetReturnPct={portfolioMetrics.grandTotalNetReturnPct}
        grandTotalDividends={portfolioMetrics.grandTotalDividends}
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
        onRefreshQuotes={handleRefreshQuotes}
        isRefreshing={isRefreshing}
        quotes={quotes}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <NavigationTabs
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            advisorCount={advisors.length}
            overlapCount={overlapStockList.length}
            exitedTradesCount={portfolioMetrics.allExitedTrades.length}
            dividendsCount={dividends.length}
            transactionsCount={transactions.length}
          />

          <TimeframeBar
            currentFilter={timeframe}
            timeframe={timeframe}
            onFilterChange={setTimeframe}
            onSelectTimeframe={setTimeframe}
          />
        </div>

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
        onImportTransactions={(newTx) => setTransactions((prev) => [...newTx, ...prev])}
        onImportDividends={(newDivs) => setDividends((prev) => [...newDivs, ...prev])}
        onUpdateQuotes={handleUpdateQuotesFromImport}
        onResetAllData={handleResetAllData}
      />
    </div>
  );
}

export default function App() {
  return (
    <PortfolioProvider>
      <PortfolioAppContent />
    </PortfolioProvider>
  );
}
