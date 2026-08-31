import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Advisor, AdvisorPortfolio, Dividend, StockQuote, Transaction } from '../types/portfolio';

export interface PortfolioData {
  advisors: Advisor[];
  portfolios: AdvisorPortfolio[];
  transactions: Transaction[];
  dividends: Dividend[];
  quotes: Record<string, StockQuote>;
}

interface PortfolioDataContextValue {
  data: PortfolioData;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  save: (nextData: PortfolioData) => Promise<void>;
  clear: () => Promise<void>;
}

const defaultPortfolioData: PortfolioData = {
  advisors: [],
  portfolios: [],
  transactions: [],
  dividends: [],
  quotes: {},
};

const PortfolioDataContext = createContext<PortfolioDataContextValue | undefined>(undefined);

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<PortfolioData>(defaultPortfolioData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Data is stored locally - no API call needed
    setLoading(false);
  }, []);

  const save = useCallback(async (nextData: PortfolioData) => {
    const payload: PortfolioData = {
      advisors: Array.isArray(nextData.advisors) ? nextData.advisors : [],
      portfolios: Array.isArray(nextData.portfolios) ? nextData.portfolios : [],
      transactions: Array.isArray(nextData.transactions) ? nextData.transactions : [],
      dividends: Array.isArray(nextData.dividends) ? nextData.dividends : [],
      quotes: nextData.quotes && typeof nextData.quotes === 'object' && !Array.isArray(nextData.quotes) ? nextData.quotes : {},
    };

    setData(payload);
    setError(null);
  }, []);

  const clear = useCallback(async () => {
    setData(defaultPortfolioData);
    setError(null);
  }, []);

  const value = useMemo<PortfolioDataContextValue>(
    () => ({ data, loading, error, refresh, save, clear }),
    [data, loading, error, refresh, save, clear]
  );

  return <PortfolioDataContext.Provider value={value}>{children}</PortfolioDataContext.Provider>;
};

export const usePortfolioData = () => {
  const context = useContext(PortfolioDataContext);
  if (!context) {
    throw new Error('usePortfolioData must be used within a PortfolioProvider');
  }
  return context;
};
