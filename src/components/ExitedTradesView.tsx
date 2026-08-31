import React, { useState } from 'react';
import {
  History,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  Calendar,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Briefcase,
} from 'lucide-react';
import { Advisor, AdvisorPortfolio, ExitedTrade } from '../types/portfolio';
import { formatINR, formatPercent } from '../utils/portfolioMath';

interface ExitedTradesViewProps {
  allExitedTrades: ExitedTrade[];
  advisors: Advisor[];
  portfolios?: AdvisorPortfolio[];
}

export const ExitedTradesView: React.FC<ExitedTradesViewProps> = ({
  allExitedTrades,
  advisors,
  portfolios = [],
}) => {
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>('ALL');
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'WINS' | 'LOSSES'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'pnl_desc' | 'pnl_asc'>('date_desc');

  const advisorMap = new Map<string, Advisor>(advisors.map((a) => [a.id, a]));

  const relevantPortfolios = selectedAdvisorId === 'ALL'
    ? portfolios
    : portfolios.filter((p) => p.advisorId === selectedAdvisorId);

  const filteredTrades = allExitedTrades.filter((trade) => {
    if (selectedAdvisorId !== 'ALL' && trade.advisorId !== selectedAdvisorId) return false;
    if (selectedPortfolioId !== 'ALL' && trade.portfolioId !== selectedPortfolioId) return false;
    if (outcomeFilter === 'WINS' && trade.realizedGain <= 0) return false;
    if (outcomeFilter === 'LOSSES' && trade.realizedGain > 0) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        trade.symbol.toLowerCase().includes(q) ||
        trade.name.toLowerCase().includes(q) ||
        (trade.portfolioName && trade.portfolioName.toLowerCase().includes(q))
      );
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'date_desc') return new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime();
    if (sortBy === 'date_asc') return new Date(a.sellDate).getTime() - new Date(b.sellDate).getTime();
    if (sortBy === 'pnl_desc') return b.realizedGain - a.realizedGain;
    if (sortBy === 'pnl_asc') return a.realizedGain - b.realizedGain;
    return 0;
  });

  const totalRealizedGain = filteredTrades.reduce((sum, t) => sum + t.realizedGain, 0);
  const winTrades = filteredTrades.filter((t) => t.realizedGain > 0);
  const lossTrades = filteredTrades.filter((t) => t.realizedGain <= 0);
  const winRate = filteredTrades.length > 0 ? (winTrades.length / filteredTrades.length) * 100 : 0;
  const avgHoldingDays =
    filteredTrades.length > 0
      ? Math.round(filteredTrades.reduce((sum, t) => sum + t.holdingDays, 0) / filteredTrades.length)
      : 0;

  const bestTrade = [...filteredTrades].sort((a, b) => b.realizedGain - a.realizedGain)[0];
  const worstTrade = [...filteredTrades].sort((a, b) => a.realizedGain - b.realizedGain)[0];

  return (
    <div className="space-y-6">
      
      {/* Informational Callout */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
          <History className="w-4 h-4" />
          <span>Historical Exited Trades & Loss Archive</span>
        </div>
        <h2 className="text-xl font-bold text-white">
          Complete Audit Trail of Closed Positions
        </h2>
        <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
          Standard broker apps like Zerodha Kite only show current active holdings and remove closed trades from your dashboard once sold. This archive tracks every exited trade, calculates exact net realized profits or losses, holding durations, and attributes them to the responsible advisor and portfolio strategy.
        </p>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Realized Net P&L</span>
          <span className={`text-base font-extrabold mt-0.5 block ${totalRealizedGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatINR(totalRealizedGain)}
          </span>
          <span className="text-[10px] text-slate-500">{filteredTrades.length} Total Exits</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Win Rate</span>
          <span className="text-base font-extrabold text-slate-900 mt-0.5 block">{(winRate ?? 0).toFixed(1)}%</span>
          <span className="text-[10px] text-slate-500">{winTrades.length} Wins / {lossTrades.length} Losses</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Avg Holding Time</span>
          <span className="text-base font-bold text-slate-900 mt-0.5 block">{avgHoldingDays} Days</span>
          <span className="text-[10px] text-slate-500">From entry to exit</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Profitable Trades</span>
          <span className="text-base font-bold text-emerald-600 mt-0.5 block">{winTrades.length}</span>
          <span className="text-[10px] text-slate-500">
            Avg: +{formatINR(winTrades.length > 0 ? winTrades.reduce((s, t) => s + t.realizedGain, 0) / winTrades.length : 0)}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Loss Trades</span>
          <span className="text-base font-bold text-rose-600 mt-0.5 block">{lossTrades.length}</span>
          <span className="text-[10px] text-slate-500">
            Avg: {formatINR(lossTrades.length > 0 ? lossTrades.reduce((s, t) => s + t.realizedGain, 0) / lossTrades.length : 0)}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Best Exit Trade</span>
          {bestTrade ? (
            <>
              <span className="text-xs font-bold text-emerald-600 mt-0.5 block truncate">
                {bestTrade.symbol} ({formatINR(bestTrade.realizedGain)})
              </span>
              <span className="text-[10px] text-slate-500">+{(bestTrade.returnPercentage ?? 0).toFixed(1)}%</span>
            </>
          ) : (
            <span className="text-xs text-slate-400 mt-1 block">None</span>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Advisor Filter */}
          <select
            value={selectedAdvisorId}
            onChange={(e) => {
              setSelectedAdvisorId(e.target.value);
              setSelectedPortfolioId('ALL');
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden"
          >
            <option value="ALL">All Advisors ({advisors.length})</option>
            {advisors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Portfolio Filter */}
          {portfolios.length > 0 && (
            <select
              value={selectedPortfolioId}
              onChange={(e) => setSelectedPortfolioId(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden"
            >
              <option value="ALL">All Portfolios ({relevantPortfolios.length})</option>
              {relevantPortfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Win / Loss Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setOutcomeFilter('ALL')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                outcomeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Outcomes ({allExitedTrades.length})
            </button>
            <button
              onClick={() => setOutcomeFilter('WINS')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                outcomeFilter === 'WINS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Winners Only ({allExitedTrades.filter((t) => t.realizedGain > 0).length})
            </button>
            <button
              onClick={() => setOutcomeFilter('LOSSES')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                outcomeFilter === 'LOSSES' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Losses Only ({allExitedTrades.filter((t) => t.realizedGain <= 0).length})
            </button>
          </div>
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search stock or portfolio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-hidden"
          >
            <option value="date_desc">Exit Date (Newest)</option>
            <option value="date_asc">Exit Date (Oldest)</option>
            <option value="pnl_desc">Highest Profit</option>
            <option value="pnl_asc">Biggest Loss</option>
          </select>
        </div>

      </div>

      {/* Exited Trades Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredTrades.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No exited trades match your selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                  <th className="py-3.5 px-4">Stock & Tag</th>
                  <th className="py-3.5 px-4">Advisor & Portfolio</th>
                  <th className="py-3.5 px-4">Entry Date</th>
                  <th className="py-3.5 px-4">Exit Date</th>
                  <th className="py-3.5 px-4 text-right">Holding</th>
                  <th className="py-3.5 px-4 text-right">Quantity</th>
                  <th className="py-3.5 px-4 text-right">Buy Avg</th>
                  <th className="py-3.5 px-4 text-right">Sell Price</th>
                  <th className="py-3.5 px-4 text-right">Net Realized P&L</th>
                  <th className="py-3.5 px-4 text-right">Return %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTrades.map((trade) => {
                  const advisor = advisorMap.get(trade.advisorId);
                  const isGain = trade.realizedGain >= 0;

                  return (
                    <tr key={trade.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {isGain ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          )}
                          <span>{trade.symbol}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{trade.name}</div>
                        {trade.notes && (
                          <div className="text-[10px] text-indigo-600 font-medium mt-0.5 truncate max-w-xs">
                            {trade.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: advisor?.color || '#94a3b8' }}
                          />
                          <span className="font-semibold text-slate-800">{advisor?.name || trade.advisorId}</span>
                        </div>
                        {trade.portfolioName && (
                          <div className="flex items-center gap-1 text-[10px] text-indigo-700 font-medium mt-0.5">
                            <Briefcase className="w-2.5 h-2.5" />
                            <span>{trade.portfolioName}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600">{trade.buyDate}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{trade.sellDate}</td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700">{trade.holdingDays}d</td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-800">{trade.quantity}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">{formatINR(trade.avgBuyPrice)}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{formatINR(trade.sellPrice)}</td>

                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className={`font-extrabold ${isGain ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatINR(trade.realizedGain)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Charges: {formatINR(trade.charges || 0)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                          isGain ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {formatPercent(trade.returnPercentage)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
