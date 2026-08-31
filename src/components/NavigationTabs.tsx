import React from 'react';
import {
  LayoutDashboard,
  PieChart,
  Layers,
  History,
  Coins,
  ReceiptText,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  Users,
  FileSpreadsheet,
} from 'lucide-react';

export type ActiveTab =
  | 'overview'
  | 'advisor_drilldown'
  | 'kite_reconciliation'
  | 'exited_trades'
  | 'dividends'
  | 'tradebook';

interface NavigationTabsProps {
  activeTab: ActiveTab;
  onTabChange?: (tab: ActiveTab) => void;
  onChangeTab?: (tab: ActiveTab) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  exitedTradesCount?: number;
  dividendsCount?: number;
  overlapCount?: number;
  advisorCount?: number;
  transactionsCount?: number;
  onOpenTradeModal?: () => void;
  onOpenDividendModal?: () => void;
  onOpenAdvisorModal?: () => void;
  onOpenImportExportModal?: () => void;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  onChangeTab,
  isCollapsed = false,
  onToggleCollapse,
  exitedTradesCount = 0,
  dividendsCount = 0,
  overlapCount = 0,
  transactionsCount = 0,
  onOpenTradeModal,
  onOpenDividendModal,
  onOpenAdvisorModal,
  onOpenImportExportModal,
}) => {
  const handleTabClick = (tab: ActiveTab) => {
    if (onTabChange) onTabChange(tab);
    if (onChangeTab) onChangeTab(tab);
  };

  const tabs = [
    {
      id: 'overview' as ActiveTab,
      label: 'Overview & Allocation',
      shortLabel: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'advisor_drilldown' as ActiveTab,
      label: 'Advisor Deep Dive',
      shortLabel: 'Advisors',
      icon: PieChart,
      badge: null,
    },
    {
      id: 'kite_reconciliation' as ActiveTab,
      label: 'Consolidated Demat',
      shortLabel: 'Demat',
      icon: Layers,
      badge: overlapCount > 0 ? `${overlapCount} Overlaps` : null,
      badgeCount: overlapCount,
      badgeColor: 'bg-amber-100 text-amber-800 border border-amber-200/60',
      dotColor: 'bg-amber-500',
    },
    {
      id: 'exited_trades' as ActiveTab,
      label: 'Exited Trades',
      shortLabel: 'Exited',
      icon: History,
      badge: exitedTradesCount > 0 ? exitedTradesCount : null,
      badgeCount: exitedTradesCount,
      badgeColor: 'bg-slate-100 text-slate-700 border border-slate-200',
      dotColor: 'bg-slate-500',
    },
    {
      id: 'dividends' as ActiveTab,
      label: 'Dividends',
      shortLabel: 'Dividends',
      icon: Coins,
      badge: dividendsCount > 0 ? dividendsCount : null,
      badgeCount: dividendsCount,
      badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-200/60',
      dotColor: 'bg-emerald-500',
    },
    {
      id: 'tradebook' as ActiveTab,
      label: 'Tradebook',
      shortLabel: 'Trades',
      icon: ReceiptText,
      badge: transactionsCount > 0 ? transactionsCount : null,
      badgeCount: transactionsCount,
      badgeColor: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
      dotColor: 'bg-indigo-500',
    },
  ];

  return (
    <aside
      className={`bg-white border-r border-slate-200/90 flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 select-none sticky top-[57px] h-[calc(100vh-57px)] z-20 ${
        isCollapsed ? 'w-16 md:w-[68px]' : 'w-60 lg:w-64'
      }`}
    >
      <div className="p-3 space-y-4 overflow-y-auto overflow-x-hidden">
        {/* Sidebar Header with Collapse Toggle */}
        <div
          className={`flex items-center pb-2 border-b border-slate-100 ${
            isCollapsed ? 'justify-center' : 'justify-between px-2'
          }`}
        >
          {!isCollapsed && (
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Navigation
            </span>
          )}
          {onToggleCollapse && (
            <button
              type="button"
              id="btn-toggle-sidebar"
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col space-y-1" aria-label="Sidebar Menu">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                title={tab.label}
                className={`relative flex items-center rounded-xl transition-all font-medium text-xs group ${
                  isCollapsed
                    ? 'justify-center p-2.5'
                    : 'justify-between px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <div
                  className={`flex items-center gap-3 min-w-0 ${
                    isCollapsed ? 'justify-center' : ''
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-indigo-400'
                        : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="truncate">{tab.label}</span>
                  )}
                </div>

                {/* Badge for expanded view */}
                {!isCollapsed && tab.badge !== null && (
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isActive
                        ? 'bg-slate-800 text-slate-200 border border-slate-700'
                        : tab.badgeColor || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}

                {/* Dot indicator for collapsed view when there are badges */}
                {isCollapsed && tab.badgeCount && tab.badgeCount > 0 ? (
                  <span
                    className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-white ${
                      isActive ? 'bg-indigo-400' : tab.dotColor || 'bg-slate-400'
                    }`}
                  />
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Quick Shortcuts */}
        {(onOpenTradeModal || onOpenDividendModal || onOpenAdvisorModal || onOpenImportExportModal) && (
          <div className="pt-2 border-t border-slate-100">
            {!isCollapsed && (
              <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase px-2 mb-2">
                Quick Shortcuts
              </span>
            )}
            <div className={`flex flex-col space-y-1 ${isCollapsed ? 'items-center' : ''}`}>
              {onOpenTradeModal && (
                <button
                  type="button"
                  id="btn-sidebar-quick-trade"
                  onClick={onOpenTradeModal}
                  title="Log New Trade"
                  className={`flex items-center gap-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors ${
                    isCollapsed ? 'p-2 justify-center' : 'px-3 py-2'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 text-slate-500 shrink-0" />
                  {!isCollapsed && <span>Log Trade</span>}
                </button>
              )}

              {onOpenDividendModal && (
                <button
                  type="button"
                  id="btn-sidebar-quick-dividend"
                  onClick={onOpenDividendModal}
                  title="Log Dividend Payout"
                  className={`flex items-center gap-2 rounded-xl text-xs font-semibold text-amber-800 hover:bg-amber-50 hover:text-amber-900 transition-colors ${
                    isCollapsed ? 'p-2 justify-center' : 'px-3 py-2'
                  }`}
                >
                  <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                  {!isCollapsed && <span>Log Dividend</span>}
                </button>
              )}

              {onOpenAdvisorModal && (
                <button
                  type="button"
                  id="btn-sidebar-quick-advisors"
                  onClick={onOpenAdvisorModal}
                  title="Manage Advisors & Portfolios"
                  className={`flex items-center gap-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors ${
                    isCollapsed ? 'p-2 justify-center' : 'px-3 py-2'
                  }`}
                >
                  <Users className="w-4 h-4 text-slate-500 shrink-0" />
                  {!isCollapsed && <span>Advisors</span>}
                </button>
              )}

              {onOpenImportExportModal && (
                <button
                  type="button"
                  id="btn-open-import-export"
                  onClick={onOpenImportExportModal}
                  title="Import Zerodha Kite CSV / Export Data"
                  className={`flex items-center gap-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors ${
                    isCollapsed ? 'p-2 justify-center' : 'px-3 py-2'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-slate-500 shrink-0" />
                  {!isCollapsed && <span>Import / Export</span>}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer / Collapse Toggle Shortcut */}
      <div className="p-3 border-t border-slate-100/90 bg-slate-50/50">
        {onToggleCollapse && (
          <button
            type="button"
            id="btn-bottom-collapse-toggle"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`w-full flex items-center rounded-xl p-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors ${
              isCollapsed ? 'justify-center' : 'justify-between px-3'
            }`}
          >
            <div className="flex items-center gap-2">
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 text-slate-500" />
                  <span>Collapse Menu</span>
                </>
              )}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                [ ]
              </span>
            )}
          </button>
        )}
      </div>
    </aside>
  );
};
