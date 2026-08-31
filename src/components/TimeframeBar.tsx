import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, ChevronDown, Check, X } from 'lucide-react';
import { TimeframeFilter, TimeframePreset } from '../types/portfolio';

interface TimeframeBarProps {
  currentFilter?: TimeframeFilter;
  timeframe?: TimeframeFilter;
  onFilterChange?: (filter: TimeframeFilter) => void;
  onSelectTimeframe?: (filter: TimeframeFilter) => void;
  className?: string;
  compact?: boolean;
}

const PRESETS: { id: TimeframePreset; label: string; shortLabel: string }[] = [
  { id: 'ALL', label: 'All-Time', shortLabel: 'All' },
  { id: 'FY26', label: 'FY 25-26', shortLabel: 'FY26' },
  { id: 'FY25', label: 'FY 24-25', shortLabel: 'FY25' },
  { id: 'FY24', label: 'FY 23-24', shortLabel: 'FY24' },
  { id: '1Y', label: '1 Year', shortLabel: '1Y' },
  { id: '6M', label: '6 Months', shortLabel: '6M' },
  { id: '3M', label: '3 Months', shortLabel: '3M' },
  { id: 'YTD', label: 'YTD', shortLabel: 'YTD' },
  { id: 'CUSTOM', label: 'Custom Range', shortLabel: 'Custom' },
];

export const TimeframeBar: React.FC<TimeframeBarProps> = ({
  currentFilter,
  timeframe,
  onFilterChange,
  onSelectTimeframe,
  className = '',
  compact = false,
}) => {
  const activeFilter = currentFilter || timeframe || { preset: 'ALL', label: 'All-Time' };
  
  const notifyChange = (filter: TimeframeFilter) => {
    if (onFilterChange) onFilterChange(filter);
    if (onSelectTimeframe) onSelectTimeframe(filter);
  };

  const [showCustomPopover, setShowCustomPopover] = useState(false);
  const [startDate, setStartDate] = useState(activeFilter.startDate || '2024-04-01');
  const [endDate, setEndDate] = useState(activeFilter.endDate || new Date().toISOString().split('T')[0]);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync internal dates with activeFilter
  useEffect(() => {
    if (activeFilter.startDate) setStartDate(activeFilter.startDate);
    if (activeFilter.endDate) setEndDate(activeFilter.endDate);
  }, [activeFilter.startDate, activeFilter.endDate]);

  // Handle outside click to close custom date picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowCustomPopover(false);
      }
    };
    if (showCustomPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomPopover]);

  const handleSelectPreset = (preset: TimeframePreset, label: string) => {
    if (preset === 'CUSTOM') {
      setShowCustomPopover(true);
      notifyChange({
        preset: 'CUSTOM',
        startDate,
        endDate,
        label: `Custom (${startDate} to ${endDate})`,
      });
    } else {
      setShowCustomPopover(false);
      notifyChange({
        preset,
        label,
      });
    }
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    setShowCustomPopover(false);
    notifyChange({
      preset: 'CUSTOM',
      startDate,
      endDate,
      label: `Custom (${startDate} to ${endDate})`,
    });
  };

  const isCustomActive = (activeFilter.preset || 'ALL') === 'CUSTOM';

  return (
    <div className={`relative flex items-center gap-2 ${className}`}>
      {/* Timeframe Presets Container */}
      <div className="bg-slate-200/70 p-1 rounded-xl flex items-center gap-1 overflow-x-auto scrollbar-none border border-slate-200/80 shadow-2xs">
        
        {!compact && (
          <div className="flex items-center gap-1 px-2 text-slate-500 text-xs font-medium border-r border-slate-300/70 pr-2.5 mr-0.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline text-[11px] font-semibold text-slate-600">Period:</span>
          </div>
        )}

        {PRESETS.map((p) => {
          const isActive = (activeFilter.preset || 'ALL') === p.id;
          return (
            <button
              key={p.id}
              id={`btn-timeframe-${p.id}`}
              type="button"
              onClick={() => handleSelectPreset(p.id, p.label)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <span>{compact ? p.shortLabel : p.label}</span>
              {p.id === 'CUSTOM' && isCustomActive && (
                <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Date Range Popover */}
      {showCustomPopover && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 w-80 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800">Select Custom Range</span>
            </div>
            <button
              type="button"
              onClick={() => setShowCustomPopover(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleApplyCustom} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Start Date (From)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-xs focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden transition"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                End Date (To)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-xs focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden transition"
                required
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCustomPopover(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-lg shadow-xs transition"
              >
                <Check className="w-3.5 h-3.5" />
                Apply Filter
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
