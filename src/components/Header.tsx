import React from 'react';
import {
  TrendingUp,
  PlusCircle,
  Coins,
  Users,
  RefreshCw,
  Layers,
  Cloud,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  BookOpen,
} from 'lucide-react';
import { formatINR } from '../utils/portfolioMath';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  grandTotalCurrentValue?: number;
  grandTotalNetGain?: number;
  grandTotalNetReturnPct?: number;
  grandTotalDividends?: number;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenTradeModal: () => void;
  onOpenDividendModal: () => void;
  onOpenAdvisorModal: () => void;
  onOpenImportExportModal?: () => void;
  onOpenDocModal?: () => void;
  onOpenAuthModal: () => void;
  onRefreshQuotes: () => void;
  isRefreshing: boolean;
  quotes?: Record<string, any>;
}

export const Header: React.FC<HeaderProps> = ({
  grandTotalCurrentValue = 0,
  grandTotalNetGain = 0,
  grandTotalNetReturnPct = 0,
  grandTotalDividends = 0,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenTradeModal,
  onOpenDividendModal,
  onOpenAdvisorModal,
  onOpenImportExportModal,
  onOpenDocModal,
  onOpenAuthModal,
  onRefreshQuotes,
  isRefreshing,
}) => {
  const isPositive = (grandTotalNetGain ?? 0) >= 0;
  const safeNetReturnPct = grandTotalNetReturnPct ?? 0;
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between py-3 gap-3">
          
          {/* Logo & Brand & Sidebar Toggle */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs shrink-0">
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
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Multi-Advisor Performance & Demat Analytics
              </p>
            </div>
          </div>

          {/* Quick Portfolio Stats Header Strip */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 bg-[#F8FAFC] px-3.5 py-1.5 rounded-xl border border-slate-200">
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

            {/* System Docs & BA Guide */}
            {onOpenDocModal && (
              <button
                id="btn-open-doc-modal"
                onClick={onOpenDocModal}
                title="System Guide & Business Analyst Documentation"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-slate-100 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200 hover:border-indigo-200"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">System Guide</span>
              </button>
            )}

            {/* Cloud Auth / Account Sync Button */}
            <button
              id="btn-open-auth-modal"
              onClick={onOpenAuthModal}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition border shadow-xs ${
                user
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title={user ? `Signed in as ${user.email} (Firestore Active)` : 'Sign in to sync data to Cloud Firestore'}
            >
              {user ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="max-w-[80px] truncate">{user.displayName || user.email?.split('@')[0]}</span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Cloud Sign In</span>
                </>
              )}
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
