import React from 'react';
import {
  TrendingUp,
  Coins,
  AlertTriangle,
  ArrowRight,
  PieChart as PieIcon,
  BarChart3,
  Wallet,
  Activity,
  UserPlus,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { AdvisorPerformance, TimeframeFilter } from '../types/portfolio';
import { formatINR, formatPercent } from '../utils/portfolioMath';

interface OverviewViewProps {
  advisorPerformances: AdvisorPerformance[];
  grandTotalInvested: number;
  grandTotalCurrentValue: number;
  grandTotalUnrealizedPnL: number;
  grandTotalRealizedPnL: number;
  grandTotalDividends: number;
  grandTotalNetGain: number;
  grandTotalNetReturnPct: number;
  overallXIRR: number;
  stockOverlaps: { symbol: string; name: string; advisorCount: number; advisors: string[] }[];
  timeframe: TimeframeFilter;
  onSelectAdvisor: (advisorId: string) => void;
  onNavigateToOverlap: () => void;
  onNavigateToExitedTrades: () => void;
  onOpenAdvisorModal?: () => void;
  onOpenImportExportModal?: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  advisorPerformances,
  grandTotalInvested,
  grandTotalCurrentValue,
  grandTotalUnrealizedPnL,
  grandTotalRealizedPnL,
  grandTotalDividends,
  grandTotalNetGain,
  grandTotalNetReturnPct,
  overallXIRR,
  stockOverlaps,
  timeframe,
  onSelectAdvisor,
  onNavigateToOverlap,
  onNavigateToExitedTrades,
  onOpenAdvisorModal,
  onOpenImportExportModal,
}) => {
  // Zero-State: If no advisors or holdings exist
  if (advisorPerformances.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-2xl mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
          <Wallet className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Welcome to TradeWise</h3>
        <p className="text-xs text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
          Your multi-advisor portfolio tracker is clean and ready. Add an advisor or import your Zerodha Kite Tradebook/Holdings CSV to begin analyzing multi-advisor returns, overlapping holdings, and XIRR.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {onOpenAdvisorModal && (
            <button
              onClick={onOpenAdvisorModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Advisor</span>
            </button>
          )}
          {onOpenImportExportModal && (
            <button
              onClick={onOpenImportExportModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Import Zerodha CSV</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Chart Data: Advisor Allocation
  const allocationChartData = advisorPerformances.map((ap) => ({
    name: ap.advisor.name,
    value: ap.totalInvestedActive,
    currentValue: ap.totalCurrentValue,
    color: ap.advisor.color,
    percentage: ap.portfolioSharePct,
    id: ap.advisor.id,
  }));

  // Chart Data: Performance Breakdown (Unrealized, Realized, Dividends)
  const performanceComparisonData = advisorPerformances.map((ap) => ({
    name: ap.advisor.name.length > 16 ? ap.advisor.name.substring(0, 14) + '...' : ap.advisor.name,
    fullName: ap.advisor.name,
    unrealized: Math.round(ap.unrealizedPnL),
    realized: Math.round(ap.realizedPnL),
    dividends: Math.round(ap.totalDividends),
    netGain: Math.round(ap.totalNetGain),
    returnPct: ap.netReturnPct,
  }));

  return (
    <div className="space-y-6">
      
      {/* Top Alert: Multi-Advisor Stock Overlap Notice if present */}
      {stockOverlaps.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Multi-Advisor Stock Overlap Detected ({stockOverlaps.length} Stocks)
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                The same stock is held across multiple advisor portfolios (e.g.{' '}
                <span className="font-semibold">{stockOverlaps.map((s) => s.symbol).join(', ')}</span>).
                Your broker Demat account blends these into a single holding.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToOverlap}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 rounded-lg transition shrink-0 self-start sm:self-auto"
          >
            <span>Inspect Demat Overlaps</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total AUM & Active Invested */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Portfolio AUM</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {formatINR(grandTotalCurrentValue)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Invested: <strong className="text-slate-700">{formatINR(grandTotalInvested)}</strong></span>
            <span className={`font-semibold ${grandTotalUnrealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              Unrealized: {formatINR(grandTotalUnrealizedPnL, true)}
            </span>
          </div>
        </div>

        {/* Card 2: Net Total Gain */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Net Gain ({timeframe.label})</span>
            <div className={`p-1.5 rounded-lg ${grandTotalNetGain >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-extrabold tracking-tight ${grandTotalNetGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatINR(grandTotalNetGain)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">Return: <strong className="text-slate-800">{formatPercent(grandTotalNetReturnPct)}</strong></span>
            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-medium text-[11px]">
              XIRR: {formatPercent(overallXIRR)}
            </span>
          </div>
        </div>

        {/* Card 3: Realized Exited P&L */}
        <div 
          onClick={onNavigateToExitedTrades}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-indigo-300 transition group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">Exited Trades P&L</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">Archived</span>
            </div>
            <div className={`p-1.5 rounded-lg ${grandTotalRealizedPnL >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-extrabold tracking-tight ${grandTotalRealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatINR(grandTotalRealizedPnL)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Realized exits & stoplosses</span>
            <span className="text-indigo-600 font-semibold group-hover:underline flex items-center gap-0.5">
              View Exits <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: Dividends Earned */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Dividends Attributed</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 tracking-tight">
            {formatINR(grandTotalDividends)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Credited to bank</span>
            <span className="text-slate-700 font-medium">
              Yield: {grandTotalInvested > 0 ? ((grandTotalDividends / grandTotalInvested) * 100).toFixed(2) : '0.00'}%
            </span>
          </div>
        </div>

      </div>

      {/* Charts Section: Capital Allocation & Comparative Advisor Alpha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Advisor Capital Allocation Donut Chart */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-indigo-600" />
                Capital Invested by Advisor (%)
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">Total: {formatINR(grandTotalInvested, true)}</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Shows how your capital is apportioned across advisory strategies.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {allocationChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, _name: any, item: any) => [
                    `${formatINR(Number(value))} (${(item?.payload?.percentage ?? 0).toFixed(1)}%)`,
                    item?.payload?.name || 'Advisor',
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

          {/* Allocation Legend with Percentages */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
            {allocationChartData.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectAdvisor(item.id)}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="font-semibold text-slate-700 truncate">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900 ml-2">{(item.percentage ?? 0).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Advisor Performance Comparison Bar Chart */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                Advisor Gain Breakdown (Realized vs Unrealized vs Dividends)
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">Timeframe: {timeframe.label}</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Comparing net gains delivered by each advisor entity, factoring in exited losses and cash dividends.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceComparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `₹${((val || 0) / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [formatINR(Number(val)), name]}
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName || _label}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '12px',
                    border: 'none',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={32}
                  wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                />
                <Bar dataKey="unrealized" name="Unrealized P&L" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realized" name="Realized Exits P&L" fill="#6366F1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="dividends" name="Dividends" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span>* Realized P&L includes closed trades & stoploss exits</span>
            <span className="font-semibold text-indigo-600">Net Portfolio Alpha: {formatINR(grandTotalNetGain)}</span>
          </div>
        </div>

      </div>

      {/* Advisor Performance Scorecards Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Advisor Performance Scorecards
            </h2>
            <p className="text-xs text-slate-500">
              Track exact returns, portfolio share %, and win rate for each advisor entity.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {advisorPerformances.map((ap) => {
            const isAdvPositive = ap.totalNetGain >= 0;
            const topHoldings = [...ap.activeHoldings].sort((a, b) => b.investedAmount - a.investedAmount).slice(0, 3);

            return (
              <div
                key={ap.advisor.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Name, Type, Color Tag */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-start gap-3">
                      <span
                        className="w-3.5 h-3.5 rounded-full mt-1 shrink-0"
                        style={{ backgroundColor: ap.advisor.color }}
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900">{ap.advisor.name}</h3>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ap.advisor.badgeBg}`}>
                            {ap.advisor.type === 'SEBI_RIA' ? 'SEBI RIA' : ap.advisor.type === 'SMALLCASE' ? 'Smallcase' : ap.advisor.type === 'TRADING_AGENT' ? 'Trading Agent' : 'Self'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {ap.advisor.strategyStyle}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Portfolio Share
                      </span>
                      <span className="text-sm font-extrabold text-slate-900">
                        {(ap.portfolioSharePct ?? 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Key Stats Row */}
                  <div className="grid grid-cols-3 gap-2 py-4 border-b border-slate-100 text-center">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Invested</span>
                      <span className="text-xs font-bold text-slate-900 mt-0.5 block">{formatINR(ap.totalInvestedActive, true)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Current Value</span>
                      <span className="text-xs font-bold text-slate-900 mt-0.5 block">{formatINR(ap.totalCurrentValue, true)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Net Return</span>
                      <span className={`text-xs font-bold mt-0.5 block ${isAdvPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatPercent(ap.netReturnPct)}
                      </span>
                    </div>
                  </div>

                  {/* Top Active Positions Preview */}
                  <div className="py-3">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Top Holdings ({ap.activeHoldings.length} Active)
                    </span>
                    {topHoldings.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">No active holdings currently</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {topHoldings.map((h) => (
                          <span
                            key={h.symbol}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-medium text-slate-700"
                          >
                            <span className="font-bold">{h.symbol}</span>
                            <span className="text-slate-400 font-mono text-[10px]">({h.quantity} sh)</span>
                            <span className={`text-[10px] font-semibold ${h.unrealizedGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {formatPercent(h.unrealizedReturnPercent)}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {ap.exitedTrades.length} Exited Trades • {ap.dividends.length} Dividends
                  </span>
                  <button
                    onClick={() => onSelectAdvisor(ap.advisor.id)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
                  >
                    <span>Inspect Advisor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
