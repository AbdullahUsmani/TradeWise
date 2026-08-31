import React, { useState } from 'react';
import { X, Users, PlusCircle, Trash2, Edit2, FolderPlus, Layers, Briefcase, Tag, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { Advisor, AdvisorPortfolio, AdvisorType, PortfolioType } from '../../types/portfolio';

interface AdvisorManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  advisors: Advisor[];
  portfolios: AdvisorPortfolio[];
  onAddAdvisor: (advisor: Omit<Advisor, 'id' | 'createdAt'>) => void;
  onUpdateAdvisor: (advisor: Advisor) => void;
  onDeleteAdvisor: (id: string) => void;
  onAddPortfolio: (portfolio: Omit<AdvisorPortfolio, 'id' | 'createdAt'>) => void;
  onUpdatePortfolio: (portfolio: AdvisorPortfolio) => void;
  onDeletePortfolio: (id: string) => void;
}

const PRESET_COLORS = [
  '#059669', // Emerald
  '#4F46E5', // Indigo
  '#D97706', // Amber
  '#0284C7', // Sky
  '#7C3AED', // Violet
  '#E11D48', // Rose
  '#0D9488', // Teal
  '#EA580C', // Orange
  '#475569', // Slate
];

const PORTFOLIO_TYPES: { type: PortfolioType; label: string; description: string }[] = [
  { type: 'CORE_LONG_TERM', label: 'Core Long-Term', description: 'Compounders, high-quality buy-and-hold businesses' },
  { type: 'SWING_MOMENTUM', label: 'Swing & Momentum', description: 'Trend-following, breakout and rotational swing trades' },
  { type: 'SMALLCAP_GROWTH', label: 'Smallcap & Emerging', description: 'High-growth small and microcap aggressive alpha' },
  { type: 'DIVIDEND_YIELD', label: 'Dividend Yield', description: 'High dividend payout, cashflow-focused income generation' },
  { type: 'THEMATIC', label: 'Thematic / Sectoral', description: 'Sector-specific baskets (e.g. Defence, Green Energy, Tech)' },
  { type: 'HIGH_BETA', label: 'High Beta / Alpha', description: 'Aggressive tactical plays with dynamic stoploss rules' },
  { type: 'BALANCED', label: 'Balanced / Hybrid', description: 'Diversified mix of growth, defensive, and income assets' },
  { type: 'CUSTOM', label: 'Custom Strategy', description: 'Custom mandate or proprietary ruleset' },
];

export const AdvisorManagerModal: React.FC<AdvisorManagerModalProps> = ({
  isOpen,
  onClose,
  advisors,
  portfolios,
  onAddAdvisor,
  onUpdateAdvisor,
  onDeleteAdvisor,
  onAddPortfolio,
  onUpdatePortfolio,
  onDeletePortfolio,
}) => {
  // Active subview: 'advisors' or 'portfolios'
  const [activeTab, setActiveTab] = useState<'advisors' | 'portfolios'>('advisors');

  // Advisor form states
  const [isCreatingAdvisor, setIsCreatingAdvisor] = useState(false);
  const [editingAdvisorId, setEditingAdvisorId] = useState<string | null>(null);
  const [advName, setAdvName] = useState('');
  const [advType, setAdvType] = useState<AdvisorType>('TRADING_AGENT');
  const [sebiRegNo, setSebiRegNo] = useState('');
  const [advColor, setAdvColor] = useState('#D97706');
  const [strategyStyle, setStrategyStyle] = useState('Momentum & Swing Trading');
  const [feeStructure, setFeeStructure] = useState('15% Profit Share');
  const [advDescription, setAdvDescription] = useState('');

  // Portfolio form states
  const [isCreatingPortfolio, setIsCreatingPortfolio] = useState(false);
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
  const [targetAdvisorIdForPort, setTargetAdvisorIdForPort] = useState(advisors[0]?.id || '');
  const [portName, setPortName] = useState('');
  const [portType, setPortType] = useState<PortfolioType>('CORE_LONG_TERM');
  const [portAllocation, setPortAllocation] = useState<number>(30);
  const [portDescription, setPortDescription] = useState('');

  const [expandedAdvisorIds, setExpandedAdvisorIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    advisors.forEach((a) => (initial[a.id] = true));
    return initial;
  });

  const toggleAdvisorExpand = (advId: string) => {
    setExpandedAdvisorIds((prev) => ({ ...prev, [advId]: !prev[advId] }));
  };

  const handleStartCreateAdvisor = () => {
    setIsCreatingAdvisor(true);
    setEditingAdvisorId(null);
    setAdvName('');
    setAdvType('TRADING_AGENT');
    setSebiRegNo('');
    setAdvColor('#D97706');
    setStrategyStyle('Momentum & Swing Trading');
    setFeeStructure('15% Profit Share');
    setAdvDescription('');
  };

  const handleStartEditAdvisor = (adv: Advisor) => {
    setIsCreatingAdvisor(false);
    setEditingAdvisorId(adv.id);
    setAdvName(adv.name);
    setAdvType(adv.type);
    setSebiRegNo(adv.sebiRegNo || '');
    setAdvColor(adv.color);
    setStrategyStyle(adv.strategyStyle);
    setFeeStructure(adv.feeStructure || '');
    setAdvDescription(adv.description);
  };

  const handleAdvisorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advName.trim()) return;

    const badgeBg =
      advType === 'SEBI_RIA'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : advType === 'SMALLCASE'
        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
        : advType === 'TRADING_AGENT'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-sky-50 text-sky-700 border-sky-200';

    if (editingAdvisorId) {
      const existing = advisors.find((a) => a.id === editingAdvisorId);
      if (existing) {
        onUpdateAdvisor({
          ...existing,
          name: advName.trim(),
          type: advType,
          sebiRegNo: sebiRegNo.trim() || undefined,
          color: advColor,
          badgeBg,
          strategyStyle: strategyStyle.trim(),
          feeStructure: feeStructure.trim() || undefined,
          description: advDescription.trim(),
        });
      }
    } else {
      onAddAdvisor({
        name: advName.trim(),
        type: advType,
        sebiRegNo: sebiRegNo.trim() || undefined,
        color: advColor,
        badgeBg,
        strategyStyle: strategyStyle.trim(),
        feeStructure: feeStructure.trim() || undefined,
        description: advDescription.trim(),
      });
    }

    setIsCreatingAdvisor(false);
    setEditingAdvisorId(null);
  };

  const handleStartCreatePortfolio = (defaultAdvId?: string) => {
    setIsCreatingPortfolio(true);
    setEditingPortfolioId(null);
    setTargetAdvisorIdForPort(defaultAdvId || advisors[0]?.id || '');
    setPortName('');
    setPortType('CORE_LONG_TERM');
    setPortAllocation(30);
    setPortDescription('');
  };

  const handleStartEditPortfolio = (port: AdvisorPortfolio) => {
    setIsCreatingPortfolio(false);
    setEditingPortfolioId(port.id);
    setTargetAdvisorIdForPort(port.advisorId);
    setPortName(port.name);
    setPortType(port.type);
    setPortAllocation(port.targetAllocationPct || 30);
    setPortDescription(port.description || '');
  };

  const handlePortfolioSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!portName.trim() || !targetAdvisorIdForPort) return;

    if (editingPortfolioId) {
      const existing = portfolios.find((p) => p.id === editingPortfolioId);
      if (existing) {
        onUpdatePortfolio({
          ...existing,
          advisorId: targetAdvisorIdForPort,
          name: portName.trim(),
          type: portType,
          targetAllocationPct: Number(portAllocation) || undefined,
          description: portDescription.trim() || undefined,
        });
      }
    } else {
      onAddPortfolio({
        advisorId: targetAdvisorIdForPort,
        name: portName.trim(),
        type: portType,
        targetAllocationPct: Number(portAllocation) || undefined,
        description: portDescription.trim() || undefined,
      });
    }

    setIsCreatingPortfolio(false);
    setEditingPortfolioId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
              <Layers className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Manage Advisors & Strategy Portfolios</h3>
              <p className="text-xs text-slate-500">Organize multiple distinct portfolios per advisor and tag trades directly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center border-b border-slate-200 px-6 pt-3 bg-white gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('advisors')}
            className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'advisors'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Advisors & Agents ({advisors.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('portfolios')}
            className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'portfolios'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Portfolios & Baskets ({portfolios.length})</span>
          </button>
        </div>

        <div className="p-6 space-y-6 text-xs max-h-[70vh] overflow-y-auto">
          
          {/* TAB 1: ADVISORS & THEIR PORTFOLIOS */}
          {activeTab === 'advisors' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Configured Advisors & Books
                  </h4>
                  <p className="text-[11px] text-slate-500">Each advisor can hold multiple portfolios (e.g. Core, Momentum, Dividends)</p>
                </div>
                {!isCreatingAdvisor && !editingAdvisorId && (
                  <button
                    type="button"
                    onClick={handleStartCreateAdvisor}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add New Advisor</span>
                  </button>
                )}
              </div>

              {/* Advisor creation/edit form */}
              {(isCreatingAdvisor || editingAdvisorId) && (
                <form onSubmit={handleAdvisorSubmit} className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                    <h4 className="font-bold text-slate-900 text-xs">
                      {editingAdvisorId ? 'Edit Advisor Details' : 'Add New Advisor / Strategy Book'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingAdvisor(false);
                        setEditingAdvisorId(null);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Advisor / Entity Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={advName}
                        onChange={(e) => setAdvName(e.target.value)}
                        placeholder="e.g. Alpha Momentum Research"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-hidden"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Advisor Category</label>
                      <select
                        value={advType}
                        onChange={(e: any) => setAdvType(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden"
                      >
                        <option value="TRADING_AGENT">Active Trading Agent</option>
                        <option value="SEBI_RIA">SEBI Registered RIA / RA</option>
                        <option value="SMALLCASE">Smallcase Manager</option>
                        <option value="SELF">Self-Directed Strategy</option>
                        <option value="OTHER">Other Advisory</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Primary Style / Mandate</label>
                      <input
                        type="text"
                        value={strategyStyle}
                        onChange={(e) => setStrategyStyle(e.target.value)}
                        placeholder="e.g. High-Beta Breakouts & Swing"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Fee Model / Pricing</label>
                      <input
                        type="text"
                        value={feeStructure}
                        onChange={(e) => setFeeStructure(e.target.value)}
                        placeholder="e.g. 15% Profit Sharing / ₹2,499/qtr"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">SEBI Reg No (If Applicable)</label>
                      <input
                        type="text"
                        value={sebiRegNo}
                        onChange={(e) => setSebiRegNo(e.target.value)}
                        placeholder="e.g. INA000012345"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Color Palette</label>
                      <div className="flex items-center gap-1.5 pt-1">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setAdvColor(c)}
                            className={`w-5 h-5 rounded-full transition-transform ${
                              advColor === c ? 'scale-125 ring-2 ring-slate-900 ring-offset-1' : 'hover:scale-110'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Description / Risk Policy</label>
                    <input
                      type="text"
                      value={advDescription}
                      onChange={(e) => setAdvDescription(e.target.value)}
                      placeholder="Investment philosophy, target CAGR, max drawdown tolerance..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs"
                    >
                      {editingAdvisorId ? 'Save Changes' : 'Create Advisor'}
                    </button>
                  </div>
                </form>
              )}

              {/* Advisor List Cards with Portfolios grouped */}
              <div className="space-y-3">
                {advisors.map((adv) => {
                  const advPorts = portfolios.filter((p) => p.advisorId === adv.id);
                  const isExpanded = !!expandedAdvisorIds[adv.id];

                  return (
                    <div
                      key={adv.id}
                      className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs hover:border-slate-300 transition"
                    >
                      {/* Advisor header */}
                      <div className="p-3.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                        <div
                          className="flex items-center gap-2.5 cursor-pointer select-none"
                          onClick={() => toggleAdvisorExpand(adv.id)}
                        >
                          <button type="button" className="text-slate-400 hover:text-slate-700">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: adv.color }} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">{adv.name}</span>
                              <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${adv.badgeBg}`}>
                                {adv.type === 'SEBI_RIA'
                                  ? 'SEBI RIA'
                                  : adv.type === 'SMALLCASE'
                                  ? 'Smallcase'
                                  : adv.type === 'TRADING_AGENT'
                                  ? 'Trading Agent'
                                  : 'Self'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>Style: {adv.strategyStyle}</span>
                              {adv.feeStructure && <span>• Fee: {adv.feeStructure}</span>}
                              <span>• {advPorts.length} {advPorts.length === 1 ? 'Portfolio' : 'Portfolios'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartCreatePortfolio(adv.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
                          >
                            <FolderPlus className="w-3 h-3" />
                            <span>+ Portfolio</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditAdvisor(adv)}
                            className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 rounded hover:bg-slate-100 transition"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteAdvisor(adv.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete advisor"
                            aria-label="Delete advisor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Portfolios nested under this advisor */}
                      {isExpanded && (
                        <div className="p-3.5 bg-white space-y-2">
                          {advPorts.length === 0 ? (
                            <div className="p-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center text-slate-500 text-[11px]">
                              <span>No customized portfolios created for {adv.name} yet. Trades will default to Main Portfolio.</span>{' '}
                              <button
                                type="button"
                                onClick={() => handleStartCreatePortfolio(adv.id)}
                                className="text-indigo-600 font-bold underline ml-1"
                              >
                                Create First Portfolio
                              </button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {advPorts.map((port) => {
                                const typeObj = PORTFOLIO_TYPES.find((t) => t.type === port.type);
                                return (
                                  <div
                                    key={port.id}
                                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition flex flex-col justify-between"
                                  >
                                    <div>
                                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                        <div className="flex items-center gap-1.5">
                                          <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                                          <span className="font-bold text-slate-900 text-xs">{port.name}</span>
                                        </div>
                                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                                          {typeObj?.label || port.type}
                                        </span>
                                      </div>

                                      <div className="text-[11px] text-slate-600 mt-2 space-y-0.5">
                                        {port.targetAllocationPct && (
                                          <div>Target Allocation: <strong>{port.targetAllocationPct}%</strong></div>
                                        )}
                                        {port.description && (
                                          <div className="text-slate-500 line-clamp-1">{port.description}</div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditPortfolio(port)}
                                        className="px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:text-indigo-600 rounded hover:bg-slate-200/60 transition"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onDeletePortfolio(port.id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title="Delete portfolio"
                                        aria-label="Delete portfolio"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PORTFOLIOS MANAGER */}
          {activeTab === 'portfolios' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    All Strategy Portfolios ({portfolios.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">Manage individual portfolios and their advisor associations</p>
                </div>
                {!isCreatingPortfolio && !editingPortfolioId && (
                  <button
                    type="button"
                    onClick={() => handleStartCreatePortfolio()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Create New Portfolio</span>
                  </button>
                )}
              </div>

              {/* Portfolio creation/edit form */}
              {(isCreatingPortfolio || editingPortfolioId) && (
                <form onSubmit={handlePortfolioSubmit} className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                    <h4 className="font-bold text-slate-900 text-xs">
                      {editingPortfolioId ? 'Edit Portfolio Strategy' : 'Create New Strategy Portfolio'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingPortfolio(false);
                        setEditingPortfolioId(null);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Parent Advisor / Agency <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={targetAdvisorIdForPort}
                        onChange={(e) => setTargetAdvisorIdForPort(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-hidden"
                        required
                      >
                        {advisors.map((adv) => (
                          <option key={adv.id} value={adv.id}>
                            {adv.name} ({adv.strategyStyle})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Portfolio Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={portName}
                        onChange={(e) => setPortName(e.target.value)}
                        placeholder="e.g. High-Beta Momentum Basket"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-hidden"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Strategy Classification</label>
                      <select
                        value={portType}
                        onChange={(e: any) => setPortType(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden"
                      >
                        {PORTFOLIO_TYPES.map((t) => (
                          <option key={t.type} value={t.type}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Target Allocation (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={portAllocation}
                        onChange={(e) => setPortAllocation(Number(e.target.value))}
                        placeholder="e.g. 30"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Mandate / Strategy Notes</label>
                    <input
                      type="text"
                      value={portDescription}
                      onChange={(e) => setPortDescription(e.target.value)}
                      placeholder="e.g. 15-20 stocks, max 7% single stock cap, 20-DMA trailing stoploss"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs"
                    >
                      {editingPortfolioId ? 'Save Portfolio' : 'Create Portfolio'}
                    </button>
                  </div>
                </form>
              )}

              {/* Portfolio Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {portfolios.map((port) => {
                  const adv = advisors.find((a) => a.id === port.advisorId);
                  const typeObj = PORTFOLIO_TYPES.find((t) => t.type === port.type);

                  return (
                    <div
                      key={port.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:shadow-2xs transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-indigo-600" />
                            <div>
                              <span className="font-bold text-slate-900 text-xs">{port.name}</span>
                              {adv && (
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: adv.color }} />
                                  <span>{adv.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                            {typeObj?.label || port.type}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-600 mt-2 space-y-1">
                          {port.targetAllocationPct && (
                            <div>Target Weight: <strong>{port.targetAllocationPct}%</strong> of Advisor</div>
                          )}
                          {port.description && (
                            <div className="text-slate-500 text-[11px] line-clamp-2">{port.description}</div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEditPortfolio(port)}
                          className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 rounded hover:bg-slate-100 transition"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeletePortfolio(port.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete portfolio"
                          aria-label="Delete portfolio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
