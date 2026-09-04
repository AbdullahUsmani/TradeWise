import Papa from 'papaparse';
import { Advisor, AdvisorPortfolio, Transaction, AdvisorHolding } from '../types/portfolio';

/**
 * Trigger a browser download with a given blob
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format category label nicely
 */
function getAdvisorTypeLabel(type: string): string {
  switch (type) {
    case 'SEBI_RIA':
      return 'SEBI Registered RIA / RA';
    case 'SMALLCASE':
      return 'Smallcase Manager';
    case 'TRADING_AGENT':
      return 'Active Trading Agent';
    case 'SELF':
      return 'Self-Directed Strategy';
    default:
      return type || 'Other Advisory';
  }
}

/**
 * Format portfolio strategy label nicely
 */
function getPortfolioTypeLabel(type: string): string {
  switch (type) {
    case 'CORE_LONG_TERM':
      return 'Core Long-Term';
    case 'SWING_MOMENTUM':
      return 'Swing & Momentum';
    case 'SMALLCAP_GROWTH':
      return 'Smallcap & Emerging';
    case 'DIVIDEND_YIELD':
      return 'Dividend Yield';
    case 'THEMATIC':
      return 'Thematic / Sectoral';
    case 'HIGH_BETA':
      return 'High Beta / Alpha';
    case 'BALANCED':
      return 'Balanced / Hybrid';
    case 'CUSTOM':
      return 'Custom Strategy';
    default:
      return type || 'Custom Strategy';
  }
}

/**
 * Export all registered Advisors as a clean CSV file
 */
export function exportAdvisorsCSV(
  advisors: Advisor[],
  portfolios: AdvisorPortfolio[] = [],
  transactions: Transaction[] = []
): void {
  const today = new Date().toISOString().split('T')[0];

  const rows = advisors.map((adv) => {
    const advPorts = portfolios.filter((p) => p.advisorId === adv.id);
    const advTxs = transactions.filter((t) => t.advisorId === adv.id);
    const portNames = advPorts.map((p) => p.name).join('; ');

    return {
      'Advisor ID': adv.id,
      'Advisor Name': adv.name,
      'Category': getAdvisorTypeLabel(adv.type),
      'Raw Type': adv.type,
      'SEBI Reg No': adv.sebiRegNo || '',
      'Style / Mandate': adv.strategyStyle || '',
      'Fee Structure': adv.feeStructure || '',
      'Total Portfolios': advPorts.length,
      'Portfolios List': portNames,
      'Total Trades Executed': advTxs.length,
      'Description': adv.description || '',
      'Color Code': adv.color || '',
      'Created At': adv.createdAt || '',
    };
  });

  const csv = Papa.unparse(rows, {
    header: true,
    quotes: true,
  });

  downloadFile(csv, `tradewise-advisors-${today}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Export all Strategy Portfolios as a clean CSV file
 */
export function exportPortfoliosCSV(
  portfolios: AdvisorPortfolio[],
  advisors: Advisor[] = [],
  transactions: Transaction[] = []
): void {
  const today = new Date().toISOString().split('T')[0];

  const rows = portfolios.map((port) => {
    const parentAdvisor = advisors.find((a) => a.id === port.advisorId);
    const portTxs = transactions.filter((t) => t.portfolioId === port.id);

    return {
      'Portfolio ID': port.id,
      'Advisor ID': port.advisorId,
      'Advisor Name': parentAdvisor?.name || 'Unassigned',
      'Advisor Type': parentAdvisor ? getAdvisorTypeLabel(parentAdvisor.type) : '',
      'Portfolio Name': port.name,
      'Status': port.status || 'ACTIVE',
      'Activation Date': port.activationDate || port.createdAt || '',
      'Deactivation Date': port.deactivationDate || '',
      'Strategy Classification': getPortfolioTypeLabel(port.type),
      'Raw Strategy Type': port.type,
      'Target Allocation (%)': port.targetAllocationPct ?? '',
      'Tagged Trades Count': portTxs.length,
      'Description / Mandate Notes': port.description || '',
      'Color Code': port.color || parentAdvisor?.color || '',
      'Created At': port.createdAt || '',
    };
  });

  const csv = Papa.unparse(rows, {
    header: true,
    quotes: true,
  });

  downloadFile(csv, `tradewise-portfolios-${today}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Export Advisors and Strategy Portfolios combined into a structured JSON file
 */
export function exportAdvisorsAndPortfoliosJSON(
  advisors: Advisor[],
  portfolios: AdvisorPortfolio[]
): void {
  const today = new Date().toISOString().split('T')[0];

  const exportPayload = {
    app: 'TradeWise Portfolio Tracker',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    summary: {
      totalAdvisors: advisors.length,
      totalPortfolios: portfolios.length,
    },
    advisors: advisors.map((adv) => ({
      ...adv,
      portfoliosCount: portfolios.filter((p) => p.advisorId === adv.id).length,
    })),
    portfolios: portfolios.map((p) => {
      const adv = advisors.find((a) => a.id === p.advisorId);
      return {
        ...p,
        advisorName: adv?.name || 'Unassigned',
      };
    }),
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  downloadFile(jsonStr, `tradewise-advisors-and-portfolios-${today}.json`, 'application/json;charset=utf-8;');
}

/**
 * Export comprehensive single Advisor report (Advisors, its Portfolios, active Holdings, and Exits)
 */
export function exportSingleAdvisorReport(
  advisor: Advisor,
  portfolios: AdvisorPortfolio[],
  holdings: AdvisorHolding[] = [],
  transactions: Transaction[] = []
): void {
  const today = new Date().toISOString().split('T')[0];
  const safeName = advisor.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

  const advPorts = portfolios.filter((p) => p.advisorId === advisor.id);
  const advTxs = transactions.filter((t) => t.advisorId === advisor.id);

  // Compile detailed CSV of Holdings & Portfolio mapping
  const rows = holdings.map((h) => {
    const port = advPorts.find((p) => p.id === h.portfolioId);
    return {
      'Advisor': advisor.name,
      'Portfolio': port?.name || h.portfolioName || 'General Portfolio',
      'Symbol': h.symbol,
      'Name': h.name,
      'Sector': h.sector,
      'Market Cap': h.marketCap,
      'Quantity': h.quantity,
      'Avg Buy Price': h.avgBuyPrice,
      'Invested Amount': h.investedAmount,
      'Current Price': h.currentPrice,
      'Current Value': h.currentValue,
      'Unrealized P&L': h.unrealizedGain,
      'Return (%)': Number(h.unrealizedReturnPercent.toFixed(2)),
      'Advisor Weight (%)': Number(h.weightWithinAdvisor.toFixed(2)),
    };
  });

  const csv = Papa.unparse(rows, {
    header: true,
    quotes: true,
  });

  downloadFile(csv, `tradewise-advisor-${safeName}-holdings-${today}.csv`, 'text/csv;charset=utf-8;');
}
