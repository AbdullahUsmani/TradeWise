import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Coins,
  ShieldCheck,
  Building,
  PieChart as PieIcon,
  BarChart2,
  Calendar,
  Layers,
  History,
  Info,
  ArrowRight,
  ExternalLink,
  Briefcase,
  Folder,
  SlidersHorizontal,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { AdvisorPerformance, TimeframeFilter } from '../types/portfolio';
import { formatINR, formatPercent } from '../utils/portfolioMath';
import { exportSingleAdvisorReport, exportPortfoliosCSV } from '../utils/exportUtils';

interface AdvisorDetailViewProps {
  advisorPerformances: AdvisorPerformance[];
  selectedAdvisorId: string;
  onSelectAdvisorId: (id: string) => void;
  timeframe: TimeframeFilter;
  onAddTradeForAdvisor: (advisorId: string) => void;
  onAddDividendForAdvisor: (advisorId: string) => void;
}

export const AdvisorDetailView: React.FC<AdvisorDetailViewProps> = ({
  advisorPerformances,
  selectedAdvisorId,
  onSelectAdvisorId,
  timeframe,
  onAddTradeForAdvisor,
  onAddDividendForAdvisor,
}) => {
  const currentPerf =
    advisorPerformances.find((ap) => ap.advisor.id === selectedAdvisorId) ||
    advisorPerformances[0];

  const [activeTabSection, setActiveTabSection] = useState<'holdings' | 'portfolios' | 'allocation' | 'exits' | 'dividends'>('holdings');
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('ALL');

  const {
    advisor,
    portfolios = [],
    portfolioPerformances = [],
    activeHoldings = [],
    exitedTrades = [],
    dividends = [],
  } = currentPerf || {};

  // Filtered dataset based on selected portfolio
  const filteredHoldings = useMemo(() => {
    if (!activeHoldings) return [];
    if (selectedPortfolioId === 'ALL') return activeHoldings;
    return activeHoldings.filter((h) => h.portfolioId === selectedPortfolioId);
  }, [activeHoldings, selectedPortfolioId]);

  const filteredExits = useMemo(() => {
    if (!exitedTrades) return [];
    if (selectedPortfolioId === 'ALL') return exitedTrades;
    return exitedTrades.filter((e) => e.portfolioId === selectedPortfolioId);
  }, [exitedTrades, selectedPortfolioId]);

  const activePortPerf = useMemo(() => {
    if (!portfolioPerformances || selectedPortfolioId === 'ALL') return null;
    return portfolioPerformances.find((p) => p.portfolio.id === selectedPortfolioId) || null;
  }, [portfolioPerformances, selectedPortfolioId]);

  if (!currentPerf || !advisor) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-lg mx-auto my-8 shadow-xs">
        <Building className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 mb-1">No Advisors Added Yet</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Add your advisory agency, SEBI RIA, or smallcase basket using the <strong className="text-slate-700">Advisors</strong> button in the top navigation bar.
        </p>
      </div>
    );
  }

  // Derived metrics for current view (overall or specific portfolio)
  const displayInvested = activePortPerf ? activePortPerf.totalInvestedActive : currentPerf.totalInvestedActive;
  const displayCurrentValue = activePortPerf ? activePortPerf.totalCurrentValue : currentPerf.totalCurrentValue;
  const displayUnrealizedPnL = activePortPerf ? activePortPerf.unrealizedPnL : currentPerf.unrealizedPnL;
  const displayUnrealizedReturnPct = activePortPerf ? activePortPerf.unrealizedReturnPct : currentPerf.unrealizedReturnPct;
  const displayRealizedPnL = activePortPerf ? activePortPerf.realizedPnL : currentPerf.realizedPnL;
  const displayNetGain = activePortPerf ? activePortPerf.totalNetGain : currentPerf.totalNetGain;
  const displayNetReturnPct = activePortPerf ? activePortPerf.netReturnPct : currentPerf.netReturnPct;
  const displayXirr = activePortPerf ? activePortPerf.xirrEstimate : currentPerf.xirrEstimate;

  // Colors palette for stocks
  const stockColors = [
    '#4F46E5', '#059669', '#D97706', '#0284C7', '#7C3AED',
    '#E11D48', '#0D9488', '#EA580C', '#475569', '#65A30D',
  ];

  // Data for within-agent stock allocation pie/bar
  const stockAllocationData = filteredHoldings.map((h, idx) => ({
    name: h.symbol,
    fullName: h.name,
    weight: Number((h.weightWithinAdvisor ?? 0).toFixed(2)),
    invested: h.investedAmount,
    currentValue: h.currentValue,
    portfolioName: h.portfolioName || 'General',
    color: stockColors[idx % stockColors.length],
  })).sort((a, b) => b.weight - a.weight);

  return (
    <div className="space-y-6">
      
      {/* Advisor Switcher Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {advisorPerformances.map((ap) => {
          const isSelected = ap.advisor.id === selectedAdvisorId;
          return (
            <button
              key={ap.advisor.id}
              id={`btn-select-adv-${ap.advisor.id}`}
              onClick={() => {
                onSelectAdvisorId(ap.advisor.id);
                setSelectedPortfolioId('ALL');
              }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-white border-indigo-600 text-indigo-900 shadow-sm ring-2 ring-indigo-500/20'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: ap.advisor.color }}
              />
              <span>{ap.advisor.name}</span>
              <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                {(ap.portfolioSharePct ?? 0).toFixed(1)}% of AUM
              </span>
            </button>
          );
        })}
      </div>

      {/* Advisor Main Profile & Stats Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md shrink-0"
              style={{ backgroundColor: advisor.color }}
            >
              {advisor.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">{advisor.name}</h2>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${advisor.badgeBg}`}>
                  {advisor.type === 'SEBI_RIA' ? 'SEBI Registered RIA' : advisor.type === 'SMALLCASE' ? 'Smallcase Model' : advisor.type === 'TRADING_AGENT' ? 'Active Trading Agent' : 'Self-Directed'}
                </span>
                {advisor.sebiRegNo && (
                  <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                    SEBI Reg: {advisor.sebiRegNo}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                {advisor.description}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500 font-medium">
                <span>Style: <strong className="text-slate-700">{advisor.strategyStyle}</strong></span>
                {advisor.feeStructure && (
                  <span>Fee Model: <strong className="text-slate-700">{advisor.feeStructure}</strong></span>
                )}
                <span>Portfolios: <strong className="text-slate-700">{portfolios.length} Configured</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id={`btn-export-advisor-report-${advisor.id}`}
              onClick={() => exportSingleAdvisorReport(advisor, portfolios, activeHoldings)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
              title="Export this advisor's holdings and portfolio attribution as CSV"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => onAddDividendForAdvisor(advisor.id)}
              className="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition cursor-pointer"
            >
              + Log Dividend
            </button>
            <button
              type="button"
              onClick={() => onAddTradeForAdvisor(advisor.id)}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition cursor-pointer"
            >
              + Log Trade
            </button>
          </div>

        </div>

        {/* Portfolio Filter Chips Bar */}
        {portfolios.length > 0 && (
          <div className="flex items-center gap-2 pt-4 pb-1 overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              <span>Portfolio Filter:</span>
            </span>
            <button
              onClick={() => setSelectedPortfolioId('ALL')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition shrink-0 ${
                selectedPortfolioId === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Strategy Portfolios ({activeHoldings.length} stocks)
            </button>
            {portfolios.map((p) => {
              const count = activeHoldings.filter((h) => h.portfolioId === p.id).length;
              const isSel = selectedPortfolioId === p.id;
              const isInactive = p.status === 'INACTIVE';
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPortfolioId(p.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                    isSel
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isInactive
                      ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Briefcase className="w-3 h-3" />
                  <span>{p.name}</span>
                  {isInactive && (
                    <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${isSel ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-200 text-slate-600'}`}>
                      Inactive
                    </span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSel ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Advisor Performance Metric Strip (Updates when portfolio is selected) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-5">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Capital Invested</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{formatINR(displayInvested)}</span>
            <span className="text-[10px] font-bold text-indigo-600">
              {(currentPerf.portfolioSharePct ?? 0).toFixed(1)}% of total portfolio
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Current Valuation</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{formatINR(displayCurrentValue)}</span>
            <span className="text-[10px] text-slate-500">{filteredHoldings.length} Active Stocks</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Unrealized P&L</span>
            <span className={`text-sm font-bold mt-0.5 block ${displayUnrealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatINR(displayUnrealizedPnL)}
            </span>
            <span className="text-[10px] font-semibold text-slate-600">{formatPercent(displayUnrealizedReturnPct)}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Realized Exits P&L</span>
            <span className={`text-sm font-bold mt-0.5 block ${displayRealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatINR(displayRealizedPnL)}
            </span>
            <span className="text-[10px] text-slate-500">
              {filteredExits.length} Exits
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Dividends Earned</span>
            <span className="text-sm font-bold text-amber-600 mt-0.5 block">{formatINR(currentPerf.totalDividends)}</span>
            <span className="text-[10px] text-slate-500">Yield: {(currentPerf.dividendYieldOnInvested ?? 0).toFixed(2)}%</span>
          </div>

          <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Net Total Gain</span>
            <span className={`text-sm font-extrabold mt-0.5 block ${displayNetGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatINR(displayNetGain)}
            </span>
            <span className="text-[10px] font-bold text-indigo-900">
              {formatPercent(displayNetReturnPct)} (XIRR {formatPercent(displayXirr)})
            </span>
          </div>
        </div>

      </div>

      {/* Primary Section: Tabs for Holdings, Portfolios Breakdown, Allocation, Exits, Dividends */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-indigo-600" />
              {selectedPortfolioId === 'ALL'
                ? `Holdings & Allocations for ${advisor.name}`
                : `Portfolio: ${activePortPerf?.portfolio.name || selectedPortfolioId}`}
            </h3>
            <p className="text-xs text-slate-500">
              {selectedPortfolioId === 'ALL'
                ? `Segregated performance across ${portfolios.length} strategy portfolios.`
                : `Dedicated metrics for this specific strategy book.`}
            </p>
          </div>

          {/* Sub Tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl flex-wrap">
            <button
              onClick={() => setActiveTabSection('holdings')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                activeTabSection === 'holdings'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active Stocks ({filteredHoldings.length})
            </button>
            {portfolios.length > 0 && (
              <button
                onClick={() => setActiveTabSection('portfolios')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  activeTabSection === 'portfolios'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Portfolios ({portfolios.length})
              </button>
            )}
            <button
              onClick={() => setActiveTabSection('allocation')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                activeTabSection === 'allocation'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Visual Weights
            </button>
            <button
              onClick={() => setActiveTabSection('exits')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                activeTabSection === 'exits'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Exited Trades ({filteredExits.length})
            </button>
            <button
              onClick={() => setActiveTabSection('dividends')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                activeTabSection === 'dividends'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dividends ({dividends.length})
            </button>
          </div>
        </div>

        {/* Tab: Portfolios Breakdown Cards */}
        {activeTabSection === 'portfolios' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Strategy Baskets ({portfolios.length})
              </span>
              {portfolios.length > 0 && (
                <button
                  type="button"
                  id={`btn-export-advisor-portfolios-${advisor.id}`}
                  onClick={() => exportPortfoliosCSV(portfolios, [advisor])}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                  title="Export these portfolios as CSV"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export Portfolios CSV</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolioPerformances.map((pp) => {
              const isGain = pp.unrealizedPnL >= 0;
              const isPortInactive = pp.portfolio.status === 'INACTIVE';
              return (
                <div
                  key={pp.portfolio.id}
                  onClick={() => {
                    setSelectedPortfolioId(pp.portfolio.id);
                    setActiveTabSection('holdings');
                  }}
                  className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    isPortInactive
                      ? 'border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 opacity-90'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <Briefcase className={`w-4 h-4 ${isPortInactive ? 'text-slate-400' : 'text-indigo-600'}`} />
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">{pp.portfolio.name}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                            isPortInactive
                              ? 'bg-slate-200 text-slate-600 border border-slate-300'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isPortInactive ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'
                            }`}
                          />
                          {isPortInactive ? 'Inactive' : 'Active'}
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {pp.portfolio.type}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Invested</span>
                        <span className="font-mono font-bold text-slate-800">{formatINR(pp.totalInvestedActive)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Valuation</span>
                        <span className="font-mono font-bold text-slate-900">{formatINR(pp.totalCurrentValue)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Unrealized P&L</span>
                        <span className={`font-mono font-bold ${isGain ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatINR(pp.unrealizedPnL)} ({formatPercent(pp.unrealizedReturnPct)})
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Active Stocks</span>
                        <span className="font-mono font-bold text-slate-800">{pp.activeHoldings.length} stocks</span>
                      </div>
                    </div>

                    {/* Activation / Deactivation Dates */}
                    <div className="pt-2 mt-2 border-t border-slate-100 space-y-0.5 text-[10px]">
                      <div className="flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Activation Date:</span>
                        <strong className="font-mono text-slate-800">
                          {pp.portfolio.activationDate || pp.portfolio.createdAt}
                        </strong>
                      </div>
                      {isPortInactive && (
                        <div className="flex items-center gap-1 text-amber-800">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          <span>Deactivation Date:</span>
                          <strong className="font-mono">{pp.portfolio.deactivationDate || 'N/A'}</strong>
                        </div>
                      )}
                    </div>

                    {pp.portfolio.description && (
                      <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">{pp.portfolio.description}</p>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Weight in Advisor: <strong>{(pp.weightWithinAdvisor ?? 0).toFixed(1)}%</strong></span>
                    <span className="text-indigo-600 font-bold flex items-center gap-0.5">
                      View Holdings <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* Tab: Visual Weights Breakdown */}
        {activeTabSection === 'allocation' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stockAllocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="weight"
                    >
                      {stockAllocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, _name: any, item: any) => [
                        `${Number(val ?? 0).toFixed(1)}% (${formatINR(item?.payload?.invested)}) [${item?.payload?.portfolioName}]`,
                        item?.payload?.name,
                      ]}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        color: '#fff',
                        borderRadius: '8px',
                        fontSize: '12px',
                        border: 'none',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-2.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                Stock Weights in {advisor.name}:
              </span>
              {stockAllocationData.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name} <span className="font-normal text-slate-500">({item.fullName})</span>
                      {item.portfolioName && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700">
                          {item.portfolioName}
                        </span>
                      )}
                    </span>
                    <span className="font-extrabold text-slate-900">{(item.weight ?? 0).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.weight}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 1: Active Holdings Table */}
        {activeTabSection === 'holdings' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                  <th className="py-3 px-3">Stock & Sector</th>
                  <th className="py-3 px-3">Portfolio</th>
                  <th className="py-3 px-3 text-right">Quantity</th>
                  <th className="py-3 px-3 text-right">Avg Price</th>
                  <th className="py-3 px-3 text-right">LTP (Current)</th>
                  <th className="py-3 px-3 text-right">Invested</th>
                  <th className="py-3 px-3 text-right">Current Value</th>
                  <th className="py-3 px-3 text-right">Unrealized P&L</th>
                  <th className="py-3 px-3 text-right bg-indigo-50/50 text-indigo-900">Weight in Advisor</th>
                  <th className="py-3 px-3 text-right text-slate-600">Weight in Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredHoldings.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                      No active holdings found in this selection.
                    </td>
                  </tr>
                ) : (
                  filteredHoldings.map((h) => {
                    const isPos = h.unrealizedGain >= 0;
                    return (
                      <tr key={`${h.symbol}-${h.portfolioId || 'gen'}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{h.symbol}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{h.name}</div>
                          <span className="inline-block mt-0.5 text-[10px] text-slate-400 font-medium">
                            {h.sector} • {h.marketCap} Cap
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <Briefcase className="w-2.5 h-2.5" />
                            <span>{h.portfolioName || 'General'}</span>
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                          {h.quantity}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          {formatINR(h.avgBuyPrice)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                          {formatINR(h.currentPrice)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          {formatINR(h.investedAmount)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {formatINR(h.currentValue)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono">
                          <div className={`font-bold ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatINR(h.unrealizedGain)}
                          </div>
                          <div className={`text-[10px] font-semibold ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatPercent(h.unrealizedReturnPercent)}
                          </div>
                        </td>

                        {/* Weight within this advisor */}
                        <td className="py-3 px-3 text-right bg-indigo-50/40">
                          <span className="font-extrabold text-indigo-700 text-xs">
                            {(h.weightWithinAdvisor ?? 0).toFixed(1)}%
                          </span>
                        </td>

                        {/* Weight in entire portfolio */}
                        <td className="py-3 px-3 text-right font-medium text-slate-600">
                          {(h.weightInTotalPortfolio ?? 0).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Exited Trades for this Advisor */}
        {activeTabSection === 'exits' && (
          <div>
            {filteredExits.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No exited trades recorded for this selection.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                      <th className="py-3 px-3">Stock & Strategy</th>
                      <th className="py-3 px-3">Portfolio</th>
                      <th className="py-3 px-3">Buy Date</th>
                      <th className="py-3 px-3">Exit Date</th>
                      <th className="py-3 px-3 text-right">Holding</th>
                      <th className="py-3 px-3 text-right">Qty</th>
                      <th className="py-3 px-3 text-right">Buy Price</th>
                      <th className="py-3 px-3 text-right">Sell Price</th>
                      <th className="py-3 px-3 text-right">Realized Gain / Loss</th>
                      <th className="py-3 px-3 text-right">Return %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredExits.map((et) => {
                      const isGain = et.realizedGain >= 0;
                      return (
                        <tr key={et.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{et.symbol}</div>
                            <div className="text-[11px] text-slate-500">{et.notes || et.name}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              <Briefcase className="w-2.5 h-2.5" />
                              <span>{et.portfolioName || 'General'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600">{et.buyDate}</td>
                          <td className="py-3 px-3 font-mono text-slate-600">{et.sellDate}</td>
                          <td className="py-3 px-3 text-right font-medium text-slate-700">{et.holdingDays} days</td>
                          <td className="py-3 px-3 text-right font-mono">{et.quantity}</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600">{formatINR(et.avgBuyPrice)}</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-900 font-semibold">{formatINR(et.sellPrice)}</td>
                          <td className="py-3 px-3 text-right font-mono">
                            <span className={`font-bold ${isGain ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {formatINR(et.realizedGain)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              isGain ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {formatPercent(et.returnPercentage)}
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
        )}

        {/* Tab 3: Dividends */}
        {activeTabSection === 'dividends' && (
          <div>
            {dividends.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No dividends recorded for this advisor yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                      <th className="py-3 px-3">Stock</th>
                      <th className="py-3 px-3">Ex-Date</th>
                      <th className="py-3 px-3">Credit Date</th>
                      <th className="py-3 px-3 text-right">Dividend / Share</th>
                      <th className="py-3 px-3 text-right">Quantity</th>
                      <th className="py-3 px-3 text-right">Total Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {dividends.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900">{d.symbol}</td>
                        <td className="py-3 px-3 font-mono text-slate-600">{d.exDate}</td>
                        <td className="py-3 px-3 font-mono text-slate-600">{d.creditDate}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">{formatINR(d.amountPerShare)}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">{d.quantity}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-amber-700">
                          {formatINR(d.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};
