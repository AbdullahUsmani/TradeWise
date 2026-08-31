import React, { useState } from 'react';
import {
  Layers,
  AlertTriangle,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { ConsolidatedDematStock } from '../types/portfolio';
import { formatINR, formatPercent } from '../utils/portfolioMath';

interface ConsolidatedKiteViewProps {
  consolidatedHoldings: ConsolidatedDematStock[];
  onSelectAdvisor: (advisorId: string) => void;
}

export const ConsolidatedKiteView: React.FC<ConsolidatedKiteViewProps> = ({
  consolidatedHoldings,
  onSelectAdvisor,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'overlaps_only'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStocks, setExpandedStocks] = useState<Record<string, boolean>>({
    RELIANCE: true,
    TATAMOTORS: true,
    INFY: true,
  });

  const toggleExpand = (symbol: string) => {
    setExpandedStocks((prev) => ({ ...prev, [symbol]: !prev[symbol] }));
  };

  const filteredHoldings = consolidatedHoldings.filter((stock) => {
    if (filterMode === 'overlaps_only' && !stock.isMultiAdvisor) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return stock.symbol.toLowerCase().includes(q) || stock.name.toLowerCase().includes(q);
    }
    return true;
  });

  const overlapCount = consolidatedHoldings.filter((s) => s.isMultiAdvisor).length;
  const overlapCapital = consolidatedHoldings
    .filter((s) => s.isMultiAdvisor)
    .reduce((sum, s) => sum + s.totalCurrentValue, 0);

  return (
    <div className="space-y-6">
      
      {/* Informational Hero Card explaining Kite Holdings Reconciliation */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-400/30">
            <Layers className="w-3.5 h-3.5" />
            <span>Kite / Broker Demat Reconciliation</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Single Demat Account, Multiple Advisor Allocations
          </h2>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            When you execute trades for multiple advisors, research analysts, or smallcase baskets in the same Zerodha Demat account, Kite combines all purchases into a single blended average price. TradeWise breaks down your Demat holdings by advisor so you can measure individual performance accurately.
          </p>
          
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="text-slate-400">Total Demat Stocks: </span>
              <strong className="text-white">{consolidatedHoldings.length}</strong>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="text-slate-400">Cross-Advisor Overlaps: </span>
              <strong className="text-amber-400">{overlapCount} Stocks</strong>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="text-slate-400">Capital in Overlaps: </span>
              <strong className="text-emerald-400">{formatINR(overlapCapital, true)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        
        {/* Toggle Mode */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
              filterMode === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Demat Holdings ({consolidatedHoldings.length})
          </button>
          <button
            onClick={() => setFilterMode('overlaps_only')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition ${
              filterMode === 'overlaps_only'
                ? 'bg-amber-100 text-amber-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Overlaps Only ({overlapCount})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search stock symbol or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

      </div>

      {/* Consolidated Stocks Cards / List */}
      <div className="space-y-4">
        {filteredHoldings.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
            No holdings match your filter criteria.
          </div>
        ) : (
          filteredHoldings.map((stock) => {
            const isExpanded = !!expandedStocks[stock.symbol];
            const isPos = stock.totalUnrealizedPnL >= 0;

            return (
              <div
                key={stock.symbol}
                className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                  stock.isMultiAdvisor
                    ? 'border-amber-200 ring-1 ring-amber-400/20'
                    : 'border-slate-200'
                }`}
              >
                {/* Consolidated Stock Header Row */}
                <div
                  onClick={() => toggleExpand(stock.symbol)}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-800 shrink-0 text-xs border border-slate-200">
                      {stock.symbol.substring(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900">{stock.symbol}</h3>
                        <span className="text-xs text-slate-500 font-medium">{stock.name}</span>
                        {stock.isMultiAdvisor && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Multi-Advisor ({stock.advisorBuckets.length} Portfolios)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>{stock.sector}</span>
                        <span>•</span>
                        <span>{stock.marketCap} Cap</span>
                        <span>•</span>
                        <span>LTP: <strong className="text-slate-800 font-mono">{formatINR(stock.currentPrice)}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side Stats */}
                  <div className="flex items-center justify-between lg:justify-end gap-6 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Kite Demat Qty</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{stock.totalQuantity} shares</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Avg: {formatINR(stock.blendedAvgPrice)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Current Value</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{formatINR(stock.totalCurrentValue)}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Inv: {formatINR(stock.totalInvested)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Unrealized P&L</span>
                      <span className={`font-mono font-bold text-sm ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatINR(stock.totalUnrealizedPnL)}
                      </span>
                      <span className={`text-[10px] font-semibold block ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatPercent(stock.unrealizedReturnPct)}
                      </span>
                    </div>

                    <div className="p-1.5 text-slate-400 hover:text-slate-700 transition">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Advisor Attribution Breakdown */}
                {isExpanded && (
                  <div className="bg-slate-50/90 border-t border-slate-200/80 p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        Advisor Breakdown for {stock.symbol} in your Demat:
                      </span>
                      <span className="text-slate-500">
                        {stock.advisorBuckets.length} Advisor Portfolio Bucket{stock.advisorBuckets.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {stock.advisorBuckets.map((bucket) => {
                        const bucketIsPos = bucket.unrealizedPnL >= 0;
                        return (
                          <div
                            key={bucket.advisorId}
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: bucket.advisorColor }}
                                  />
                                  <span className="font-bold text-xs text-slate-900">{bucket.advisorName}</span>
                                </div>
                                <span className="text-[11px] font-bold text-indigo-600 font-mono">
                                  {(bucket.weightInStock ?? 0).toFixed(1)}% of Demat
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-medium">Advisor Qty</span>
                                  <span className="font-mono font-bold text-slate-800">{bucket.quantity} shares</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-medium">Advisor Avg Price</span>
                                  <span className="font-mono text-slate-700">{formatINR(bucket.avgPrice)}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-medium">Invested Basis</span>
                                  <span className="font-mono text-slate-700">{formatINR(bucket.investedAmount)}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-medium">Current Value</span>
                                  <span className="font-mono font-bold text-slate-900">{formatINR(bucket.currentValue)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                              <span className="text-[11px] text-slate-500">Unrealized Gain:</span>
                              <div className="text-right">
                                <span className={`font-mono font-bold ${bucketIsPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {formatINR(bucket.unrealizedPnL)}
                                </span>
                                <span className={`text-[10px] ml-1 font-semibold ${bucketIsPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  ({formatPercent(bucket.unrealizedReturnPct)})
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
