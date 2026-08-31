import React, { useState } from 'react';
import {
  Coins,
  Calendar,
  Building,
  PlusCircle,
  TrendingUp,
  Search,
  Filter,
  Download,
  Trash2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Advisor, Dividend } from '../types/portfolio';
import { formatINR } from '../utils/portfolioMath';

interface DividendsViewProps {
  dividends: Dividend[];
  advisors: Advisor[];
  grandTotalInvested: number;
  onOpenAddDividendModal: () => void;
  onDeleteDividend: (id: string) => void;
}

export const DividendsView: React.FC<DividendsViewProps> = ({
  dividends = [],
  advisors = [],
  grandTotalInvested,
  onOpenAddDividendModal,
  onDeleteDividend,
}) => {
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const safeDividends = Array.isArray(dividends) ? dividends : [];
  const safeAdvisors = Array.isArray(advisors) ? advisors : [];

  const advisorMap = new Map<string, Advisor>(safeAdvisors.map((a) => [a.id, a]));

  const filteredDividends = safeDividends
    .filter((d) => {
      if (selectedAdvisorId !== 'ALL' && d.advisorId !== selectedAdvisorId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return d.symbol.toLowerCase().includes(q) || d.name.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => new Date(b.creditDate).getTime() - new Date(a.creditDate).getTime());

  const totalDividendsAmount = filteredDividends.reduce((sum, d) => sum + d.totalAmount, 0);
  const totalTds = filteredDividends.reduce((sum, d) => sum + (d.tdsDeducted || 0), 0);
  const netDividendYield = grandTotalInvested > 0 ? (totalDividendsAmount / grandTotalInvested) * 100 : 0;

  // Chart: Monthly Dividend Timeline
  const monthMap = new Map<string, number>();
  filteredDividends.forEach((d) => {
    const month = d.creditDate.substring(0, 7); // YYYY-MM
    monthMap.set(month, (monthMap.get(month) || 0) + d.totalAmount);
  });

  const monthlyChartData = Array.from(monthMap.entries())
    .map(([month, amount]) => ({
      month,
      amount: Math.round(amount),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-amber-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Coins className="w-4 h-4" />
            <span>Dividend Attribution Hub</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Cash Dividends Attributed by Advisor
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Track corporate cash dividends credited to your bank account, mapped to the exact advisor whose portfolio recommendation generated that holding.
          </p>
        </div>

        <button
          onClick={onOpenAddDividendModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition shadow-xs shrink-0 self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Log New Dividend</span>
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Dividends Credited</span>
          <span className="text-2xl font-extrabold text-amber-600 mt-1 block">
            {formatINR(totalDividendsAmount)}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            Across {filteredDividends.length} payout events
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Portfolio Dividend Yield</span>
          <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
            {(netDividendYield ?? 0).toFixed(2)}%
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            On active invested capital
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">TDS Deducted at Source</span>
          <span className="text-2xl font-extrabold text-slate-700 mt-1 block">
            {formatINR(totalTds)}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            Claimable in ITR Form 26AS / AIS
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Top Advisor for Dividends</span>
          {advisors.map((a) => {
            const advDivs = dividends.filter((d) => d.advisorId === a.id);
            const sum = advDivs.reduce((s, d) => s + d.totalAmount, 0);
            return { advisor: a, sum };
          }).sort((a, b) => b.sum - a.sum)[0] && (
            <div className="mt-1">
              <span className="text-base font-bold text-slate-900 block truncate">
                {advisors.map((a) => ({
                  advisor: a,
                  sum: dividends.filter((d) => d.advisorId === a.id).reduce((s, d) => s + d.totalAmount, 0),
                })).sort((a, b) => b.sum - a.sum)[0]?.advisor.name}
              </span>
              <span className="text-xs font-bold text-indigo-600">
                {formatINR(
                  advisors.map((a) => ({
                    advisor: a,
                    sum: dividends.filter((d) => d.advisorId === a.id).reduce((s, d) => s + d.totalAmount, 0),
                  })).sort((a, b) => b.sum - a.sum)[0]?.sum || 0
                )} credited
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Dividend Chart */}
      {monthlyChartData.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              Monthly Dividend Payout Timeline
            </h3>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  formatter={(val: any) => [formatINR(Number(val)), 'Dividend Credited']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '12px',
                    border: 'none',
                  }}
                />
                <Bar dataKey="amount" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filter and Dividends Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          
          <div className="flex items-center gap-2">
            <select
              value={selectedAdvisorId}
              onChange={(e) => setSelectedAdvisorId(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden"
            >
              <option value="ALL">All Advisors / Agents</option>
              {advisors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search stock symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden"
            />
          </div>
        </div>

        {filteredDividends.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No dividends found for the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80">
                  <th className="py-3.5 px-4">Stock</th>
                  <th className="py-3.5 px-4">Advisor Attributed</th>
                  <th className="py-3.5 px-4">Ex-Date</th>
                  <th className="py-3.5 px-4">Credit Date</th>
                  <th className="py-3.5 px-4 text-right">Shares Held</th>
                  <th className="py-3.5 px-4 text-right">Dividend / Share</th>
                  <th className="py-3.5 px-4 text-right text-amber-800">Total Credited</th>
                  <th className="py-3.5 px-4">Notes / Remarks</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredDividends.map((div) => {
                  const advisor = advisorMap.get(div.advisorId);
                  return (
                    <tr key={div.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{div.symbol}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{div.name}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: advisor?.color || '#94a3b8' }}
                          />
                          <span className="font-semibold text-slate-800">{advisor?.name || div.advisorId}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600">{div.exDate}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{div.creditDate}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-800">{div.sharesEligible}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-700">{formatINR(div.perShareAmount)}</td>

                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-amber-600">
                        {formatINR(div.totalAmount)}
                        {div.tdsDeducted ? (
                          <div className="text-[10px] text-slate-400 font-normal">
                            TDS: {formatINR(div.tdsDeducted)}
                          </div>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4 text-[11px] text-slate-500 max-w-xs truncate">
                        {div.notes || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => onDeleteDividend(div.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition rounded"
                          title="Delete dividend entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
