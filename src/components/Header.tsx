import React from 'react';
import {
  TrendingUp,
  PlusCircle,
  Coins,
  Users,
  FileSpreadsheet,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { formatINR } from '../utils/portfolioMath';

interface HeaderProps {
  grandTotalCurrentValue?: number;
  grandTotalNetGain?: number;
  grandTotalNetReturnPct?: number;
  grandTotalDividends?: number;
  onOpenTradeModal: () => void;
  onOpenDividendModal: () => void;
  onOpenAdvisorModal: () => void;
  onOpenImportExportModal: () => void;
  onRefreshQuotes: () => void;
  isRefreshing: boolean;
  quotes?: Record<string, any>;
}

export const Header: React.FC<HeaderProps> = ({
  grandTotalCurrentValue = 0,
  grandTotalNetGain = 0,
  grandTotalNetReturnPct = 0,
  grandTotalDividends = 0,
  onOpenTradeModal,
  onOpenDividendModal,
  onOpenAdvisorModal,
  onOpenImportExportModal,
  onRefreshQuotes,
  isRefreshing,
}) => {
  const isPositive = (grandTotalNetGain ?? 0) >= 0;
  const safeNetReturnPct = grandTotalNetReturnPct ?? 0;

  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3.5 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <Layers className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold tracking-tight text-slate-900">
                  TradeWise
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  Portfolio Tracker
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Multi-Advisor Performance & Demat Analytics
              </p>
            </div>
          </div>

          {/* Quick Portfolio Stats Header Strip */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 bg-[#F8FAFC] px-3.5 py-2 rounded-xl border border-slate-200">
            <div className="px-1">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Portfolio AUM</span>
              <span className="text-sm font-bold text-slate-900">{formatINR(grandTotalCurrentValue, true)}</span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="px-1">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">All-Time Net Gain</span>
              <span className={`text-sm font-bold flex items-center gap-1 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                <TrendingUp className="w-3.5 h-3.5" />
                {formatINR(grandTotalNetGain, true)} ({isPositive ? '+' : ''}{safeNetReturnPct.toFixed(1)}%)
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="px-1">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Dividends</span>
              <span className="text-sm font-bold text-amber-600">{formatINR(grandTotalDividends, true)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center flex-wrap gap-2">
            
            {/* Live Quotes Refresh */}
            <button
              id="btn-refresh-quotes"
              onClick={onRefreshQuotes}
              title="Refresh Stock Prices"
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-transparent hover:border-slate-200"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            </button>

            {/* Advisors Management */}
            <button
              id="btn-open-advisor-modal"
              onClick={onOpenAdvisorModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Advisors</span>
            </button>

            {/* Log Dividend */}
            <button
              id="btn-open-dividend-modal"
              onClick={onOpenDividendModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50/80 border border-amber-200/80 rounded-lg hover:bg-amber-100/90 transition shadow-xs"
            >
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span>+ Dividend</span>
            </button>

            {/* Log Trade */}
            <button
              id="btn-open-trade-modal"
              onClick={onOpenTradeModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Log Trade</span>
            </button>

            {/* Import / Export Hub */}
            <button
              id="btn-open-import-export"
              onClick={onOpenImportExportModal}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-transparent hover:border-slate-200"
              title="Import Zerodha Kite CSV / Export Data"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>


          </div>

        </div>
      </div>
    </header>
  );
};
