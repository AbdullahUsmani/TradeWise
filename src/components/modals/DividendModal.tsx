import React, { useState } from 'react';
import { X, Coins } from 'lucide-react';
import { Advisor, Dividend, StockQuote } from '../../types/portfolio';
import { formatINR } from '../../utils/portfolioMath';

interface DividendModalProps {
  isOpen: boolean;
  onClose: () => void;
  advisors: Advisor[];
  quotes: Record<string, StockQuote>;
  defaultAdvisorId?: string;
  onSaveDividend: (dividend: Omit<Dividend, 'id'>) => void;
}

export const DividendModal: React.FC<DividendModalProps> = ({
  isOpen,
  onClose,
  advisors,
  quotes,
  defaultAdvisorId,
  onSaveDividend,
}) => {
  const [advisorId, setAdvisorId] = useState(defaultAdvisorId || advisors[0]?.id || '');
  const [symbol, setSymbol] = useState('HDFCBANK');
  const [name, setName] = useState('HDFC Bank Ltd');
  const [exDate, setExDate] = useState(new Date().toISOString().split('T')[0]);
  const [creditDate, setCreditDate] = useState(new Date().toISOString().split('T')[0]);
  const [sharesEligible, setSharesEligible] = useState<number>(50);
  const [perShareAmount, setPerShareAmount] = useState<number>(19.5);
  const [tdsDeducted, setTdsDeducted] = useState<number>(0);
  const [notes, setNotes] = useState('Final Dividend Credited to Bank');

  const handleSymbolChange = (sym: string) => {
    const upper = sym.toUpperCase().trim();
    setSymbol(upper);
    if (quotes[upper]) {
      setName(quotes[upper].name);
    }
  };

  const calculatedTotal = sharesEligible * perShareAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim() || sharesEligible <= 0 || perShareAmount <= 0) return;

    onSaveDividend({
      advisorId,
      symbol: symbol.toUpperCase().trim(),
      name: name.trim() || symbol.toUpperCase().trim(),
      exDate,
      creditDate,
      sharesEligible: Number(sharesEligible),
      perShareAmount: Number(perShareAmount),
      totalAmount: calculatedTotal,
      tdsDeducted: Number(tdsDeducted) || 0,
      notes: notes.trim(),
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-amber-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Log Dividend Payout</h3>
              <p className="text-xs text-slate-500">Attribute cash dividend to the specific advisor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Attributed Advisor / Book <span className="text-rose-500">*</span>
            </label>
            <select
              value={advisorId}
              onChange={(e) => setAdvisorId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-hidden"
              required
            >
              {advisors.map((adv) => (
                <option key={adv.id} value={adv.id}>
                  {adv.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Stock Symbol <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => handleSymbolChange(e.target.value)}
                placeholder="e.g. HDFCBANK"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold uppercase focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Company Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. HDFC Bank Ltd"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Ex-Dividend Date</label>
              <input
                type="date"
                value={exDate}
                onChange={(e) => setExDate(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Credit / Record Date</label>
              <input
                type="date"
                value={creditDate}
                onChange={(e) => setCreditDate(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:outline-hidden"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Shares Held <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={sharesEligible}
                onChange={(e) => setSharesEligible(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Rate / Share (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={perShareAmount}
                onChange={(e) => setPerShareAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">TDS Deducted (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={tdsDeducted}
                onChange={(e) => setTdsDeducted(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Remarks / Bank Credit Note</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. FY24 Final Dividend credited to ICICI Bank A/C"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden"
            />
          </div>

          <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
            <span className="text-amber-900 font-bold">Total Dividend Credited:</span>
            <span className="text-base font-extrabold text-amber-700 font-mono">{formatINR(calculatedTotal)}</span>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition shadow-xs"
            >
              Save Dividend
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
