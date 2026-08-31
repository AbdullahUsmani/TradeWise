import React, { useState } from 'react';
import {
  ReceiptText,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Tag,
  PlusCircle,
  Briefcase,
} from 'lucide-react';
import { Advisor, AdvisorPortfolio, Transaction } from '../types/portfolio';
import { formatINR } from '../utils/portfolioMath';

interface TradeLedgerViewProps {
  transactions: Transaction[];
  advisors: Advisor[];
  portfolios?: AdvisorPortfolio[];
  onOpenTradeModal: () => void;
  onDeleteTransaction: (id: string) => void;
}

export const TradeLedgerView: React.FC<TradeLedgerViewProps> = ({
  transactions,
  advisors,
  portfolios = [],
  onOpenTradeModal,
  onDeleteTransaction,
}) => {
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>('ALL');
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const advisorMap = new Map<string, Advisor>(advisors.map((a) => [a.id, a]));

  const relevantPortfolios = selectedAdvisorId === 'ALL'
    ? portfolios
    : portfolios.filter((p) => p.advisorId === selectedAdvisorId);

  const filteredTx = transactions.filter((tx) => {
    if (selectedAdvisorId !== 'ALL' && tx.advisorId !== selectedAdvisorId) return false;
    if (selectedPortfolioId !== 'ALL' && tx.portfolioId !== selectedPortfolioId) return false;
    if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        tx.symbol.toLowerCase().includes(q) ||
        tx.name.toLowerCase().includes(q) ||
        (tx.portfolioName && tx.portfolioName.toLowerCase().includes(q)) ||
        (tx.notes && tx.notes.toLowerCase().includes(q)) ||
        (tx.tradeTag && tx.tradeTag.toLowerCase().includes(q))
      );
    }
    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <ReceiptText className="w-4 h-4" />
            <span>Master Transaction Ledger</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Historical Buy & Sell Tradebook
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Audit log of all executions tagged with the responsible advisor and strategy portfolio for lot accounting.
          </p>
        </div>

        <button
          onClick={onOpenTradeModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs shrink-0 self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Log Trade</span>
        </button>
      </div>

      {/* Filters Bar */}
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

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                typeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => setTypeFilter('BUY')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                typeFilter === 'BUY' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              BUY ({transactions.filter((t) => t.type === 'BUY').length})
            </button>
            <button
              onClick={() => setTypeFilter('SELL')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                typeFilter === 'SELL' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SELL ({transactions.filter((t) => t.type === 'SELL').length})
            </button>
          </div>
        </div>

        {/* Search Field */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stock, tag, note..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/70">
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Stock</th>
                <th className="py-3.5 px-4">Advisor & Portfolio</th>
                <th className="py-3.5 px-4 text-right">Quantity</th>
                <th className="py-3.5 px-4 text-right">Price</th>
                <th className="py-3.5 px-4 text-right">Charges</th>
                <th className="py-3.5 px-4 text-right">Gross Total</th>
                <th className="py-3.5 px-4">Rationale & Notes</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No transactions match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTx.map((tx) => {
                  const adv = advisorMap.get(tx.advisorId);
                  const isBuy = tx.type === 'BUY';
                  const total = tx.quantity * tx.price + (isBuy ? tx.charges : -tx.charges);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {tx.date}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                            isBuy
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isBuy ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {tx.type}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{tx.symbol}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{tx.name}</div>
                      </td>

                      <td className="py-3 px-4">
                        {adv ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: adv.color }}
                              />
                              <span className="font-semibold text-slate-800 text-xs">{adv.name}</span>
                            </div>
                            {tx.portfolioName && (
                              <div className="flex items-center gap-1 text-[10px] text-indigo-700 font-medium mt-0.5">
                                <Briefcase className="w-2.5 h-2.5" />
                                <span>{tx.portfolioName}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                        {tx.quantity}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {formatINR(tx.price)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {tx.charges > 0 ? formatINR(tx.charges) : '₹0'}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatINR(total)}
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        {tx.tradeTag && (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium mr-1 mb-0.5">
                            {tx.tradeTag}
                          </span>
                        )}
                        {tx.notes && <div className="text-[11px] text-slate-500 truncate">{tx.notes}</div>}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Delete trade"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
