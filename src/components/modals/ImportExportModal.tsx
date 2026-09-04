import React, { useState } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Advisor, Dividend, StockQuote, Transaction } from '../../types/portfolio';
import { parseCSVFile } from '../../utils/zerodhaImporter';
import { formatINR } from '../../utils/portfolioMath';
import { Trash2 } from 'lucide-react';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  advisors: Advisor[];
  transactions: Transaction[];
  dividends: Dividend[];
  quotes: Record<string, StockQuote>;
  onImportTransactions: (newTransactions: Transaction[]) => void;
  onImportDividends?: (newDividends: Dividend[]) => void;
  onUpdateQuotes?: (quotes: Record<string, Partial<StockQuote>>) => void;
  onResetAllData?: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  advisors,
  transactions,
  dividends,
  quotes,
  onImportTransactions,
  onUpdateQuotes,
  onResetAllData,
}) => {
  const [activeTab, setActiveTab] = useState<'zerodha' | 'export'>('zerodha');
  
  // Zerodha CSV Upload State
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>(advisors[0]?.id || '');
  const [zerodhaFileType, setZerodhaFileType] = useState<'AUTO' | 'HOLDINGS' | 'TRADEBOOK'>('AUTO');
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvRawText, setCsvRawText] = useState<string | null>(null);
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<any | null>(null);
  const [customTag, setCustomTag] = useState<string>('Zerodha Import');
  const [importStatus, setImportStatus] = useState<string | null>(null);

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
    setIsParsingCsv(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setCsvRawText(content);
      try {
        const targetAdv = selectedAdvisorId || advisors[0]?.id || 'adv-1';
        const result = await parseCSVFile(content, targetAdv, zerodhaFileType);
        setParsedPreview(result);
      } catch (err: any) {
        setImportStatus(`Failed to parse CSV: ${err.message}`);
      } finally {
        setIsParsingCsv(false);
      }
    };
    reader.readAsText(file);
  };

  // Re-parse when advisor or type changes
  const handleReParse = async (advId: string, type: 'AUTO' | 'HOLDINGS' | 'TRADEBOOK') => {
    setSelectedAdvisorId(advId);
    setZerodhaFileType(type);
    if (!csvRawText) return;

    setIsParsingCsv(true);
    try {
      const result = await parseCSVFile(csvRawText, advId, type);
      setParsedPreview(result);
    } catch (err: any) {
      setImportStatus(`Failed to re-parse: ${err.message}`);
    } finally {
      setIsParsingCsv(false);
    }
  };

  // Apply parsed Zerodha trades
  const handleConfirmZerodhaImport = () => {
    if (!parsedPreview || parsedPreview.transactions.length === 0) return;

    const targetAdv = selectedAdvisorId || advisors[0]?.id || 'adv-1';

    const updatedTxs: Transaction[] = parsedPreview.transactions.map((tx: Transaction) => ({
      ...tx,
      advisorId: targetAdv,
      tradeTag: customTag || tx.tradeTag,
    }));

    onImportTransactions(updatedTxs);

    if (onUpdateQuotes && parsedPreview.quotesToUpdate && Object.keys(parsedPreview.quotesToUpdate).length > 0) {
      onUpdateQuotes(parsedPreview.quotesToUpdate);
    }

    setImportStatus(`Successfully imported ${updatedTxs.length} records!`);
    setParsedPreview(null);
    setCsvFileName(null);
    setCsvRawText(null);
  };

  // Export JSON
  const handleExportJSON = () => {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      advisors,
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

  // Export CSV of Transactions
  const handleExportTransactionsCSV = () => {
    const headers = ['Date', 'AdvisorID', 'AdvisorName', 'Type', 'Symbol', 'Name', 'Sector', 'MarketCap', 'Quantity', 'Price', 'Charges', 'Tag', 'Notes'];
    const rows = transactions.map((t) => {
      const adv = advisors.find((a) => a.id === t.advisorId);
      return [
        t.date,
        t.advisorId,
        `"${adv?.name || ''}"`,
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
            <span>Zerodha CSV Import</span>
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

        {/* Tab 1: Zerodha Import */}
        {activeTab === 'zerodha' && (
          <div className="p-6 space-y-5">
            {importStatus && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{importStatus}</span>
              </div>
            )}

            {/* Advisor Selector for Import Target */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assign Imported Trades To Advisor:
                </label>
                <select
                  id="select-import-advisor"
                  value={selectedAdvisorId}
                  onChange={(e) => handleReParse(e.target.value, zerodhaFileType)}
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  CSV Type Detection:
                </label>
                <select
                  id="select-import-file-type"
                  value={zerodhaFileType}
                  onChange={(e) => handleReParse(selectedAdvisorId, e.target.value as any)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="AUTO">Auto Detect (Holdings / Tradebook)</option>
                  <option value="HOLDINGS">Zerodha Kite Holdings CSV</option>
                  <option value="TRADEBOOK">Zerodha Console Tradebook CSV</option>
                </select>
              </div>
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
                {csvFileName ? csvFileName : 'Click to select or drag and drop your Zerodha CSV here'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Supports Kite Holdings download and Zerodha Console Tradebook export
              </p>
            </div>

            {/* Preview Box if Parsed */}
            {isParsingCsv && (
              <div className="p-4 text-center text-xs text-slate-500 animate-pulse">
                Parsing CSV rows...
              </div>
            )}

            {parsedPreview && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Detected: {parsedPreview.detectedType} Format</span>
                  <span className="text-indigo-600">{parsedPreview.transactions.length} Records Found</span>
                </div>

                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                      <tr>
                        <th className="px-2.5 py-1.5">Date</th>
                        <th className="px-2.5 py-1.5">Type</th>
                        <th className="px-2.5 py-1.5">Symbol</th>
                        <th className="px-2.5 py-1.5 text-right">Qty</th>
                        <th className="px-2.5 py-1.5 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedPreview.transactions.slice(0, 8).map((tx: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-2.5 py-1 text-slate-500">{tx.date}</td>
                          <td className="px-2.5 py-1">
                            <span className={`font-bold ${tx.type === 'BUY' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-2.5 py-1 font-bold text-slate-800">{tx.symbol}</td>
                          <td className="px-2.5 py-1 text-right font-mono">{tx.quantity}</td>
                          <td className="px-2.5 py-1 text-right font-mono">{formatINR(tx.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-500">
                    Showing first {Math.min(8, parsedPreview.transactions.length)} of {parsedPreview.transactions.length} trades
                  </span>
                  <button
                    id="btn-confirm-import"
                    onClick={handleConfirmZerodhaImport}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    Confirm & Import {parsedPreview.transactions.length} Records
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Export Data */}
        {activeTab === 'export' && (
          <div className="p-6 space-y-4">
            <p className="text-xs text-slate-600">
              Download your full tradebook or export an offline JSON backup of all registered advisors, trades, and dividends.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold text-slate-900">Tradebook CSV</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-4">
                    Export all {transactions.length} recorded buy/sell transactions with mapped advisors and charges.
                  </p>
                </div>
                <button
                  id="btn-export-csv"
                  onClick={handleExportTransactionsCSV}
                  disabled={transactions.length === 0}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-slate-900">Full JSON Backup</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-4">
                    Complete dump of {advisors.length} advisors, {transactions.length} trades, {dividends.length} dividends, and stock quotes.
                  </p>
                </div>
                <button
                  id="btn-export-json"
                  onClick={handleExportJSON}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download JSON</span>
                </button>
              </div>
            </div>

            {/* Clear / Reset Portfolio to 0 Section */}
            {onResetAllData && (
              <div className="mt-4 p-4 border border-rose-200 bg-rose-50/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Reset Portfolio to Zero</span>
                  </h4>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Wipe all current advisors, trades, dividends, and stored data to start fresh.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-reset-portfolio-data"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to reset all portfolio data to 0? This will clear all advisors and trades.')) {
                      await onResetAllData();
                      onClose();
                    }
                  }}
                  className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition whitespace-nowrap"
                >
                  Reset All Data to 0
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
