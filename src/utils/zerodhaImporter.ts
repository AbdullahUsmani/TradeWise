import Papa from 'papaparse';
import { Advisor, MarketCapCategory, Transaction, StockQuote } from '../types/portfolio';

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
 * Typical Headers:
 * "symbol", "isin", "trade_date", "exchange", "segment", "series", "trade_type", "auction", "quantity", "price", "trade_id", "order_id", "order_execution_time"
 */
export function parseZerodhaTradebook(
  rows: Record<string, any>[],
  advisorId: string,
  defaultTag = 'Zerodha Tradebook'
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
    if (!symbol) return;

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
        // Assume DD/MM/YYYY or YYYY/MM/DD
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

    const knownMeta = KNOWN_INDIAN_STOCKS[symbol] || {
      name: symbol,
      sector: 'Diversified',
      marketCap: 'MID' as MarketCapCategory,
    };

    const tradeId = norm['tradeid'] || norm['orderid'] || `trade-${idx}`;

    const tx: Transaction = {
      id: `tx-zdh-tb-${tradeId}-${Date.now()}-${idx}`,
      advisorId: advisorId,
      symbol: symbol,
      name: knownMeta.name,
      sector: knownMeta.sector,
      marketCap: knownMeta.marketCap,
      type: type,
      date: formattedDate,
      quantity: quantity,
      price: price > 0 ? price : 100,
      charges: Math.max(15, Math.round(quantity * (price || 100) * 0.0012)),
      notes: `Trade ID: ${tradeId}`,
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
 * Universal CSV File parsing router for Zerodha, Smallcase, and standard trade formats
 */
export function parseCSVFile(
  fileContent: string,
  advisorId: string,
  preferredType?: 'AUTO' | 'HOLDINGS' | 'TRADEBOOK'
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
              sourceType: 'GENERIC_CSV',
              transactions: [],
              quotesToUpdate: {},
              parsedCount: 0,
              warnings: ['The CSV file contains no data rows.'],
            });
          }

          const headerKeys = Object.keys(rows[0]).map((k) => k.toLowerCase().trim());
          const isTradebook =
            preferredType === 'TRADEBOOK' ||
            headerKeys.some((k) => k.includes('trade_type') || k.includes('trade_date') || k.includes('trade_id') || k.includes('order_id'));
          const isHoldings =
            preferredType === 'HOLDINGS' ||
            headerKeys.some((k) => k.includes('avg. cost') || k.includes('cur. val') || k.includes('ltp') || k.includes('instrument'));

          if (isTradebook) {
            resolve(parseZerodhaTradebook(rows, advisorId));
          } else if (isHoldings) {
            resolve(parseZerodhaHoldings(rows, advisorId));
          } else {
            // Default to holdings parser which handles standard symbol, qty, price formats
            resolve(parseZerodhaHoldings(rows, advisorId, 'CSV Import'));
          }
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
