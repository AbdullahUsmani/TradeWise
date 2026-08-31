export type AdvisorType = 'SEBI_RIA' | 'SMALLCASE' | 'TRADING_AGENT' | 'SELF' | 'OTHER';

export type PortfolioType =
  | 'CORE_LONG_TERM'
  | 'SWING_MOMENTUM'
  | 'SMALLCAP_GROWTH'
  | 'DIVIDEND_YIELD'
  | 'THEMATIC'
  | 'HIGH_BETA'
  | 'BALANCED'
  | 'CUSTOM';

export interface AdvisorPortfolio {
  id: string;
  advisorId: string;
  name: string; // e.g. "Core Compounders", "High Beta Swing", "Special Situations"
  type: PortfolioType;
  description?: string;
  targetAllocationPct?: number; // e.g. 40%
  color?: string;
  createdAt: string;
}

export interface Advisor {
  id: string;
  name: string;
  type: AdvisorType;
  sebiRegNo?: string;
  color: string;
  badgeBg: string;
  description: string;
  strategyStyle: string; // e.g. "Long-Term Value", "Momentum / Swing", "Factor / Growth"
  feeStructure?: string; // e.g. "Flat ₹15,000/yr", "2.5% AUM", "Profit Share"
  contactEmail?: string;
  createdAt: string;
}

export type TransactionType = 'BUY' | 'SELL';
export type MarketCapCategory = 'LARGE' | 'MID' | 'SMALL' | 'MICRO';

export interface Transaction {
  id: string;
  advisorId: string;
  portfolioId?: string; // Links transaction to a specific portfolio under the advisor
  symbol: string;
  name: string;
  sector: string;
  marketCap: MarketCapCategory;
  type: TransactionType;
  date: string; // YYYY-MM-DD
  quantity: number;
  price: number;
  charges: number; // STT, Brokerage, Exchange fees, GST
  notes?: string;
  tradeTag?: string; // e.g., "Quarterly Rebalance", "Stoploss", "Breakout"
}

export interface Dividend {
  id: string;
  advisorId: string;
  portfolioId?: string; // Links dividend to a specific portfolio under the advisor
  symbol: string;
  name: string;
  exDate: string; // YYYY-MM-DD
  creditDate: string; // YYYY-MM-DD
  sharesEligible: number;
  perShareAmount: number;
  totalAmount: number;
  tdsDeducted?: number;
  notes?: string;
}

export interface StockQuote {
  symbol: string;
  name: string;
  sector: string;
  marketCap: MarketCapCategory;
  currentPrice: number;
  dayChange: number;
  dayChangePercent: number;
  peRatio?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

export interface ExitedTrade {
  id: string;
  advisorId: string;
  portfolioId?: string;
  portfolioName?: string;
  symbol: string;
  name: string;
  sector: string;
  marketCap: MarketCapCategory;
  buyDate: string;
  sellDate: string;
  quantity: number;
  avgBuyPrice: number;
  sellPrice: number;
  charges: number;
  realizedGain: number; // (sellPrice - avgBuyPrice) * quantity - charges
  returnPercentage: number;
  holdingDays: number;
  notes?: string;
}

export interface AdvisorHolding {
  symbol: string;
  name: string;
  sector: string;
  marketCap: MarketCapCategory;
  quantity: number;
  avgBuyPrice: number;
  investedAmount: number;
  currentPrice: number;
  currentValue: number;
  unrealizedGain: number;
  unrealizedReturnPercent: number;
  dayChangeAmount: number;
  dayChangePercent: number;
  weightWithinAdvisor: number; // percentage (0 - 100) within this advisor's holdings
  weightInTotalPortfolio: number; // percentage (0 - 100) in entire portfolio
  portfolioId?: string;
  portfolioName?: string;
}

export interface PortfolioPerformance {
  portfolio: AdvisorPortfolio;
  advisor: Advisor;
  activeHoldings: AdvisorHolding[];
  exitedTrades: ExitedTrade[];
  dividends: Dividend[];
  totalInvestedActive: number;
  totalCurrentValue: number;
  unrealizedPnL: number;
  unrealizedReturnPct: number;
  realizedPnL: number;
  realizedTradesCount: number;
  profitableTradesCount: number;
  lossTradesCount: number;
  winRate: number;
  totalDividends: number;
  totalNetGain: number;
  netReturnPct: number;
  xirrEstimate: number;
  weightWithinAdvisor: number; // % of this advisor's total capital
  weightInTotalPortfolio: number; // % of total combined portfolio
}

export interface AdvisorPerformance {
  advisor: Advisor;
  portfolios: AdvisorPortfolio[];
  portfolioPerformances: PortfolioPerformance[];
  activeHoldings: AdvisorHolding[];
  exitedTrades: ExitedTrade[];
  dividends: Dividend[];
  
  totalInvestedActive: number;
  totalCurrentValue: number;
  unrealizedPnL: number;
  unrealizedReturnPct: number;
  
  realizedPnL: number;
  realizedTradesCount: number;
  profitableTradesCount: number;
  lossTradesCount: number;
  winRate: number; // 0 - 100%
  
  totalDividends: number;
  dividendYieldOnInvested: number;
  
  totalNetGain: number; // unrealizedPnL + realizedPnL + totalDividends
  netReturnPct: number;
  xirrEstimate: number; // Annualized return %
  
  portfolioSharePct: number; // % of total active portfolio invested through this advisor
  currentValueSharePct: number; // % of total portfolio current value
  
  sectorDistribution: { sector: string; amount: number; percentage: number }[];
  marketCapDistribution: { mcap: MarketCapCategory; amount: number; percentage: number }[];
}

export interface ConsolidatedDematStock {
  symbol: string;
  name: string;
  sector: string;
  marketCap: MarketCapCategory;
  currentPrice: number;
  totalQuantity: number;
  blendedAvgPrice: number;
  totalInvested: number;
  totalCurrentValue: number;
  totalUnrealizedPnL: number;
  unrealizedReturnPct: number;
  dayChangePercent: number;
  isMultiAdvisor: boolean;
  advisorBuckets: {
    advisorId: string;
    advisorName: string;
    advisorColor: string;
    portfolioId?: string;
    portfolioName?: string;
    quantity: number;
    avgPrice: number;
    investedAmount: number;
    currentValue: number;
    unrealizedPnL: number;
    unrealizedReturnPct: number;
    weightInStock: number; // % of this stock owned by this advisor
  }[];
}

export type TimeframePreset = 'ALL' | 'FY26' | 'FY25' | 'FY24' | '1Y' | '6M' | '3M' | '1M' | 'YTD' | 'CUSTOM';

export interface TimeframeFilter {
  preset: TimeframePreset;
  startDate?: string;
  endDate?: string;
  label: string;
}
