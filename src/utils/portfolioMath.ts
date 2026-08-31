import {
  Advisor,
  AdvisorHolding,
  AdvisorPerformance,
  AdvisorPortfolio,
  ConsolidatedDematStock,
  Dividend,
  ExitedTrade,
  MarketCapCategory,
  PortfolioPerformance,
  StockQuote,
  TimeframeFilter,
  Transaction,
} from '../types/portfolio';

// Format Indian Rupee currency (e.g. ₹1,45,200 or ₹14.52 L)
export function formatINR(amount: number, compact: boolean = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';

  const isNegative = amount < 0;
  const absVal = Math.abs(amount);

  if (compact) {
    if (absVal >= 10000000) {
      return `${isNegative ? '-' : ''}₹${(absVal / 10000000).toFixed(2)} Cr`;
    }
    if (absVal >= 100000) {
      return `${isNegative ? '-' : ''}₹${(absVal / 100000).toFixed(2)} L`;
    }
    if (absVal >= 1000) {
      return `${isNegative ? '-' : ''}₹${(absVal / 1000).toFixed(1)} k`;
    }
  }

  // Standard Indian comma separator
  const parts = absVal.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  const lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  const sign = isNegative ? '-₹' : '₹';
  return `${sign}${integerPart}${decimalPart === '00' ? '' : '.' + decimalPart}`;
}

export function formatPercent(value: number, includeSign: boolean = true): string {
  if (isNaN(value) || value === null || value === undefined) return '0.00%';
  const prefix = includeSign && value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

export function calculateDateRange(preset: string, customStart?: string, customEnd?: string): { start?: string; end?: string } {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  switch (preset) {
    case 'FY26':
      return { start: '2025-04-01', end: '2026-03-31' };
    case 'FY25':
      return { start: '2024-04-01', end: '2025-03-31' };
    case 'FY24':
      return { start: '2023-04-01', end: '2024-03-31' };
    case '1Y': {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      return { start: d.toISOString().split('T')[0], end: todayStr };
    }
    case '6M': {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      return { start: d.toISOString().split('T')[0], end: todayStr };
    }
    case '3M': {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      return { start: d.toISOString().split('T')[0], end: todayStr };
    }
    case '1M': {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return { start: d.toISOString().split('T')[0], end: todayStr };
    }
    case 'YTD': {
      return { start: `${yyyy}-01-01`, end: todayStr };
    }
    case 'CUSTOM':
      return { start: customStart, end: customEnd };
    case 'ALL':
    default:
      return { start: undefined, end: undefined };
  }
}

// Newton-Raphson XIRR calculation with fallback
export function calculateXIRR(cashFlows: { date: Date; amount: number }[]): number {
  if (cashFlows.length < 2) return 0;

  const hasPositive = cashFlows.some((cf) => cf.amount > 0);
  const hasNegative = cashFlows.some((cf) => cf.amount < 0);
  if (!hasPositive || !hasNegative) return 0;

  let rate = 0.1; // initial guess 10%
  const maxIterations = 100;
  const tolerance = 1e-6;

  const minDate = cashFlows.reduce((min, cf) => (cf.date < min ? cf.date : min), cashFlows[0].date);

  for (let i = 0; i < maxIterations; i++) {
    let fValue = 0;
    let fDerivative = 0;

    for (const cf of cashFlows) {
      const years = (cf.date.getTime() - minDate.getTime()) / (365.25 * 24 * 3600 * 1000);
      const denominator = Math.pow(1 + rate, years);
      if (isNaN(denominator) || denominator === 0) continue;

      fValue += cf.amount / denominator;
      fDerivative -= (years * cf.amount) / (denominator * (1 + rate));
    }

    if (Math.abs(fValue) < tolerance) {
      return rate * 100; // as percentage
    }

    if (Math.abs(fDerivative) < 1e-10) break;

    const newRate = rate - fValue / fDerivative;
    if (isNaN(newRate) || !isFinite(newRate)) break;
    rate = newRate;

    // Constrain rate to reasonable bounds
    if (rate <= -0.999) rate = -0.99;
    if (rate > 10.0) rate = 10.0;
  }

  // Fallback to simple CAGR or return approximation
  const totalIn = cashFlows.filter((cf) => cf.amount < 0).reduce((sum, cf) => sum + Math.abs(cf.amount), 0);
  const totalOut = cashFlows.filter((cf) => cf.amount > 0).reduce((sum, cf) => sum + cf.amount, 0);
  if (totalIn > 0) {
    const netGain = totalOut - totalIn;
    return (netGain / totalIn) * 100;
  }
  return 0;
}

// Core Multi-Advisor & Multi-Portfolio Accounting Engine
export function computePortfolioMetrics(
  advisors: Advisor[] = [],
  transactions: Transaction[] = [],
  dividends: Dividend[] = [],
  quotes: Record<string, StockQuote> = {},
  timeframe: TimeframeFilter = { preset: 'ALL', label: 'All-Time' },
  portfolios: AdvisorPortfolio[] = []
): {
  advisorPerformances: AdvisorPerformance[];
  consolidatedHoldings: ConsolidatedDematStock[];
  allExitedTrades: ExitedTrade[];
  grandTotalInvested: number;
  grandTotalCurrentValue: number;
  grandTotalUnrealizedPnL: number;
  grandTotalRealizedPnL: number;
  grandTotalDividends: number;
  grandTotalNetGain: number;
  grandTotalNetReturnPct: number;
  overallXIRR: number;
  stockOverlaps: { symbol: string; name: string; advisorCount: number; advisors: string[] }[];
} {
  const safeAdvisors = Array.isArray(advisors) ? advisors : [];
  const safePortfolios = Array.isArray(portfolios) ? portfolios : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeDividends = Array.isArray(dividends) ? dividends : [];
  const safeQuotes = quotes && typeof quotes === 'object' && !Array.isArray(quotes) ? quotes : {};

  const { start: filterStart, end: filterEnd } = calculateDateRange(
    timeframe?.preset || 'ALL',
    timeframe?.startDate,
    timeframe?.endDate
  );

  // Map portfolios by advisor for fast lookup
  const portfoliosByAdvisor = new Map<string, AdvisorPortfolio[]>();
  safeAdvisors.forEach((adv) => {
    const advPorts = safePortfolios.filter((p) => p.advisorId === adv.id);
    if (advPorts.length === 0) {
      // Default fallback portfolio for advisors without configured portfolios
      const defaultPort: AdvisorPortfolio = {
        id: `port-default-${adv.id}`,
        advisorId: adv.id,
        name: 'Main Portfolio',
        type: 'CORE_LONG_TERM',
        createdAt: adv.createdAt || new Date().toISOString(),
      };
      portfoliosByAdvisor.set(adv.id, [defaultPort]);
    } else {
      portfoliosByAdvisor.set(adv.id, advPorts);
    }
  });

  const portfolioMapById = new Map<string, AdvisorPortfolio>();
  portfoliosByAdvisor.forEach((ports) => {
    ports.forEach((p) => portfolioMapById.set(p.id, p));
  });

  const allExitedTrades: ExitedTrade[] = [];
  const advisorPerformanceMap = new Map<string, AdvisorPerformance>();

  // Sort transactions chronologically
  const sortedTx = [...safeTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Step 1: Calculate holdings and realized trades per advisor and per portfolio
  safeAdvisors.forEach((advisor) => {
    const advPortfolios = portfoliosByAdvisor.get(advisor.id) || [];
    const defaultPortfolioId = advPortfolios[0]?.id || `port-default-${advisor.id}`;

    const advTx = sortedTx.filter((t) => t.advisorId === advisor.id);
    const advisorExitedTrades: ExitedTrade[] = [];
    const advisorActiveHoldings: AdvisorHolding[] = [];

    // Process each portfolio under this advisor
    const portfolioPerformances: PortfolioPerformance[] = advPortfolios.map((portfolio) => {
      const portTx = advTx.filter((t) => (t.portfolioId || defaultPortfolioId) === portfolio.id);
      
      const stockLots = new Map<
        string,
        {
          symbol: string;
          name: string;
          sector: string;
          marketCap: MarketCapCategory;
          lots: { id: string; date: string; quantity: number; price: number; charges: number }[];
        }
      >();

      const exitedTradesForPort: ExitedTrade[] = [];

      portTx.forEach((tx) => {
        if (filterEnd && tx.date > filterEnd) return;

        if (!stockLots.has(tx.symbol)) {
          stockLots.set(tx.symbol, {
            symbol: tx.symbol,
            name: tx.name,
            sector: tx.sector,
            marketCap: tx.marketCap,
            lots: [],
          });
        }

        const entry = stockLots.get(tx.symbol)!;

        if (tx.type === 'BUY') {
          entry.lots.push({
            id: tx.id,
            date: tx.date,
            quantity: tx.quantity,
            price: tx.price,
            charges: tx.charges || 0,
          });
        } else if (tx.type === 'SELL') {
          let remainingSellQty = tx.quantity;
          let totalCostBasis = 0;
          let weightedBuyDate = tx.date;
          let totalBuyQtyMatched = 0;

          // FIFO matching
          while (remainingSellQty > 0 && entry.lots.length > 0) {
            const currentLot = entry.lots[0];
            const qtyToTake = Math.min(remainingSellQty, currentLot.quantity);
            const perShareCharge = currentLot.charges / currentLot.quantity;

            totalCostBasis += qtyToTake * (currentLot.price + perShareCharge);
            totalBuyQtyMatched += qtyToTake;
            weightedBuyDate = currentLot.date;

            currentLot.quantity -= qtyToTake;
            remainingSellQty -= qtyToTake;

            if (currentLot.quantity <= 0.0001) {
              entry.lots.shift();
            }
          }

          const avgBuyPrice = totalBuyQtyMatched > 0 ? totalCostBasis / totalBuyQtyMatched : tx.price;
          const totalSellProceeds = tx.quantity * tx.price - (tx.charges || 0);
          const realizedGain = totalSellProceeds - totalCostBasis;
          const returnPercentage = totalCostBasis > 0 ? (realizedGain / totalCostBasis) * 100 : 0;

          const buyDateTime = new Date(weightedBuyDate).getTime();
          const sellDateTime = new Date(tx.date).getTime();
          const holdingDays = Math.max(1, Math.round((sellDateTime - buyDateTime) / (1000 * 60 * 60 * 24)));

          const isWithinFilter = (!filterStart || tx.date >= filterStart) && (!filterEnd || tx.date <= filterEnd);

          if (isWithinFilter) {
            const exitedTrade: ExitedTrade = {
              id: `exit-${tx.id}`,
              advisorId: advisor.id,
              portfolioId: portfolio.id,
              portfolioName: portfolio.name,
              symbol: tx.symbol,
              name: tx.name,
              sector: tx.sector,
              marketCap: tx.marketCap,
              buyDate: weightedBuyDate,
              sellDate: tx.date,
              quantity: tx.quantity,
              avgBuyPrice,
              sellPrice: tx.price,
              charges: tx.charges || 0,
              realizedGain,
              returnPercentage,
              holdingDays,
              notes: tx.notes,
            };
            exitedTradesForPort.push(exitedTrade);
            advisorExitedTrades.push(exitedTrade);
            allExitedTrades.push(exitedTrade);
          }
        }
      });

      // Active holdings for this portfolio
      const portHoldings: AdvisorHolding[] = [];
      stockLots.forEach((entry, symbol) => {
        const remainingQty = entry.lots.reduce((sum, l) => sum + l.quantity, 0);
        if (remainingQty > 0) {
          const totalInvested = entry.lots.reduce((sum, l) => sum + l.quantity * l.price + l.charges, 0);
          const avgBuyPrice = totalInvested / remainingQty;
          const quote = safeQuotes[symbol] || {
            currentPrice: avgBuyPrice,
            dayChange: 0,
            dayChangePercent: 0,
          };

          const currentPrice = quote.currentPrice;
          const currentValue = remainingQty * currentPrice;
          const unrealizedGain = currentValue - totalInvested;
          const unrealizedReturnPercent = totalInvested > 0 ? (unrealizedGain / totalInvested) * 100 : 0;

          const holding: AdvisorHolding = {
            symbol,
            name: entry.name,
            sector: entry.sector,
            marketCap: entry.marketCap,
            quantity: remainingQty,
            avgBuyPrice,
            investedAmount: totalInvested,
            currentPrice,
            currentValue,
            unrealizedGain,
            unrealizedReturnPercent,
            dayChangeAmount: (quote.dayChange || 0) * remainingQty,
            dayChangePercent: quote.dayChangePercent || 0,
            weightWithinAdvisor: 0,
            weightInTotalPortfolio: 0,
            portfolioId: portfolio.id,
            portfolioName: portfolio.name,
          };

          portHoldings.push(holding);
          advisorActiveHoldings.push(holding);
        }
      });

      // Dividends for this portfolio
      const portDividends = safeDividends.filter((d) => {
        const matchedPortId = d.portfolioId || defaultPortfolioId;
        if (d.advisorId !== advisor.id || matchedPortId !== portfolio.id) return false;
        if (filterStart && d.creditDate < filterStart) return false;
        if (filterEnd && d.creditDate > filterEnd) return false;
        return true;
      });

      const totalDividends = portDividends.reduce((sum, d) => sum + d.totalAmount, 0);
      const totalInvestedActive = portHoldings.reduce((sum, h) => sum + h.investedAmount, 0);
      const totalCurrentValue = portHoldings.reduce((sum, h) => sum + h.currentValue, 0);
      const unrealizedPnL = totalCurrentValue - totalInvestedActive;
      const unrealizedReturnPct = totalInvestedActive > 0 ? (unrealizedPnL / totalInvestedActive) * 100 : 0;

      const realizedPnL = exitedTradesForPort.reduce((sum, e) => sum + e.realizedGain, 0);
      const profitableTradesCount = exitedTradesForPort.filter((e) => e.realizedGain > 0).length;
      const lossTradesCount = exitedTradesForPort.filter((e) => e.realizedGain <= 0).length;
      const winRate = exitedTradesForPort.length > 0 ? (profitableTradesCount / exitedTradesForPort.length) * 100 : 0;

      const totalNetGain = unrealizedPnL + realizedPnL + totalDividends;
      const netReturnPct = totalInvestedActive > 0 ? (totalNetGain / totalInvestedActive) * 100 : 0;

      // XIRR for this portfolio
      const portCashFlows: { date: Date; amount: number }[] = [];
      portTx.forEach((tx) => {
        if (filterEnd && tx.date > filterEnd) return;
        if (filterStart && tx.date < filterStart) return;

        if (tx.type === 'BUY') {
          portCashFlows.push({ date: new Date(tx.date), amount: -(tx.quantity * tx.price + (tx.charges || 0)) });
        } else if (tx.type === 'SELL') {
          portCashFlows.push({ date: new Date(tx.date), amount: tx.quantity * tx.price - (tx.charges || 0) });
        }
      });
      portDividends.forEach((div) => {
        portCashFlows.push({ date: new Date(div.creditDate), amount: div.totalAmount });
      });
      if (totalCurrentValue > 0) {
        portCashFlows.push({ date: new Date(), amount: totalCurrentValue });
      }

      const xirrEstimate = calculateXIRR(portCashFlows);

      return {
        portfolio,
        advisor,
        activeHoldings: portHoldings,
        exitedTrades: exitedTradesForPort,
        dividends: portDividends,
        totalInvestedActive,
        totalCurrentValue,
        unrealizedPnL,
        unrealizedReturnPct,
        realizedPnL,
        realizedTradesCount: exitedTradesForPort.length,
        profitableTradesCount,
        lossTradesCount,
        winRate,
        totalDividends,
        totalNetGain,
        netReturnPct,
        xirrEstimate,
        weightWithinAdvisor: 0,
        weightInTotalPortfolio: 0,
      };
    });

    // Advisor-level aggregated metrics
    const advDividends = safeDividends.filter((d) => {
      if (d.advisorId !== advisor.id) return false;
      if (filterStart && d.creditDate < filterStart) return false;
      if (filterEnd && d.creditDate > filterEnd) return false;
      return true;
    });

    const totalDividends = advDividends.reduce((sum, d) => sum + d.totalAmount, 0);
    const totalInvestedActive = advisorActiveHoldings.reduce((sum, h) => sum + h.investedAmount, 0);
    const totalCurrentValue = advisorActiveHoldings.reduce((sum, h) => sum + h.currentValue, 0);
    const unrealizedPnL = totalCurrentValue - totalInvestedActive;
    const unrealizedReturnPct = totalInvestedActive > 0 ? (unrealizedPnL / totalInvestedActive) * 100 : 0;

    const realizedPnL = advisorExitedTrades.reduce((sum, e) => sum + e.realizedGain, 0);
    const profitableTradesCount = advisorExitedTrades.filter((e) => e.realizedGain > 0).length;
    const lossTradesCount = advisorExitedTrades.filter((e) => e.realizedGain <= 0).length;
    const winRate =
      advisorExitedTrades.length > 0 ? (profitableTradesCount / advisorExitedTrades.length) * 100 : 0;

    const totalNetGain = unrealizedPnL + realizedPnL + totalDividends;
    const netReturnPct = totalInvestedActive > 0 ? (totalNetGain / totalInvestedActive) * 100 : 0;
    const dividendYieldOnInvested = totalInvestedActive > 0 ? (totalDividends / totalInvestedActive) * 100 : 0;

    // Calculate XIRR cashflows for advisor
    const cashFlows: { date: Date; amount: number }[] = [];
    advTx.forEach((tx) => {
      if (filterEnd && tx.date > filterEnd) return;
      if (filterStart && tx.date < filterStart) return;

      if (tx.type === 'BUY') {
        cashFlows.push({ date: new Date(tx.date), amount: -(tx.quantity * tx.price + (tx.charges || 0)) });
      } else if (tx.type === 'SELL') {
        cashFlows.push({ date: new Date(tx.date), amount: tx.quantity * tx.price - (tx.charges || 0) });
      }
    });
    advDividends.forEach((div) => {
      cashFlows.push({ date: new Date(div.creditDate), amount: div.totalAmount });
    });
    if (totalCurrentValue > 0) {
      cashFlows.push({ date: new Date(), amount: totalCurrentValue });
    }

    const xirrEstimate = calculateXIRR(cashFlows);

    // Calculate weights within advisor
    advisorActiveHoldings.forEach((h) => {
      h.weightWithinAdvisor = totalInvestedActive > 0 ? (h.investedAmount / totalInvestedActive) * 100 : 0;
    });

    portfolioPerformances.forEach((pp) => {
      pp.weightWithinAdvisor = totalInvestedActive > 0 ? (pp.totalInvestedActive / totalInvestedActive) * 100 : 0;
      pp.activeHoldings.forEach((h) => {
        h.weightWithinAdvisor = pp.totalInvestedActive > 0 ? (h.investedAmount / pp.totalInvestedActive) * 100 : 0;
      });
    });

    // Sector & Market cap distribution
    const sectorMap = new Map<string, number>();
    const mcapMap = new Map<MarketCapCategory, number>();

    advisorActiveHoldings.forEach((h) => {
      sectorMap.set(h.sector, (sectorMap.get(h.sector) || 0) + h.investedAmount);
      mcapMap.set(h.marketCap, (mcapMap.get(h.marketCap) || 0) + h.investedAmount);
    });

    const sectorDistribution = Array.from(sectorMap.entries())
      .map(([sector, amount]) => ({
        sector,
        amount,
        percentage: totalInvestedActive > 0 ? (amount / totalInvestedActive) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const marketCapDistribution = Array.from(mcapMap.entries())
      .map(([mcap, amount]) => ({
        mcap,
        amount,
        percentage: totalInvestedActive > 0 ? (amount / totalInvestedActive) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    advisorPerformanceMap.set(advisor.id, {
      advisor,
      portfolios: advPortfolios,
      portfolioPerformances,
      activeHoldings: advisorActiveHoldings,
      exitedTrades: advisorExitedTrades,
      dividends: advDividends,
      totalInvestedActive,
      totalCurrentValue,
      unrealizedPnL,
      unrealizedReturnPct,
      realizedPnL,
      realizedTradesCount: advisorExitedTrades.length,
      profitableTradesCount,
      lossTradesCount,
      winRate,
      totalDividends,
      dividendYieldOnInvested,
      totalNetGain,
      netReturnPct,
      xirrEstimate,
      portfolioSharePct: 0,
      currentValueSharePct: 0,
      sectorDistribution,
      marketCapDistribution,
    });
  });

  // Calculate Grand Totals across all advisors
  const advisorPerformances = Array.from(advisorPerformanceMap.values());
  const grandTotalInvested = advisorPerformances.reduce((sum, a) => sum + a.totalInvestedActive, 0);
  const grandTotalCurrentValue = advisorPerformances.reduce((sum, a) => sum + a.totalCurrentValue, 0);
  const grandTotalUnrealizedPnL = grandTotalCurrentValue - grandTotalInvested;
  const grandTotalRealizedPnL = advisorPerformances.reduce((sum, a) => sum + a.realizedPnL, 0);
  const grandTotalDividends = advisorPerformances.reduce((sum, a) => sum + a.totalDividends, 0);
  const grandTotalNetGain = grandTotalUnrealizedPnL + grandTotalRealizedPnL + grandTotalDividends;
  const grandTotalNetReturnPct = grandTotalInvested > 0 ? (grandTotalNetGain / grandTotalInvested) * 100 : 0;

  // Set portfolio shares and weights
  advisorPerformances.forEach((adv) => {
    adv.portfolioSharePct = grandTotalInvested > 0 ? (adv.totalInvestedActive / grandTotalInvested) * 100 : 0;
    adv.currentValueSharePct = grandTotalCurrentValue > 0 ? (adv.totalCurrentValue / grandTotalCurrentValue) * 100 : 0;
    adv.activeHoldings.forEach((h) => {
      h.weightInTotalPortfolio = grandTotalInvested > 0 ? (h.investedAmount / grandTotalInvested) * 100 : 0;
    });
    adv.portfolioPerformances.forEach((pp) => {
      pp.weightInTotalPortfolio = grandTotalInvested > 0 ? (pp.totalInvestedActive / grandTotalInvested) * 100 : 0;
      pp.activeHoldings.forEach((h) => {
        h.weightInTotalPortfolio = grandTotalInvested > 0 ? (h.investedAmount / grandTotalInvested) * 100 : 0;
      });
    });
  });

  // Overall Portfolio XIRR
  const totalCashFlows: { date: Date; amount: number }[] = [];
  sortedTx.forEach((tx) => {
    if (filterEnd && tx.date > filterEnd) return;
    if (filterStart && tx.date < filterStart) return;

    if (tx.type === 'BUY') {
      totalCashFlows.push({ date: new Date(tx.date), amount: -(tx.quantity * tx.price + (tx.charges || 0)) });
    } else if (tx.type === 'SELL') {
      totalCashFlows.push({ date: new Date(tx.date), amount: tx.quantity * tx.price - (tx.charges || 0) });
    }
  });
  dividends.forEach((div) => {
    if (filterStart && div.creditDate < filterStart) return;
    if (filterEnd && div.creditDate > filterEnd) return;
    totalCashFlows.push({ date: new Date(div.creditDate), amount: div.totalAmount });
  });
  if (grandTotalCurrentValue > 0) {
    totalCashFlows.push({ date: new Date(), amount: grandTotalCurrentValue });
  }

  const overallXIRR = calculateXIRR(totalCashFlows);

  // Step 2: Consolidated Kite Demat Holdings & Overlap Matrix
  const consolidatedMap = new Map<string, ConsolidatedDematStock>();

  advisorPerformances.forEach((advPerf) => {
    advPerf.activeHoldings.forEach((holding) => {
      if (!consolidatedMap.has(holding.symbol)) {
        consolidatedMap.set(holding.symbol, {
          symbol: holding.symbol,
          name: holding.name,
          sector: holding.sector,
          marketCap: holding.marketCap,
          currentPrice: holding.currentPrice,
          totalQuantity: 0,
          blendedAvgPrice: 0,
          totalInvested: 0,
          totalCurrentValue: 0,
          totalUnrealizedPnL: 0,
          unrealizedReturnPct: 0,
          dayChangePercent: holding.dayChangePercent,
          isMultiAdvisor: false,
          advisorBuckets: [],
        });
      }

      const stock = consolidatedMap.get(holding.symbol)!;
      stock.totalQuantity += holding.quantity;
      stock.totalInvested += holding.investedAmount;
      stock.totalCurrentValue += holding.currentValue;

      stock.advisorBuckets.push({
        advisorId: advPerf.advisor.id,
        advisorName: advPerf.advisor.name,
        advisorColor: advPerf.advisor.color,
        portfolioId: holding.portfolioId,
        portfolioName: holding.portfolioName,
        quantity: holding.quantity,
        avgPrice: holding.avgBuyPrice,
        investedAmount: holding.investedAmount,
        currentValue: holding.currentValue,
        unrealizedPnL: holding.unrealizedGain,
        unrealizedReturnPct: holding.unrealizedReturnPercent,
        weightInStock: 0,
      });
    });
  });

  const consolidatedHoldings = Array.from(consolidatedMap.values()).map((stock) => {
    stock.blendedAvgPrice = stock.totalQuantity > 0 ? stock.totalInvested / stock.totalQuantity : 0;
    stock.totalUnrealizedPnL = stock.totalCurrentValue - stock.totalInvested;
    stock.unrealizedReturnPct = stock.totalInvested > 0 ? (stock.totalUnrealizedPnL / stock.totalInvested) * 100 : 0;
    stock.isMultiAdvisor = stock.advisorBuckets.length > 1;

    stock.advisorBuckets.forEach((bucket) => {
      bucket.weightInStock = stock.totalQuantity > 0 ? (bucket.quantity / stock.totalQuantity) * 100 : 0;
    });

    return stock;
  });

  consolidatedHoldings.sort((a, b) => b.totalCurrentValue - a.totalCurrentValue);

  // Identify stock overlaps
  const stockOverlaps = consolidatedHoldings
    .filter((s) => s.isMultiAdvisor)
    .map((s) => ({
      symbol: s.symbol,
      name: s.name,
      advisorCount: s.advisorBuckets.length,
      advisors: s.advisorBuckets.map((b) => b.advisorName),
    }));

  return {
    advisorPerformances,
    consolidatedHoldings,
    allExitedTrades: allExitedTrades.sort((a, b) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime()),
    grandTotalInvested,
    grandTotalCurrentValue,
    grandTotalUnrealizedPnL,
    grandTotalRealizedPnL,
    grandTotalDividends,
    grandTotalNetGain,
    grandTotalNetReturnPct,
    overallXIRR,
    stockOverlaps,
  };
}

