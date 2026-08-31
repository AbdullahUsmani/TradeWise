import React, { useState, useEffect } from 'react';
import { X, PlusCircle, ArrowDownLeft, ArrowUpRight, Briefcase } from 'lucide-react';
import { Advisor, AdvisorPortfolio, StockQuote, Transaction, TransactionType } from '../../types/portfolio';
import { formatINR } from '../../utils/portfolioMath';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  advisors: Advisor[];
  portfolios?: AdvisorPortfolio[];
  quotes: Record<string, StockQuote>;
  defaultAdvisorId?: string;
  defaultPortfolioId?: string;
  onSaveTrade: (trade: Omit<Transaction, 'id'>) => void;
}

export const TradeModal: React.FC<TradeModalProps> = ({
  isOpen,
  onClose,
  advisors,
  portfolios = [],
  quotes,
  defaultAdvisorId,
  defaultPortfolioId,
  onSaveTrade,
}) => {
  if (!isOpen) return null;

  const [advisorId, setAdvisorId] = useState(defaultAdvisorId || advisors[0]?.id || '');
  const [portfolioId, setPortfolioId] = useState<string>(defaultPortfolioId || '');
  const [type, setType] = useState<TransactionType>('BUY');
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [sector, setSector] = useState('Diversified');
  const [marketCap, setMarketCap] = useState<'LARGE' | 'MID' | 'SMALL' | 'MICRO'>('LARGE');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState<number>(10);
  const [price, setPrice] = useState<number>(1000);
  const [charges, setCharges] = useState<number>(25);
  const [tradeTag, setTradeTag] = useState('Advisor Recommendation');
  const [notes, setNotes] = useState('');

  // Portfolios available for the selected advisor
  const availablePortfolios = portfolios.filter((p) => p.advisorId === advisorId);

  // Sync portfolio selection when advisor changes
  useEffect(() => {
    const ports = portfolios.filter((p) => p.advisorId === advisorId);
    if (ports.length > 0) {
      if (!ports.some((p) => p.id === portfolioId)) {
        setPortfolioId(ports[0].id);
      }
    } else {
      setPortfolioId('');
    }
  }, [advisorId, portfolios]);

  // Handle symbol selection and autofill details if in quotes
  const handleSymbolChange = (sym: string) => {
    const upper = sym.toUpperCase().trim();
    setSymbol(upper);
    if (quotes[upper]) {
      const q = quotes[upper];
      setName(q.name);
      setSector(q.sector);
      setMarketCap(q.marketCap);
      setPrice(q.currentPrice);
    }
  };

  const handleSelectQuickStock = (quote: StockQuote) => {
    setSymbol(quote.symbol);
    setName(quote.name);
    setSector(quote.sector);
    setMarketCap(quote.marketCap);
    setPrice(quote.currentPrice);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim() || quantity <= 0 || price <= 0) return;

    const selectedPort = portfolios.find((p) => p.id === portfolioId);

    onSaveTrade({
      advisorId,
      portfolioId: portfolioId || undefined,
      portfolioName: selectedPort ? selectedPort.name : undefined,
      symbol: symbol.toUpperCase().trim(),
      name: name.trim() || symbol.toUpperCase().trim(),
      sector,
      marketCap,
      type,
      date,
      quantity: Number(quantity),
      price: Number(price),
      charges: Number(charges) || 0,
      tradeTag: tradeTag.trim(),
      notes: notes.trim(),
    });

    onClose();
  };

  const totalEstimate = quantity * price + (type === 'BUY' ? Number(charges) : -Number(charges));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              +
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Log Buy / Sell Transaction</h3>
              <p className="text-xs text-slate-500">Tag trade to specific advisor and portfolio for segregated metrics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Action Type Toggle (BUY vs SELL) */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setType('BUY')}
              className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
                type === 'BUY'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>BUY (Enter Position)</span>
            </button>
            <button
              type="button"
              onClick={() => setType('SELL')}
              className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
                type === 'SELL'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>SELL (Exit Position)</span>
            </button>
          </div>

          {/* Advisor & Portfolio Selection Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Advisor / Agency <span className="text-rose-500">*</span>
              </label>
              <select
                value={advisorId}
                onChange={(e) => setAdvisorId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                required
              >
                {advisors.map((adv) => (
                  <option key={adv.id} value={adv.id}>
                    {adv.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                <span>Strategy Portfolio</span>
              </label>
              <select
                value={portfolioId}
                onChange={(e) => setPortfolioId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              >
                {availablePortfolios.length === 0 ? (
                  <option value="">Main / Default Portfolio</option>
                ) : (
                  <>
                    <option value="">General Portfolio</option>
                    {availablePortfolios.map((port) => (
                      <option key={port.id} value={port.id}>
                        {port.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Quick Popular Stock Chips */}
          <div>
            <span className="block text-[11px] text-slate-400 font-medium mb-1">Quick Select Stock:</span>
            <div className="flex flex-wrap gap-1">
              {['RELIANCE', 'HDFCBANK', 'TATAMOTORS', 'INFY', 'ICICIBANK', 'POLYCAB', 'TRENT', 'DIXON'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => quotes[s] && handleSelectQuickStock(quotes[s])}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded text-[11px] font-mono font-medium text-slate-700 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Stock Symbol & Company Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Stock Symbol <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => handleSymbolChange(e.target.value)}
                placeholder="e.g. RELIANCE"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold uppercase focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Company Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Reliance Industries Ltd"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Sector & Market Cap */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Sector</label>
              <input
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="e.g. Financial Services"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Market Cap</label>
              <select
                value={marketCap}
                onChange={(e: any) => setMarketCap(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="LARGE">Large Cap</option>
                <option value="MID">Mid Cap</option>
                <option value="SMALL">Small Cap</option>
                <option value="MICRO">Micro Cap</option>
              </select>
            </div>
          </div>

          {/* Date, Quantity, Execution Price */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Trade Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Quantity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Price (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0.05"
                step="0.05"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                required
              />
            </div>
          </div>

          {/* Charges & Tag */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">STT / Brokerage / Charges (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={charges}
                onChange={(e) => setCharges(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Strategy Tag / Rationale</label>
              <input
                type="text"
                value={tradeTag}
                onChange={(e) => setTradeTag(e.target.value)}
                placeholder="e.g. Breakout retest / Target 24%"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Trade Notes / Target / Stoploss</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. SL: 1420, Target 1: 1680, Rebalancing weight: 5%"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Calculation summary bar */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <span className="font-semibold text-slate-600">Net Estimated Cashflow:</span>
            <span className={`font-mono font-bold text-sm ${type === 'BUY' ? 'text-slate-900' : 'text-emerald-700'}`}>
              {type === 'BUY' ? '-' : '+'}{formatINR(Math.abs(totalEstimate))}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 font-bold rounded-lg transition shadow-xs"
            >
              Save Trade
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
