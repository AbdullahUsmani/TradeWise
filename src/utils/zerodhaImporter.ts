import Papa from 'papaparse';
import { Advisor, AdvisorPortfolio, MarketCapCategory, Transaction, StockQuote } from '../types/portfolio';

// Common stock name & sector lookup helper for Indian equities
export const KNOWN_INDIAN_STOCKS: Record<string, { name: string; sector: string; marketCap: MarketCapCategory }> = {
  RELIANCE: { name: 'Reliance Industries Ltd', sector: 'Oil, Gas & Retail', marketCap: 'LARGE' },
  TCS: { name: 'Tata Consultancy Services', sector: 'IT & Software', marketCap: 'LARGE' },
  HDFCBANK: { name: 'HDFC Bank Ltd', sector: 'Financial Services', marketCap: 'LARGE' },
  ICICIBANK: { name: 'ICICI Bank Ltd', sector: 'Financial Services', marketCap: 'LARGE' },
  INFY: { name: 'Infosys Ltd', sector: 'IT & Software', marketCap: 'LARGE' },
  TATAMOTORS: { name: 'Tata Motors Ltd', sector: 'Automobile', marketCap: 'LARGE' },
  TATASTEEL: { name: 'Tata Steel Ltd', sector: 'Metals & Mining', marketCap: 'LARGE' },
  ITC: { name: 'ITC Ltd', sector: 'FMCG', marketCap: 'LARGE' },
  LT: { name: 'Larsen & Toubro Ltd', sector: 'Capital Goods & Infra', marketCap: 'LARGE' },
  SBIN: { name: 'State Bank of India', sector: 'Financial Services', marketCap: 'LARGE' },
  BHARTIARTL: { name: 'Bharti Airtel Ltd', sector: 'Telecommunication', marketCap: 'LARGE' },
  KOTAKBANK: { name: 'Kotak Mahindra Bank', sector: 'Financial Services', marketCap: 'LARGE' },
  BAJFINANCE: { name: 'Bajaj Finance Ltd', sector: 'Financial Services', marketCap: 'LARGE' },
  ASIANPAINT: { name: 'Asian Paints Ltd', sector: 'Consumer Discretionary', marketCap: 'LARGE' },
  HINDUNILVR: { name: 'Hindustan Unilever Ltd', sector: 'FMCG', marketCap: 'LARGE' },
  MARUTI: { name: 'Maruti Suzuki India', sector: 'Automobile', marketCap: 'LARGE' },
  TITAN: { name: 'Titan Company Ltd', sector: 'Consumer Discretionary', marketCap: 'LARGE' },
  SUNPHARMA: { name: 'Sun Pharmaceutical Ltd', sector: 'Healthcare & Pharma', marketCap: 'LARGE' },
  AXISBANK: { name: 'Axis Bank Ltd', sector: 'Financial Services', marketCap: 'LARGE' },
  NTPC: { name: 'NTPC Ltd', sector: 'Power & Energy', marketCap: 'LARGE' },
  ONGC: { name: 'Oil & Natural Gas Corp', sector: 'Power & Energy', marketCap: 'LARGE' },
  POWERGRID: { name: 'Power Grid Corp', sector: 'Power & Energy', marketCap: 'LARGE' },
  COALINDIA: { name: 'Coal India Ltd', sector: 'Metals & Mining', marketCap: 'LARGE' },
  ADANIENT: { name: 'Adani Enterprises Ltd', sector: 'Diversified', marketCap: 'LARGE' },
  ADANIPORTS: { name: 'Adani Ports & SEZ', sector: 'Infrastructure & Logistics', marketCap: 'LARGE' },
  ZOMATO: { name: 'Zomato Ltd', sector: 'New Age Tech / Platform', marketCap: 'LARGE' },
  JIOFIN: { name: 'Jio Financial Services Ltd', sector: 'Financial Services', marketCap: 'LARGE' },
  TRENT: { name: 'Trent Ltd', sector: 'Consumer Retail', marketCap: 'LARGE' },
  BEL: { name: 'Bharat Electronics Ltd', sector: 'Defence & Capital Goods', marketCap: 'LARGE' },
  HAL: { name: 'Hindustan Aeronautics Ltd', sector: 'Defence & Capital Goods', marketCap: 'LARGE' },
  POLYCAB: { name: 'Polycab India Ltd', sector: 'Consumer Electricals', marketCap: 'MID' },
  DEEPAKNTR: { name: 'Deepak Nitrite Ltd', sector: 'Specialty Chemicals', marketCap: 'MID' },
  TATACOMM: { name: 'Tata Communications Ltd', sector: 'Telecommunication', marketCap: 'MID' },
  PERSISTENT: { name: 'Persistent Systems Ltd', sector: 'IT & Software', marketCap: 'MID' },
  KPITTECH: { name: 'KPIT Technologies Ltd', sector: 'IT & Software', marketCap: 'MID' },
  COFORGE: { name: 'Coforge Ltd', sector: 'IT & Software', marketCap: 'MID' },
  DIXON: { name: 'Dixon Technologies Ltd', sector: 'EMS & Electronics', marketCap: 'MID' },
  KAYNES: { name: 'Kaynes Technology India', sector: 'EMS & Electronics', marketCap: 'MID' },
  ASTRAL: { name: 'Astral Ltd', sector: 'Building Materials', marketCap: 'MID' },
  PIIND: { name: 'PI Industries Ltd', sector: 'Agrochemicals', marketCap: 'MID' },
  SUZLON: { name: 'Suzlon Energy Ltd', sector: 'Renewable Energy', marketCap: 'MID' },
  CDSL: { name: 'Central Depository Services', sector: 'Capital Markets', marketCap: 'MID' },
  BSE: { name: 'BSE Ltd', sector: 'Capital Markets', marketCap: 'MID' },
  KFINTECH: { name: 'KFin Technologies Ltd', sector: 'Capital Markets', marketCap: 'SMALL' },
  CAMS: { name: 'Computer Age Mgmt Services', sector: 'Capital Markets', marketCap: 'MID' },
  IREDA: { name: 'Indian Renewable Energy', sector: 'Financial Services', marketCap: 'MID' },
  HUDCO: { name: 'Housing & Urban Dev Corp', sector: 'Financial Services', marketCap: 'MID' },
  ANGELONE: { name: 'Angel One Ltd', sector: 'Financial Services', marketCap: 'SMALL' },
  MAPMYINDIA: { name: 'CE Info Systems (MapmyIndia)', sector: 'New Age Tech / SaaS', marketCap: 'SMALL' },
  EASEMYTRIP: { name: 'Easy Trip Planners Ltd', sector: 'Travel Tech', marketCap: 'SMALL' },
  IDEA: { name: 'Vodafone Idea Ltd', sector: 'Telecommunication', marketCap: 'MID' },
  YESBANK: { name: 'Yes Bank Ltd', sector: 'Financial Services', marketCap: 'MID' },
  IDFCFIRSTB: { name: 'IDFC FIRST Bank Ltd', sector: 'Financial Services', marketCap: 'MID' },
};

export interface ZerodhaImportResult {
  sourceType: 'HOLDINGS' | 'TRADEBOOK' | 'GENERIC_CSV';
  transactions: Transaction[];
  quotesToUpdate: Record<string, Partial<StockQuote>>;
  parsedCount: number;
  warnings: string[];
}

/**
 * Parses Zerodha Holdings CSV export (from Kite Console -> Portfolio -> Holdings -> Download CSV)
 * Typical Headers:
 * "Instrument", "Qty.", "Avg. cost", "LTP", "Cur. val", "P&L", "Net chg.", "Day chg."
 * or
 * "Symbol", "ISIN", "Quantity", "Average Price", "Previous Close", "LTP", "Current Value", "P&L"
 */
export function parseZerodhaHoldings(
  rows: Record<string, any>[],
  advisorId: string,
  tradeTag = 'Zerodha Holdings Import'
): ZerodhaImportResult {
  const transactions: Transaction[] = [];
  const quotesToUpdate: Record<string, Partial<StockQuote>> = {};
  const warnings: string[] = [];
  const today = new Date().toISOString().split('T')[0];

  rows.forEach((row, idx) => {
    // Normalise column keys (lowercase without special chars)
    const norm: Record<string, any> = {};
    Object.keys(row).forEach((k) => {
      const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      norm[cleanKey] = row[k];
    });

    // Determine symbol
    const rawSymbol = norm['instrument'] || norm['symbol'] || norm['tradingsymbol'] || norm['stock'] || '';
    if (!rawSymbol || typeof rawSymbol !== 'string') return;

    // Clean NSE/BSE prefixes if any, e.g. "NSE:RELIANCE" or "RELIANCE"
    const symbol = rawSymbol.replace(/^(NSE:|BSE:|EQ:)/i, '').trim().toUpperCase();
    if (!symbol || symbol === 'TOTAL') return;

    // Parse numeric fields
    const quantityStr = norm['qty'] || norm['quantity'] || norm['totalqty'] || '0';
    const avgCostStr = norm['avgcost'] || norm['avgprice'] || norm['averageprice'] || norm['buyavg'] || '0';
    const ltpStr = norm['ltp'] || norm['curprice'] || norm['lastprice'] || '0';
    const dayChgStr = norm['daychg'] || norm['daychange'] || norm['daypnl'] || '0';

    const quantity = parseFloat(String(quantityStr).replace(/,/g, ''));
    const avgPrice = parseFloat(String(avgCostStr).replace(/,/g, ''));
    const ltp = parseFloat(String(ltpStr).replace(/,/g, ''));
    const dayChg = parseFloat(String(dayChgStr).replace(/,/g, ''));

    if (isNaN(quantity) || quantity <= 0) {
      warnings.push(`Row ${idx + 1}: Skipped ${symbol} due to zero or invalid quantity.`);
      return;
    }

    const knownMeta = KNOWN_INDIAN_STOCKS[symbol] || {
      name: symbol,
      sector: 'Diversified',
      marketCap: 'MID' as MarketCapCategory,
    };

    // Synthesize buy transaction for active holding
    const tx: Transaction = {
      id: `tx-zdh-hold-${Date.now()}-${idx}-${symbol}`,
      advisorId: advisorId,
      symbol: symbol,
      name: knownMeta.name,
      sector: knownMeta.sector,
      marketCap: knownMeta.marketCap,
      type: 'BUY',
      date: today,
      quantity: quantity,
      price: avgPrice > 0 ? avgPrice : (ltp > 0 ? ltp : 100),
      charges: Math.max(20, Math.round(quantity * (avgPrice || 100) * 0.001)),
      notes: `Imported from Zerodha Holdings (LTP: ₹${ltp || avgPrice})`,
      tradeTag: tradeTag,
    };

    transactions.push(tx);

    if (ltp > 0) {
      quotesToUpdate[symbol] = {
        symbol,
        name: knownMeta.name,
        sector: knownMeta.sector,
        marketCap: knownMeta.marketCap,
        currentPrice: ltp,
        dayChange: isNaN(dayChg) ? 0 : dayChg,
        dayChangePercent: isNaN(dayChg) || ltp === 0 ? 0 : Number(((dayChg / (ltp - dayChg)) * 100).toFixed(2)),
      };
    }
  });

  return {
    sourceType: 'HOLDINGS',
    transactions,
    quotesToUpdate,
    parsedCount: transactions.length,
    warnings,
  };
}

/**
 * Parses Zerodha Tradebook CSV export (from Kite Console -> Reports -> Tradebook -> Download CSV)
 * Required columns per trade row:
 * "trade_date", "symbol", "trade_type" (BUY/SELL), "quantity", "price"
 * With row-level attribution columns:
 * "advisor_id" (or "Advisor Id", "Advisor") and "portfolio_id" (or "Portfolio Id", "Portfolio")
 */
export function parseZerodhaTradebook(
  rows: Record<string, any>[],
  defaultAdvisorId: string,
  defaultTag = 'Zerodha Tradebook',
  availableAdvisors: Advisor[] = [],
  availablePortfolios: AdvisorPortfolio[] = []
): ZerodhaImportResult {
  const transactions: Transaction[] = [];
  const quotesToUpdate: Record<string, Partial<StockQuote>> = {};
  const warnings: string[] = [];

  rows.forEach((row, idx) => {
    const norm: Record<string, any> = {};
    Object.keys(row).forEach((k) => {
      const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      norm[cleanKey] = row[k];
    });

    const rawSymbol = norm['symbol'] || norm['tradingsymbol'] || norm['instrument'] || '';
    if (!rawSymbol || typeof rawSymbol !== 'string') return;
    const symbol = rawSymbol.replace(/^(NSE:|BSE:|EQ:)/i, '').trim().toUpperCase();
    if (!symbol || symbol === 'TOTAL') return;

    // Trade Type: BUY or SELL
    const rawType = String(norm['tradetype'] || norm['type'] || norm['action'] || 'BUY').toUpperCase();
    const type = rawType.includes('SELL') || rawType === 'S' ? 'SELL' : 'BUY';

    // Date parsing: e.g. "2024-05-12", "12-05-2024", "12/05/2024", "2024-05-12 10:24:00"
    let rawDate = String(norm['tradedate'] || norm['date'] || norm['orderexecutiontime'] || new Date().toISOString().split('T')[0]);
    if (rawDate.includes(' ')) {
      rawDate = rawDate.split(' ')[0];
    }
    let formattedDate = rawDate;
    if (rawDate.includes('/')) {
      const parts = rawDate.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          formattedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else {
          formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    } else if (rawDate.includes('-')) {
      const parts = rawDate.split('-');
      if (parts.length === 3 && parts[0].length <= 2) {
        // DD-MM-YYYY
        formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    const quantityStr = norm['quantity'] || norm['qty'] || norm['shares'] || '0';
    const priceStr = norm['price'] || norm['tradeprice'] || norm['rate'] || '0';

    const quantity = parseFloat(String(quantityStr).replace(/,/g, ''));
    const price = parseFloat(String(priceStr).replace(/,/g, ''));

    if (isNaN(quantity) || quantity <= 0) {
      warnings.push(`Row ${idx + 1}: Skipped ${symbol} due to zero or invalid trade quantity.`);
      return;
    }

    // Row-level Advisor ID attribution
    const rawAdvisor = String(
      norm['advisorid'] || norm['advisor'] || norm['advisorname'] || ''
    ).trim();

    let resolvedAdvisorId = defaultAdvisorId;
    if (rawAdvisor) {
      // Check if matches an existing advisor by ID or name
      const matchedAdvisor = availableAdvisors.find(
        (a) => a.id.toLowerCase() === rawAdvisor.toLowerCase() || a.name.toLowerCase() === rawAdvisor.toLowerCase()
      );
      if (matchedAdvisor) {
        resolvedAdvisorId = matchedAdvisor.id;
      } else {
        // Use the raw advisor identifier directly
        resolvedAdvisorId = rawAdvisor;
      }
    }

    // Row-level Portfolio ID attribution
    const rawPortfolio = String(
      norm['portfolioid'] || norm['portfolio'] || norm['portfolioname'] || ''
    ).trim();

    let resolvedPortfolioId: string | undefined = undefined;
    if (rawPortfolio) {
      // Check if matches an existing portfolio by ID or name
      const matchedPortfolio = availablePortfolios.find(
        (p) =>
          (p.advisorId === resolvedAdvisorId || !p.advisorId) &&
          (p.id.toLowerCase() === rawPortfolio.toLowerCase() || p.name.toLowerCase() === rawPortfolio.toLowerCase())
      );
      if (matchedPortfolio) {
        resolvedPortfolioId = matchedPortfolio.id;
      } else {
        resolvedPortfolioId = rawPortfolio;
      }
    }

    const knownMeta = KNOWN_INDIAN_STOCKS[symbol] || {
      name: symbol,
      sector: 'Diversified',
      marketCap: 'MID' as MarketCapCategory,
    };

    const tradeId = norm['tradeid'] || norm['orderid'] || `trade-${idx}`;

    const tx: Transaction = {
      id: `tx-zdh-tb-${tradeId}-${Date.now()}-${idx}`,
      advisorId: resolvedAdvisorId,
      portfolioId: resolvedPortfolioId,
      symbol: symbol,
      name: knownMeta.name,
      sector: knownMeta.sector,
      marketCap: knownMeta.marketCap,
      type: type,
      date: formattedDate,
      quantity: quantity,
      price: price > 0 ? price : 100,
      charges: Math.max(15, Math.round(quantity * (price || 100) * 0.0012)),
      notes: `Trade ID: ${tradeId}${resolvedPortfolioId ? ` | Portfolio: ${resolvedPortfolioId}` : ''}`,
      tradeTag: defaultTag,
    };

    transactions.push(tx);

    if (price > 0) {
      quotesToUpdate[symbol] = {
        symbol,
        name: knownMeta.name,
        sector: knownMeta.sector,
        marketCap: knownMeta.marketCap,
        currentPrice: price,
      };
    }
  });

  return {
    sourceType: 'TRADEBOOK',
    transactions,
    quotesToUpdate,
    parsedCount: transactions.length,
    warnings,
  };
}

/**
 * Universal CSV File parsing router strictly enforcing Tradebook imports.
 * Holdings imports are rejected with an informative error explaining why trades must come from Tradebook.
 */
export function parseCSVFile(
  fileContent: string,
  defaultAdvisorId: string,
  availableAdvisors: Advisor[] = [],
  availablePortfolios: AdvisorPortfolio[] = []
): Promise<ZerodhaImportResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data as Record<string, any>[];
          if (!rows || rows.length === 0) {
            return resolve({
              sourceType: 'TRADEBOOK',
              transactions: [],
              quotesToUpdate: {},
              parsedCount: 0,
              warnings: ['The CSV file contains no data rows.'],
            });
          }

          const headerKeys = Object.keys(rows[0]).map((k) => k.toLowerCase().trim());
          
          // Detect if user mistakenly uploaded a Holdings file
          const isHoldingsFile =
            headerKeys.some((k) => k.includes('avg. cost') || k.includes('cur. val') || k.includes('ltp')) &&
            !headerKeys.some((k) => k.includes('trade_type') || k.includes('trade_date') || k.includes('type'));

          if (isHoldingsFile) {
            return reject(
              new Error(
                'Holdings CSV cannot be used for importing trades. Holdings files lack execution dates, BUY/SELL trade types, realized P&L history, and advisor attribution. Please upload a Tradebook CSV containing Advisor Id and Portfolio Id columns.'
              )
            );
          }

          // Parse as Tradebook with row-level Advisor Id and Portfolio Id attribution
          resolve(parseZerodhaTradebook(rows, defaultAdvisorId, 'Zerodha Tradebook', availableAdvisors, availablePortfolios));
        } catch (err: any) {
          reject(err);
        }
      },
      error: (error: any) => {
        reject(error);
      },
    });
  });
}

/**
 * Generates a ready-to-use Tradebook CSV template with Advisor Id and Portfolio Id columns pre-populated.
 */
export function generateSampleTradebookCSV(
  advisors: Advisor[] = [],
  portfolios: AdvisorPortfolio[] = []
): string {
  const adv1 = advisors[0]?.id || 'adv-1';
  const adv2 = advisors[1]?.id || advisors[0]?.id || 'adv-2';
  const port1 = portfolios.find((p) => p.advisorId === adv1)?.id || 'port-core';
  const port2 = portfolios.find((p) => p.advisorId === adv2)?.id || 'port-swing';

  const headers = [
    'trade_date',
    'symbol',
    'trade_type',
    'quantity',
    'price',
    'advisor_id',
    'portfolio_id',
    'trade_id',
    'order_id',
  ];

  const sampleRows = [
    ['2024-04-10', 'RELIANCE', 'BUY', '50', '2850.50', adv1, port1, 'TRD1001', 'ORD2001'],
    ['2024-04-15', 'TCS', 'BUY', '25', '3820.00', adv1, port1, 'TRD1002', 'ORD2002'],
    ['2024-05-02', 'DIXON', 'BUY', '15', '6200.00', adv2, port2, 'TRD1003', 'ORD2003'],
    ['2024-06-18', 'DIXON', 'SELL', '15', '7100.00', adv2, port2, 'TRD1004', 'ORD2004'],
    ['2024-07-05', 'HDFCBANK', 'BUY', '40', '1490.00', adv1, port1, 'TRD1005', 'ORD2005'],
  ];

  return [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');
}
