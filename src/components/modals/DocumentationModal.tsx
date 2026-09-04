import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Layers,
  Database,
  Calculator,
  CopyX,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileSpreadsheet,
  Cpu,
  ArrowRight,
  TrendingUp,
  Coins,
  Search,
} from 'lucide-react';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DocSection = 'features' | 'data_sources' | 'calculations' | 'duplicates' | 'errors' | 'user_checklist';

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<DocSection>('features');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const sections: { id: DocSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'features', label: '1. Features & Capabilities', icon: Layers },
    { id: 'data_sources', label: '2. Data Sources & Architecture', icon: Database },
    { id: 'calculations', label: '3. Calculations & Formulas', icon: Calculator },
    { id: 'duplicates', label: '4. CSV Import & Duplication Handling', icon: CopyX },
    { id: 'errors', label: '5. Error Causes & Diagnostics', icon: AlertTriangle },
    { id: 'user_checklist', label: '6. User Checklist & Best Practices', icon: CheckCircle2 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white">
                  TradeWise System Documentation
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Business Analyst Specification
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Functional mechanics, data lineage, accounting models, deduplication logic, and operating safeguards
              </p>
            </div>
          </div>
          <button
            id="btn-close-doc-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close Documentation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tab Bar */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 overflow-x-auto shrink-0 scrollbar-none">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                id={`btn-doc-tab-${sec.id}`}
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-bold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800 text-sm leading-relaxed">
          
          {/* SECTION 1: Features & Capabilities */}
          {activeSection === 'features' && (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Module 1</span>
                <h4 className="text-lg font-bold text-slate-900 mt-0.5">Core Features & Functional Capabilities</h4>
                <p className="text-xs text-slate-600 mt-1">
                  TradeWise is designed as a specialized financial accounting and performance attribution platform for Indian stock market investors utilizing multiple research analysts (SEBI RIAs, Smallcases, Model Portfolios, and Discretionary Self Trades).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span>Overview & Asset Allocation</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Aggregates portfolio Assets Under Management (AUM), total invested capital, cumulative net gains, annualized XIRR, and distribution across registered advisors and market capitalization categories (Large, Mid, Small, Micro cap).
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>Advisor Deep Dive & Sub-Portfolios</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Provides isolated performance scorecards per advisor. Supports multiple named portfolios per advisor (e.g., "Core Long Term" vs "Momentum Swing") with dedicated active holdings, realized profit logs, and win-rate ratios.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-2">
                    <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                    <span>Consolidated Demat Reconciliation & Overlap Matrix</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Reconstructs your single Zerodha Demat account view. Detects multi-advisor overlap where 2 or more advisors have recommended the exact same stock, displaying their distinct entry prices, share allocations, and conflicting advice.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-2">
                    <CheckCircle2 className="w-4 h-4 text-rose-600" />
                    <span>Exited Trades & Realized P&L Attribution</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Uncovers historical closed trades with precise FIFO matching, calendar holding periods, and net realized gain/loss. Bridges the gap with broker portals that mask churn and losses once a holding is completely sold out.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-2">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span>Corporate Dividend Tracker</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Tracks cash dividend credits received per company, crediting them directly into advisor alpha and computing Dividend Yield on Invested Capital.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-2">
                    <Cpu className="w-4 h-4 text-violet-600" />
                    <span>AI Advisory Audit & NLP Contract Note Parser</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Utilizes server-side Gemini 3.7 models to generate quantitative RIA performance evaluations, score advisors (A+ to C-), identify churn inefficiencies, and parse unformatted broker SMS / contract notes directly into structured trades.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: Data Sources & Lineage */}
          {activeSection === 'data_sources' && (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Module 2</span>
                <h4 className="text-lg font-bold text-slate-900 mt-0.5">Data Lineage: What Data is Fetched From Where</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Understanding data sources, local storage caching, cloud database sync, and AI model endpoints.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Data Entity</th>
                      <th className="p-3">Primary Source</th>
                      <th className="p-3">Ingestion / Transport Method</th>
                      <th className="p-3">Persistence Layer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold font-sans text-slate-900">Live / Current Prices (LTP)</td>
                      <td className="p-3 font-sans text-slate-600">Zerodha Kite CSV / Known Stock Master / Quote Ticker</td>
                      <td className="p-3 font-sans text-slate-600">Parsed from CSV <code className="bg-slate-100 px-1 py-0.5 rounded">LTP</code> column or simulated tick refresh</td>
                      <td className="p-3 text-indigo-600">localStorage & Firestore Quotes</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold font-sans text-slate-900">Trade Transactions</td>
                      <td className="p-3 font-sans text-slate-600">Zerodha Tradebook CSV, Kite Holdings CSV, Manual Entry, AI NLP Note</td>
                      <td className="p-3 font-sans text-slate-600">PapaParse CSV streaming / REST API <code className="bg-slate-100 px-1 py-0.5 rounded">/api/ai/parse-trade</code></td>
                      <td className="p-3 text-indigo-600">Firestore <code className="bg-slate-100 px-1 py-0.5 rounded">users/&#123;uid&#125;</code> & localStorage</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold font-sans text-slate-900">Dividend Records</td>
                      <td className="p-3 font-sans text-slate-600">Direct User Entry / Bank Credit Statement</td>
                      <td className="p-3 font-sans text-slate-600">Dividend Modal Form (Symbol, Date, Amount, Advisor Attribution)</td>
                      <td className="p-3 text-indigo-600">Firestore Dividends & localStorage</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold font-sans text-slate-900">Advisors & Portfolios</td>
                      <td className="p-3 font-sans text-slate-600">User Configuration / Defaults</td>
                      <td className="p-3 font-sans text-slate-600">Advisor Manager UI (SEBI RIA names, fee models, strategies)</td>
                      <td className="p-3 text-indigo-600">Firestore Advisors & localStorage</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold font-sans text-slate-900">AI Quantitative Audit</td>
                      <td className="p-3 font-sans text-slate-600">Server-side Google GenAI (Gemini 3.7 Flash)</td>
                      <td className="p-3 font-sans text-slate-600">REST API <code className="bg-slate-100 px-1 py-0.5 rounded">POST /api/ai/advisor-audit</code></td>
                      <td className="p-3 font-sans text-slate-500">Transient (Rendered in Overview)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-amber-700" />
                  Dual-Layer Persistence Guarantee:
                </span>
                <p>
                  TradeWise operates an <strong>offline-first cache</strong> in browser <code className="bg-amber-100 px-1 py-0.5 rounded">localStorage</code> for zero-latency interactions, while seamlessly synchronizing with <strong>Google Firebase Cloud Firestore</strong> with a 1.5-second debounce whenever a user is authenticated. This ensures zero data loss across device switches or page refreshes.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 3: Calculations & Mathematical Formulas */}
          {activeSection === 'calculations' && (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Module 3</span>
                <h4 className="text-lg font-bold text-slate-900 mt-0.5">Financial Accounting & Calculation Logic</h4>
                <p className="text-xs text-slate-600 mt-1">
                  How active balances, realized gains, FIFO cost bases, and internal rates of return (XIRR) are derived.
                </p>
              </div>

              <div className="space-y-4">
                {/* FIFO Accounting */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <h5 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                    FIFO (First-In, First-Out) Inventory Matching for Stock Sales
                  </h5>
                  <p className="text-xs text-slate-600 mt-1.5">
                    Transactions are sorted chronologically. When a <strong>SELL</strong> order occurs, it depletes the oldest unexhausted <strong>BUY</strong> lots first.
                  </p>
                  <div className="mt-2.5 p-3 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 space-y-1">
                    <div>Per Share Cost Basis = Lot Buy Price + (Lot Charges / Lot Quantity)</div>
                    <div>Total Cost Basis Matched = Σ (Matched Qty × Per Share Cost Basis)</div>
                    <div>Net Sell Proceeds = (Sell Qty × Sell Price) - Sell Charges</div>
                    <div className="font-bold text-indigo-700">Realized Gain/Loss = Net Sell Proceeds - Total Cost Basis Matched</div>
                  </div>
                </div>

                {/* Unrealized P&L & Net Gain */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <h5 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
                    Active Holdings & Total Net Return %
                  </h5>
                  <p className="text-xs text-slate-600 mt-1.5">
                    Unsold shares form active holding inventory:
                  </p>
                  <div className="mt-2.5 p-3 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 space-y-1">
                    <div>Remaining Active Invested = Σ (Remaining Lot Quantity × Lot Price + Remaining Charges)</div>
                    <div>Active Current Market Value = Total Remaining Quantity × Current Market Price (LTP)</div>
                    <div>Unrealized P&L = Active Current Market Value - Remaining Active Invested</div>
                    <div className="font-bold text-emerald-700">Total Net Gain = Unrealized P&L + Realized P&L + Total Dividends Received</div>
                    <div className="font-bold text-indigo-700">Net Return % = (Total Net Gain / Total Active Invested Capital) × 100</div>
                  </div>
                </div>

                {/* XIRR Formula */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <h5 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">3</span>
                    Extended Internal Rate of Return (XIRR)
                  </h5>
                  <p className="text-xs text-slate-600 mt-1.5">
                    Unlike simple CAGR which assumes a single lump sum, XIRR accounts for irregular capital additions and withdrawals over time using the <strong>Newton-Raphson numerical method</strong>:
                  </p>
                  <div className="mt-2.5 p-3 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 space-y-1">
                    <div>Cash Inflows (Negative): BUY orders = -(Quantity × Price + Charges)</div>
                    <div>Cash Outflows (Positive): SELL orders = +(Quantity × Price - Charges)</div>
                    <div>Cash Outflows (Positive): Dividends = +(Dividend Amount)</div>
                    <div>Terminal Value (Positive): Current Total Value of Active Portfolio on Today's Date</div>
                    <div className="text-slate-600">Solve for rate r where: Σ [ CashFlow_i / (1 + r)^((Date_i - Date_0) / 365.25) ] = 0</div>
                  </div>
                </div>

                {/* Consolidated Demat & Blended Price */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <h5 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">4</span>
                    Consolidated Demat Blended Cost & Multi-Advisor Overlaps
                  </h5>
                  <div className="mt-2 p-3 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 space-y-1">
                    <div>Total Consolidated Stock Quantity = Σ (Advisor_k Holding Quantity)</div>
                    <div>Total Consolidated Invested Capital = Σ (Advisor_k Invested Amount)</div>
                    <div className="font-bold text-indigo-700">Blended Average Cost Price = Total Consolidated Invested Capital / Total Consolidated Quantity</div>
                    <div>Overlap Trigger = Count of distinct advisors holding Stock &gt; 1</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: CSV Import & Duplicate Handling */}
          {activeSection === 'duplicates' && (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Module 4</span>
                <h4 className="text-lg font-bold text-slate-900 mt-0.5">CSV File Ingestion & Duplicate Handling Engine</h4>
                <p className="text-xs text-slate-600 mt-1">
                  How TradeWise interprets Zerodha exports and guards against duplicate trade inflation.
                </p>
              </div>

              {/* Distinction between Holdings and Tradebook */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <span>Zerodha Kite Holdings CSV</span>
                  </div>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    <strong>Nature:</strong> Snapshot of currently active holdings at a single moment in time (Instrument, Qty, Avg Cost, LTP).
                  </p>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    <strong>Behavior:</strong> Synthesizes BUY transactions for the active positions. Does NOT contain historical realized sales.
                  </p>
                </div>

                <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                    <span>Zerodha Console Tradebook CSV</span>
                  </div>
                  <p className="text-xs text-indigo-800 leading-relaxed">
                    <strong>Nature:</strong> Full historical execution ledger (Trade Date, Trade Type BUY/SELL, Quantity, Execution Price, Trade ID).
                  </p>
                  <p className="text-xs text-indigo-800 leading-relaxed">
                    <strong>Behavior:</strong> Reconstructs full FIFO timeline, active inventory, exited trades, and accurate multi-year XIRR.
                  </p>
                </div>
              </div>

              {/* Deduplication Mechanics */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <h5 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                  <CopyX className="w-4 h-4 text-rose-600" />
                  How Deduplication is Evaluated During CSV Parsing:
                </h5>
                <p className="text-xs text-slate-600">
                  When a user uploads a CSV file, TradeWise runs an automated comparison between each incoming row and the existing transaction ledger using a <strong>deterministic composite identity hash</strong>:
                </p>
                <div className="bg-white border border-slate-200 rounded-lg p-3 font-mono text-[11px] text-slate-800 space-y-1">
                  <div className="font-bold text-slate-900">Composite Identity Criteria:</div>
                  <div>1. Matching Symbol (NSE/BSE ticker normalized to clean uppercase, e.g. "RELIANCE")</div>
                  <div>2. Matching Transaction Type ("BUY" vs "SELL")</div>
                  <div>3. Matching Execution Date (ISO "YYYY-MM-DD")</div>
                  <div>4. Matching Execution Quantity (Exact numeric volume)</div>
                  <div>5. Matching Execution Price (Within ₹0.01 tolerance)</div>
                  <div>6. Matching Advisor Attribution (The target advisor selected for import)</div>
                  <div>7. Matching Trade ID (if present in Zerodha Tradebook <code className="bg-slate-100 px-1 py-0.5 rounded">trade_id</code> or <code className="bg-slate-100 px-1 py-0.5 rounded">order_id</code>)</div>
                </div>

                <div className="flex items-start gap-2 pt-1 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Automated Filtering in Import Preview:</strong> The Import Modal highlights detected duplicates in yellow, displays the exact count of net-new vs duplicate rows, and provides a pre-checked <em>"Skip duplicate trades already present in ledger"</em> safeguard toggle so users can re-upload cumulative Zerodha Tradebooks without duplicating positions.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: Error Causes & Diagnostics */}
          {activeSection === 'errors' && (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Module 5</span>
                <h4 className="text-lg font-bold text-slate-900 mt-0.5">Potential Error Causes & System Diagnostics</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Common friction points, data inconsistencies, and how the platform manages them.
                </p>
              </div>

              <div className="space-y-3">
                <div className="border border-rose-200 bg-rose-50/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 font-bold text-rose-900 text-xs mb-1">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>1. Orphan SELL Transactions (Negative Holding Anomaly)</span>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    <strong>Cause:</strong> Importing a Tradebook for a date range (e.g. FY 2024-25) where a stock was sold, but the original purchase happened in a prior period not included in the CSV file.
                    <br />
                    <strong>Impact:</strong> The FIFO engine cannot find the matching BUY lot.
                    <br />
                    <strong>Mitigation:</strong> The system defaults the cost basis to the sell price with 0 days holding to avoid system crash, but flags a discrepancy. The user should export the Tradebook spanning from the original purchase date.
                  </p>
                </div>

                <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 font-bold text-amber-900 text-xs mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>2. Mixing Holdings CSV and Tradebook CSV for the Same Advisor</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>Cause:</strong> Importing a Kite Holdings snapshot (which creates synthetic BUY orders for current balance) and subsequently importing the Console Tradebook.
                    <br />
                    <strong>Impact:</strong> The portfolio will reflect double the actual quantity of shares.
                    <br />
                    <strong>Mitigation:</strong> Use either the full Tradebook (recommended for full history) OR Holdings (for quick active portfolio setup). If both were imported, use the "Reset All Data" option or delete the synthetic holdings trades.
                  </p>
                </div>

                <div className="border border-slate-200 bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-1">
                    <AlertTriangle className="w-4 h-4 text-slate-600 shrink-0" />
                    <span>3. Ticker Symbol Prefix Discrepancies</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <strong>Cause:</strong> Broker reports containing exchange prefixes such as <code className="bg-slate-200 px-1 rounded">NSE:TCS</code> or <code className="bg-slate-200 px-1 rounded">BSE:TCS</code>.
                    <br />
                    <strong>Mitigation:</strong> The TradeWise importer automatically sanitizes and trims prefixes, stripping <code className="bg-slate-200 px-1 rounded">NSE:</code>, <code className="bg-slate-200 px-1 rounded">BSE:</code>, and series tags like <code className="bg-slate-200 px-1 rounded">EQ:</code> to guarantee uniform matching.
                  </p>
                </div>

                <div className="border border-slate-200 bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-1">
                    <AlertTriangle className="w-4 h-4 text-slate-600 shrink-0" />
                    <span>4. Date Parsing Variations</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <strong>Cause:</strong> Differing date formats across Excel exports (<code className="bg-slate-200 px-1 rounded">DD/MM/YYYY</code> vs <code className="bg-slate-200 px-1 rounded">YYYY-MM-DD</code> vs timestamps with hours/minutes).
                    <br />
                    <strong>Mitigation:</strong> The parser normalizes slash and dash formats into standard ISO <code className="bg-slate-200 px-1 rounded">YYYY-MM-DD</code> strings.
                  </p>
                </div>

                <div className="border border-slate-200 bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-1">
                    <AlertTriangle className="w-4 h-4 text-slate-600 shrink-0" />
                    <span>5. Guest Mode vs Cloud Firestore Authentication</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <strong>Cause:</strong> Using TradeWise in guest mode without logging in.
                    <br />
                    <strong>Impact:</strong> Data is saved only in browser <code className="bg-slate-200 px-1 rounded">localStorage</code>. If browser cache or cookies are cleared, local data will be erased.
                    <br />
                    <strong>Mitigation:</strong> Always sign in using the "Cloud Sign In" button in the header to ensure real-time Firestore synchronization.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: User Operating Checklist */}
          {activeSection === 'user_checklist' && (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Module 6</span>
                <h4 className="text-lg font-bold text-slate-900 mt-0.5">User Operating Checklist & Best Practices</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Practical guidelines for maintaining clean multi-advisor accounting and high-conviction decision making.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 border border-emerald-200 bg-emerald-50/50 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-emerald-950">Establish Your Advisors & Portfolios First</h5>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Before importing trades, open the <strong>Advisors Modal</strong> and create your distinct advisors (e.g. "Ethica Invest", "Wright Research", "Self Discretionary") and tag their fee structure or strategy type.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 border border-slate-200 bg-slate-50 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Choose the Correct Import File Type</h5>
                    <p className="text-xs text-slate-600 mt-0.5">
                      For a quick look at current positions, import <strong>Kite Console &gt; Portfolio &gt; Holdings CSV</strong>. For true multi-year performance, tax analysis, exited trade attribution, and XIRR, import <strong>Kite Console &gt; Reports &gt; Tradebook CSV</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 border border-slate-200 bg-slate-50 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Always Review the Deduplication Preview</h5>
                    <p className="text-xs text-slate-600 mt-0.5">
                      When importing a recurring monthly Tradebook, check that the deduplication badge indicates that previously imported transactions are skipped, ensuring your active share quantities remain exact.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 border border-slate-200 bg-slate-50 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Check the Consolidated Demat Tab for Overlap Inefficiencies</h5>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Review the <strong>Consolidated Demat</strong> tab regularly. If multiple advisors are holding the same stock (e.g., one recommended HDFC Bank at ₹1,500 and another at ₹1,700), evaluate whether your risk is excessively concentrated.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 border border-slate-200 bg-slate-50 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    5
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Log Dividends to Capture True Total Return</h5>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Many mature companies deliver 3–6% of total returns through corporate dividend actions. Use the <strong>Log Dividend</strong> tool to attribute payouts to the advisor who recommended the company.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 border border-slate-200 bg-slate-50 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    6
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Download Regular JSON Backups</h5>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Use the <strong>Import & Export Hub &gt; Export Data &gt; Download JSON Backup</strong> periodically to preserve an offline, portable snapshot of your multi-advisor financial history.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            TradeWise v1.2 &bull; SEBI RIA & Demat Portfolio Attribution
          </div>
          <button
            id="btn-close-doc-modal-footer"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            Close Guide
          </button>
        </div>

      </div>
    </div>
  );
};
