import React, { useState, useMemo } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  CopyX,
  Trash2,
  Check,
  FileDown,
  Users,
  Briefcase,
  Layers,
} from 'lucide-react';
import { Advisor, AdvisorPortfolio, Dividend, StockQuote, Transaction } from '../../types/portfolio';
import { parseCSVFile, generateSampleTradebookCSV } from '../../utils/zerodhaImporter';
import { formatINR } from '../../utils/portfolioMath';
import {
  exportAdvisorsCSV,
  exportPortfoliosCSV,
  exportAdvisorsAndPortfoliosJSON,
} from '../../utils/exportUtils';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  advisors: Advisor[];
  portfolios?: AdvisorPortfolio[];
  transactions: Transaction[];
  dividends: Dividend[];
  quotes: Record<string, StockQuote>;
  onImportTransactions: (newTransactions: Transaction[]) => void;
  onImportDividends?: (newDividends: Dividend[]) => void;
  onUpdateQuotes?: (quotes: Record<string, Partial<StockQuote>>) => void;
  onClearAllTrades?: (advisorId?: string) => Promise<void> | void;
  onResetAllData?: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  advisors,
  portfolios = [],
  transactions,
  dividends,
  quotes,
  onImportTransactions,
  onUpdateQuotes,
  onClearAllTrades,
  onResetAllData,
}) => {
  const [activeTab, setActiveTab] = useState<'zerodha' | 'export'>('zerodha');
  
  // Cleanup confirmation states (avoids window.confirm in iframes)
  const [confirmTradesCleanup, setConfirmTradesCleanup] = useState(false);
  const [isCleaningTrades, setIsCleaningTrades] = useState(false);
  const [confirmFullReset, setConfirmFullReset] = useState(false);
  const [isResettingFull, setIsResettingFull] = useState(false);
  const [tradesCleanupSuccess, setTradesCleanupSuccess] = useState(false);

  // Zerodha CSV Upload State
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>(advisors[0]?.id || '');
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvRawText, setCsvRawText] = useState<string | null>(null);
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<any | null>(null);
  const [customTag, setCustomTag] = useState<string>('Zerodha Tradebook');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState<boolean>(true);

  // Evaluate duplicate trades against existing transactions ledger
  const { annotatedTransactions, duplicateCount, netNewCount } = useMemo(() => {
    if (!parsedPreview || !parsedPreview.transactions) {
      return { annotatedTransactions: [], duplicateCount: 0, netNewCount: 0 };
    }

    const fallbackAdv = selectedAdvisorId || advisors[0]?.id || 'adv-1';

    let dupes = 0;
    const annotated = parsedPreview.transactions.map((tx: Transaction) => {
      const rowAdv = tx.advisorId || fallbackAdv;
      // Check if existing trade matches
      const isDuplicate = transactions.some((existing) => {
        if (existing.advisorId !== rowAdv) return false;
        if (existing.symbol.toUpperCase() !== tx.symbol.toUpperCase()) return false;
        if (existing.type !== tx.type) return false;
        if (existing.date !== tx.date) return false;
        const qtyDiff = Math.abs(existing.quantity - tx.quantity);
        const priceDiff = Math.abs(existing.price - tx.price);
        return qtyDiff < 0.0001 && priceDiff < 0.02;
      });

      if (isDuplicate) {
        dupes++;
      }

      return {
        ...tx,
        isDuplicate,
      };
    });

    return {
      annotatedTransactions: annotated,
      duplicateCount: dupes,
      netNewCount: annotated.length - dupes,
    };
  }, [parsedPreview, transactions, selectedAdvisorId, advisors]);

  // Handle Drag & Drop / File selection for Zerodha
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processCsvFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processCsvFile(file);
  };

  const processCsvFile = (file: File) => {
    setCsvFileName(file.name);
    setParsedPreview(null);
    setImportStatus(null);
    setErrorMessage(null);
    setIsParsingCsv(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setCsvRawText(content);
      try {
        const fallbackAdv = selectedAdvisorId || advisors[0]?.id || 'adv-1';
        const result = await parseCSVFile(content, fallbackAdv, advisors, portfolios);
        setParsedPreview(result);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to parse CSV file.');
      } finally {
        setIsParsingCsv(false);
      }
    };
    reader.readAsText(file);
  };

  // Re-parse when default fallback advisor changes
  const handleReParse = async (advId: string) => {
    setSelectedAdvisorId(advId);
    if (!csvRawText) return;

    setIsParsingCsv(true);
    setErrorMessage(null);
    try {
      const result = await parseCSVFile(csvRawText, advId, advisors, portfolios);
      setParsedPreview(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to re-parse.');
    } finally {
      setIsParsingCsv(false);
    }
  };

  // Download sample tradebook template
  const handleDownloadTemplate = () => {
    const sample = generateSampleTradebookCSV(advisors, portfolios);
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tradebook-sample-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Apply parsed Zerodha trades
  const handleConfirmZerodhaImport = () => {
    if (!parsedPreview || parsedPreview.transactions.length === 0) return;

    const fallbackAdv = selectedAdvisorId || advisors[0]?.id || 'adv-1';

    const candidateTxs = skipDuplicates
      ? annotatedTransactions.filter((tx: any) => !tx.isDuplicate)
      : annotatedTransactions;

    if (candidateTxs.length === 0) {
      setImportStatus('No new records imported (all trades were detected as duplicates).');
      return;
    }

    const updatedTxs: Transaction[] = candidateTxs.map((tx: any) => {
      const { isDuplicate, ...rest } = tx;
      return {
        ...rest,
        advisorId: tx.advisorId || fallbackAdv,
        portfolioId: tx.portfolioId || undefined,
        tradeTag: customTag || tx.tradeTag,
      };
    });

    onImportTransactions(updatedTxs);

    if (onUpdateQuotes && parsedPreview.quotesToUpdate && Object.keys(parsedPreview.quotesToUpdate).length > 0) {
      onUpdateQuotes(parsedPreview.quotesToUpdate);
    }

    const dupMsg = skipDuplicates && duplicateCount > 0 ? ` (${duplicateCount} duplicate(s) skipped)` : '';
    setImportStatus(`Successfully imported ${updatedTxs.length} trade records${dupMsg}!`);
    setParsedPreview(null);
    setCsvFileName(null);
    setCsvRawText(null);
  };

  // Export JSON (Full system backup)
  const handleExportJSON = () => {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      advisors,
      portfolios,
      transactions,
      dividends,
      quotes,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradewise-portfolio-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Advisors CSV
  const handleExportAdvisorsCSV = () => {
    exportAdvisorsCSV(advisors, portfolios, transactions);
  };

  // Export Portfolios CSV
  const handleExportPortfoliosCSV = () => {
    exportPortfoliosCSV(portfolios, advisors, transactions);
  };

  // Export Advisors & Portfolios Combined JSON
  const handleExportAdvisorsAndPortfoliosJSON = () => {
    exportAdvisorsAndPortfoliosJSON(advisors, portfolios);
  };

  // Export CSV of Transactions
  const handleExportTransactionsCSV = () => {
    const headers = ['Date', 'AdvisorID', 'AdvisorName', 'PortfolioID', 'PortfolioName', 'Type', 'Symbol', 'Name', 'Sector', 'MarketCap', 'Quantity', 'Price', 'Charges', 'Tag', 'Notes'];
    const rows = transactions.map((t) => {
      const adv = advisors.find((a) => a.id === t.advisorId);
      const port = portfolios.find((p) => p.id === t.portfolioId);
      return [
        t.date,
        t.advisorId,
        `"${adv?.name || ''}"`,
        t.portfolioId || '',
        `"${port?.name || ''}"`,
        t.type,
        t.symbol,
        `"${t.name}"`,
        `"${t.sector}"`,
        t.marketCap,
        t.quantity,
        t.price,
        t.charges,
        `"${t.tradeTag || ''}"`,
        `"${t.notes || ''}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradewise-tradebook-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Import & Export Hub</h3>
              <p className="text-[11px] text-slate-500">Import Zerodha Kite CSV files or export TradeWise records</p>
            </div>
          </div>
          <button
            id="btn-close-import-export-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-5 pt-3 gap-2 text-xs">
          <button
            id="tab-import-zerodha"
            onClick={() => setActiveTab('zerodha')}
            className={`pb-2.5 px-3 font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'zerodha'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Tradebook CSV Import</span>
          </button>

          <button
            id="tab-export-data"
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 px-3 font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'export'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Data</span>
          </button>
        </div>

        {/* Tab 1: Tradebook Import */}
        {activeTab === 'zerodha' && (
          <div className="p-6 space-y-5">
            {/* Informational Guidance on Tradebook vs Holdings */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs space-y-1.5 text-indigo-950">
              <div className="flex items-center justify-between font-bold">
                <div className="flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Tradebook Import Policy</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs transition"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download CSV Template</span>
                </button>
              </div>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                Trades are imported <strong>strictly from Tradebook execution logs</strong> (BUY/SELL transactions with real dates and prices) to preserve FIFO cost basis and realized P&L.
                Each trade row in the CSV can have an <strong>Advisor Id</strong> and <strong>Portfolio Id</strong> column for multi-advisor attribution in a single file.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Import Error:</strong>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            {importStatus && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{importStatus}</span>
              </div>
            )}

            {/* Fallback Advisor Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Fallback Advisor (for rows without Advisor Id column):
                </label>
                <span className="text-[10px] text-slate-400">Row-level Advisor Id takes precedence</span>
              </div>
              <select
                id="select-import-advisor"
                value={selectedAdvisorId}
                onChange={(e) => handleReParse(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {advisors.length === 0 ? (
                  <option value="">No advisor created yet (will create default)</option>
                ) : (
                  advisors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Upload Area */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-indigo-50/30 transition cursor-pointer relative"
            >
              <input
                id="input-csv-file"
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileSpreadsheet className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">
                {csvFileName ? csvFileName : 'Click to select or drag and drop your Tradebook CSV here'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Columns: trade_date, symbol, trade_type, quantity, price, advisor_id, portfolio_id
              </p>
            </div>

            {/* Preview Box if Parsed */}
            {isParsingCsv && (
              <div className="p-4 text-center text-xs text-slate-500 animate-pulse">
                Parsing Tradebook CSV rows...
              </div>
            )}

            {parsedPreview && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-800 gap-2">
                  <span>Detected: {parsedPreview.sourceType || 'Tradebook'} Format</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">{parsedPreview.transactions.length} Total</span>
                    {duplicateCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        {duplicateCount} Duplicate{duplicateCount > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        All {netNewCount} Net New
                      </span>
                    )}
                  </div>
                </div>

                {duplicateCount > 0 && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900">
                    <div className="flex items-center gap-2 min-w-0">
                      <CopyX className="w-4 h-4 text-amber-700 shrink-0" />
                      <span className="truncate">
                        <strong>{duplicateCount} duplicate trade{duplicateCount > 1 ? 's' : ''}</strong> matched existing ledger records.
                      </span>
                    </div>
                    <label className="flex items-center gap-1.5 font-bold cursor-pointer shrink-0 text-amber-950">
                      <input
                        type="checkbox"
                        checked={skipDuplicates}
                        onChange={(e) => setSkipDuplicates(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                      />
                      <span>Skip Duplicates</span>
                    </label>
                  </div>
                )}

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                      <tr>
                        <th className="px-2.5 py-1.5">Date</th>
                        <th className="px-2.5 py-1.5">Type</th>
                        <th className="px-2.5 py-1.5">Symbol</th>
                        <th className="px-2.5 py-1.5 text-right">Qty</th>
                        <th className="px-2.5 py-1.5 text-right">Price</th>
                        <th className="px-2.5 py-1.5">Advisor</th>
                        <th className="px-2.5 py-1.5">Portfolio</th>
                        <th className="px-2.5 py-1.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {annotatedTransactions.slice(0, 10).map((tx: any, i: number) => {
                        const advName = advisors.find((a) => a.id === tx.advisorId)?.name || tx.advisorId || 'Default';
                        const portName = portfolios.find((p) => p.id === tx.portfolioId)?.name || tx.portfolioId || '—';
                        return (
                          <tr key={i} className={`hover:bg-slate-50 ${tx.isDuplicate ? 'bg-amber-50/40' : ''}`}>
                            <td className="px-2.5 py-1 text-slate-500">{tx.date}</td>
                            <td className="px-2.5 py-1">
                              <span className={`font-bold ${tx.type === 'BUY' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="px-2.5 py-1 font-bold text-slate-800">{tx.symbol}</td>
                            <td className="px-2.5 py-1 text-right font-mono">{tx.quantity}</td>
                            <td className="px-2.5 py-1 text-right font-mono">{formatINR(tx.price)}</td>
                            <td className="px-2.5 py-1 text-indigo-700 font-medium truncate max-w-[100px]">{advName}</td>
                            <td className="px-2.5 py-1 text-slate-600 truncate max-w-[90px]">{portName}</td>
                            <td className="px-2.5 py-1 text-center">
                              {tx.isDuplicate ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  Duplicate
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  New
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between pt-2 gap-2">
                  <span className="text-[11px] text-slate-500">
                    Showing first {Math.min(10, annotatedTransactions.length)} of {annotatedTransactions.length} trades
                    {skipDuplicates && duplicateCount > 0 ? ` (${netNewCount} will be imported)` : ''}
                  </span>
                  <button
                    id="btn-confirm-import"
                    disabled={skipDuplicates && netNewCount === 0}
                    onClick={handleConfirmZerodhaImport}
                    className={`px-4 py-2 font-bold text-xs rounded-xl shadow-xs transition ${
                      skipDuplicates && netNewCount === 0
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {skipDuplicates && netNewCount === 0
                      ? 'All Trades Already In Ledger'
                      : `Confirm & Import ${skipDuplicates ? netNewCount : annotatedTransactions.length} Records`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Export Data */}
        {activeTab === 'export' && (
          <div className="p-6 space-y-5">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Advisors & Strategy Portfolios
              </h4>
              <p className="text-xs text-slate-500">
                Export directory of registered advisory entities, SEBI licenses, and configured strategy portfolios.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Export Advisors CSV */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <h5 className="text-xs font-bold text-slate-900">Advisors CSV</h5>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {advisors.length} {advisors.length === 1 ? 'Advisor' : 'Advisors'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                    SEBI registrations, styles, fee structures, and assigned portfolio counts.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-export-advisors-csv"
                  onClick={handleExportAdvisorsCSV}
                  disabled={advisors.length === 0}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl shadow-2xs transition disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Export Advisors</span>
                </button>
              </div>

              {/* Export Portfolios CSV */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-emerald-600" />
                      <h5 className="text-xs font-bold text-slate-900">Portfolios CSV</h5>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {portfolios.length} {portfolios.length === 1 ? 'Portfolio' : 'Portfolios'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                    Strategy baskets mapped to parent advisors with target allocation % and mandates.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-export-portfolios-csv"
                  onClick={handleExportPortfoliosCSV}
                  disabled={portfolios.length === 0}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl shadow-2xs transition disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export Portfolios</span>
                </button>
              </div>

              {/* Export Advisors & Portfolios Combined JSON */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-600" />
                      <h5 className="text-xs font-bold text-slate-900">Config JSON</h5>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      Structure
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                    Structured combined JSON of all advisors and their strategy baskets.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-export-advisors-portfolios-json"
                  onClick={handleExportAdvisorsAndPortfoliosJSON}
                  disabled={advisors.length === 0 && portfolios.length === 0}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl shadow-2xs transition disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-600" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            {/* Trading Ledger & System Archives */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Tradebook & Full System Backup
              </h4>
              <p className="text-xs text-slate-500 mb-3">
                Download execution transaction history or generate a complete offline archive.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-xs font-bold text-slate-900">Tradebook CSV</h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {transactions.length} Trades
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-4">
                      Export all {transactions.length} recorded buy/sell transactions with mapped advisors, portfolios, and charges.
                    </p>
                  </div>
                  <button
                    type="button"
                    id="btn-export-csv"
                    onClick={handleExportTransactionsCSV}
                    disabled={transactions.length === 0}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-bold text-slate-900">Full Database JSON</h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        All Records
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-4">
                      Complete dump of {advisors.length} advisors, {portfolios.length} portfolios, {transactions.length} trades, {dividends.length} dividends, and quotes.
                    </p>
                  </div>
                  <button
                    type="button"
                    id="btn-export-json"
                    onClick={handleExportJSON}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Full Backup</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Data Cleanup & Reset Sections */}
            <div className="mt-6 space-y-3 pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Data Maintenance & Reset
              </h4>

              {/* 1. Selective Trade Cleanup (Requested Feature - Preserves Advisors & Portfolios) */}
              {onClearAllTrades && (
                <div className="p-4 border border-amber-200/80 bg-amber-50/40 rounded-2xl flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-md bg-amber-100 text-amber-700">
                          <Trash2 className="w-3.5 h-3.5" />
                        </span>
                        <h5 className="text-xs font-bold text-amber-950">
                          Clean Up All Trades ({transactions.length} records)
                        </h5>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          Advisors & Portfolios Preserved
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-900/80 leading-relaxed max-w-xl">
                        Clears all historical buy and sell transactions and resets open holding quantities to zero. Your <strong className="text-amber-950 font-semibold">{advisors.length} Advisors</strong> and configured portfolios remain completely intact.
                      </p>
                    </div>

                    {!confirmTradesCleanup ? (
                      <button
                        type="button"
                        id="btn-cleanup-trades-modal"
                        disabled={transactions.length === 0 || isCleaningTrades}
                        onClick={() => setConfirmTradesCleanup(true)}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition whitespace-nowrap cursor-pointer shrink-0 self-start sm:self-auto"
                      >
                        Clean Up Trades
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setConfirmTradesCleanup(false)}
                          disabled={isCleaningTrades}
                          className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          id="btn-confirm-cleanup-trades-modal"
                          disabled={isCleaningTrades}
                          onClick={async () => {
                            setIsCleaningTrades(true);
                            try {
                              await onClearAllTrades();
                              setConfirmTradesCleanup(false);
                              setTradesCleanupSuccess(true);
                              setTimeout(() => setTradesCleanupSuccess(false), 3000);
                            } catch (e) {
                              console.error(e);
                            } finally {
                              setIsCleaningTrades(false);
                            }
                          }}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                        >
                          {isCleaningTrades ? 'Cleaning...' : `Confirm: Delete ${transactions.length} Trades`}
                        </button>
                      </div>
                    )}
                  </div>

                  {tradesCleanupSuccess && (
                    <div className="p-2 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Trades successfully cleaned up. Advisors and portfolios were preserved.</span>
                    </div>
                  )}
                </div>
              )}

              {/* 2. Total Reset (Nuclear Wipe) */}
              {onResetAllData && (
                <div className="p-4 border border-rose-200/70 bg-rose-50/30 rounded-2xl flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-md bg-rose-100 text-rose-700">
                          <Trash2 className="w-3.5 h-3.5" />
                        </span>
                        <h5 className="text-xs font-bold text-rose-950">
                          Reset Entire Portfolio to Zero
                        </h5>
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                          Deletes Everything
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-800/80 leading-relaxed max-w-xl">
                        Nuclear reset: wipes all advisors, portfolios, transactions, dividends, and cached stock quotes to restore an empty initial state.
                      </p>
                    </div>

                    {!confirmFullReset ? (
                      <button
                        type="button"
                        id="btn-reset-portfolio-data"
                        disabled={isResettingFull}
                        onClick={() => setConfirmFullReset(true)}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition whitespace-nowrap cursor-pointer shrink-0 self-start sm:self-auto"
                      >
                        Reset All Data to 0
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setConfirmFullReset(false)}
                          disabled={isResettingFull}
                          className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          id="btn-confirm-reset-all-data"
                          disabled={isResettingFull}
                          onClick={async () => {
                            setIsResettingFull(true);
                            try {
                              await onResetAllData();
                              setConfirmFullReset(false);
                              onClose();
                            } catch (e) {
                              console.error(e);
                            } finally {
                              setIsResettingFull(false);
                            }
                          }}
                          className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                        >
                          {isResettingFull ? 'Resetting...' : 'Confirm Wipe Everything'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
