# TradeWise: Business Analyst & Functional System Specification

**Document Version:** 1.2  
**Target Audience:** Business Analysts, Product Managers, Financial System Auditors, and Active Investors  
**System Classification:** Multi-Advisor Portfolio Attribution & Demat Reconciliation Engine  

---

## 1. Executive Summary & Business Problem

In the Indian equity landscape, high-net-worth individuals and retail investors frequently subscribe to multiple **SEBI-registered Research Analysts (RAs)**, **Investment Advisers (RIAs)**, **Smallcase model portfolios**, or execute **self-discretionary tactical trades**. 

However, discount brokers such as **Zerodha (Kite)** aggregate all purchased equities into a **single consolidated Demat account (CDSL/NSDL)**. This architectural limitation creates significant blind spots:
1. **Lack of Attribution:** The broker's dashboard displays a single blended average price for a stock (e.g., 100 shares of Reliance @ ₹2,800), masking that Advisor A recommended 50 shares at ₹2,500 while Advisor B recommended 50 shares at ₹3,100.
2. **Hidden Losses & Churn:** When an advisor exits an underperforming position at a loss, that ticker disappears completely from the broker's active holdings tab, burying the advisor's realized drawdown.
3. **Unmonitored Overlaps:** Multiple advisors often recommend the exact same ticker simultaneously, creating unintended concentration risk without the investor's awareness.
4. **Fee-to-Alpha Disconnect:** Investors pay advisory subscription fees (often ₹15,000–₹50,000/year per advisor) without quantifiable proof of whether an advisor is generating true alpha over index benchmarks.

**TradeWise** solves this by acting as an **independent attribution and demat reconciliation layer**. It maps every buy, sell, and dividend to its originating advisory thesis while mathematically reconciling active holdings back to the broker's consolidated Demat balance.

---

## 2. Core Functional Modules

| Module Name | Business Purpose | Key User Capabilities |
| :--- | :--- | :--- |
| **Overview & Allocation** | Top-level portfolio command center | Real-time consolidated AUM, total invested capital, cumulative net gains, annualized portfolio XIRR, market cap allocation (Large/Mid/Small/Micro), and advisor share breakdown. |
| **Advisor Deep Dive** | Isolated performance scorecards | Segregates capital and metrics per advisor. Supports sub-portfolios (e.g., "Core Compounders" vs "Momentum Swing"), win/loss ratios, open positions, and closed trades. |
| **Consolidated Demat View** | Physical Demat verification & Overlap matrix | Reconstructs the single Zerodha Demat ledger. Flags multi-advisor overlap conflicts (e.g., Advisor 1 is holding while Advisor 2 issued a SELL alert). Calculates weighted blended buy prices. |
| **Exited Trades & Realized P&L** | Historical accountability & Tax tracking | Uncovers closed trades using strict FIFO matching. Calculates holding period in calendar days, short-term vs long-term classification, and realized capital gains. |
| **Dividend Income Tracker** | Corporate action attribution | Logs cash dividend credits, credits them back into advisor alpha, and tracks dividend yield on invested capital. |
| **Tradebook & Audit Ledger** | Execution history | Chronological log of all orders with filters by advisor, type (BUY/SELL), symbol, date range, and rebalancing tags. |
| **AI Advisory Audit** | Quantitative performance evaluation | Leverages server-side Gemini 3.7 models to generate objective RIA evaluations, assign letter grades (A+ to C-), identify portfolio churn, and parse contract notes. |

---

## 3. Data Lineage: What Data is Fetched From Where

TradeWise operates on a **dual-layer persistence model** combining browser-based zero-latency caching with secure Google Cloud Firestore synchronization.

```
┌────────────────────────────────────────────────────────┐
│                      DATA SOURCES                      │
│                                                        │
│  [Zerodha Kite Holdings CSV]   [Console Tradebook CSV]  │
│  [Manual Trade Modal Forms]   [AI Contract Note Text]  │
│  [Market LTP Quotes Ticker]   [Bank Dividend Credits]  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                   INGESTION ENGINE                     │
│  • PapaParse CSV Streaming Stream                      │
│  • Symbol & Date Normalization Engine                  │
│  • Deterministic Composite Deduplication Filter        │
│  • REST API: /api/ai/parse-trade (Gemini 3.7)          │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                   ACCOUNTING ENGINE                    │
│  • Chronological FIFO Lot Matching (portfolioMath.ts)   │
│  • Cost Basis & Realized/Unrealized P&L Calculator     │
│  • Newton-Raphson XIRR Convergence Solver              │
│  • Multi-Advisor Demat Aggregation & Overlap Matrix    │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌────────────────────────┐  ┌────────────────────────┐
│  Client LocalStorage   │  │  Google Cloud Firestore│
│  • Instant UI render   │  │  • Multi-device sync   │
│  • Offline resiliency  │  │  • 1.5s debounced save │
│  • Guest session cache │  │  • users/{uid} scoped  │
└────────────────────────┘  └────────────────────────┘
```

### Detailed Data Entity Lineage:
1. **Live Market Prices (LTP):**
   - *Source:* Extracted dynamically from the `LTP` / `Last Price` column during CSV imports; supplemented by an internal quote engine with realistic price variation and market hours simulation.
   - *Storage:* Stored in `quotes` state, cached in `localStorage (tradewise_quotes_v1)`, and saved to user Firestore document.
2. **Trade Transactions (Ledger):**
   - *Source:* Ingested from Zerodha Console Tradebook CSV, Kite Holdings CSV, manual user modals, or parsed raw contract notes.
   - *Storage:* Stored in `transactions` state and Firestore collection.
3. **Dividend Records:**
   - *Source:* User manual input from bank credit statements or broker dividend reports.
   - *Storage:* Stored in `dividends` state and Firestore collection.
4. **AI Audit Insights:**
   - *Source:* Computed dynamically on-demand via server-side Google GenAI (`POST /api/ai/advisor-audit` calling Gemini 3.7 Flash).
   - *Storage:* Rendered directly into the active session overview without polluting relational database storage.

---

## 4. Calculation Logic & Financial Mathematics

TradeWise adheres to standard SEBI portfolio accounting and Indian capital gains tax principles.

### 4.1 First-In, First-Out (FIFO) Inventory Matching
When an investor executes a **SELL** order, the accounting engine identifies the earliest unexhausted **BUY** transaction for that specific symbol and advisor:

$$\text{Per-Share Buy Cost} = \text{Lot Buy Price} + \left(\frac{\text{Lot Brokerage \& Statutory Charges}}{\text{Lot Quantity}}\right)$$

$$\text{Matched Cost Basis} = \sum_{k} \left(\text{Matched Quantity}_k \times \text{Per-Share Buy Cost}_k\right)$$

$$\text{Net Sell Consideration} = (\text{Sell Quantity} \times \text{Sell Price}) - \text{Sell Charges}$$

$$\mathbf{\text{Realized P\&L}} = \text{Net Sell Consideration} - \text{Matched Cost Basis}$$

If the lot was acquired more than 365 days prior to sale, it is classified as **Long-Term Capital Gain (LTCG)**; otherwise, it is classified as **Short-Term Capital Gain (STCG)**.

### 4.2 Active Holdings & Unrealized Returns
Unexhausted BUY shares form the active portfolio:

$$\text{Active Invested Capital} = \sum (\text{Remaining Quantity} \times \text{Buy Price} + \text{Attributed Charges})$$

$$\text{Current Market Value} = \text{Total Active Quantity} \times \text{LTP}$$

$$\mathbf{\text{Unrealized P\&L}} = \text{Current Market Value} - \text{Active Invested Capital}$$

$$\mathbf{\text{Total Net Return}} = \text{Realized P\&L} + \text{Unrealized P\&L} + \text{Total Dividends Received}$$

$$\mathbf{\text{Net Return \%}} = \left(\frac{\text{Total Net Return}}{\text{Active Invested Capital}}\right) \times 100$$

### 4.3 Extended Internal Rate of Return (XIRR)
Because investors add and withdraw funds intermittently through monthly SIPs or ad-hoc rebalances, traditional Compounded Annual Growth Rate (CAGR) is mathematically inappropriate. TradeWise calculates **XIRR** using the **Newton-Raphson approximation algorithm**:

$$\sum_{i=1}^{N} \frac{C_i}{(1 + r)^{\frac{d_i - d_1}{365.25}}} = 0$$

Where:
- $C_i < 0$ for all BUY cash outflows: $-((\text{Qty} \times \text{Price}) + \text{Charges})$
- $C_i > 0$ for all SELL cash inflows: $+(\text{Qty} \times \text{Price}) - \text{Charges}$
- $C_i > 0$ for Dividend cash credits
- $C_N > 0$ Terminal Portfolio Value evaluated at current date $d_N$
- $r$ is the annualized discount rate (XIRR). If iterations exceed 100 or cashflows lack polarity, the system falls back gracefully to annualized simple return.

### 4.4 Consolidated Demat Blended Cost & Overlap
For the unified Demat view across all advisors:

$$\text{Total Consolidated Shares} = \sum_{a \in \text{Advisors}} Q_{a}$$

$$\mathbf{\text{Blended Demat Average Price}} = \frac{\sum_{a \in \text{Advisors}} (Q_a \times \text{Avg Price}_a)}{\sum_{a \in \text{Advisors}} Q_a}$$

**Overlap Condition:** Triggered whenever $\text{Count}(\text{Advisors holding Symbol } S) \ge 2$.

---

## 5. CSV Import & Duplicate Handling Engine

### 5.1 Holdings CSV vs. Tradebook CSV
Zerodha provides two distinct CSV reports that users must understand:

1. **Kite Portfolio > Holdings CSV:**
   - *Contents:* A static snapshot of active balances on the export date.
   - *Processing:* Creates synthetic BUY transactions for active holdings.
   - *Limitation:* Does not include past closed trades or dividends; cannot calculate historical realized gains.
2. **Kite Console > Reports > Tradebook CSV:**
   - *Contents:* An immutable chronological transaction ledger of executed exchange trades.
   - *Processing:* Reconstructs the complete lifecycle (buys, sells, partial exits) using FIFO.
   - *Advantage:* Enables multi-year XIRR, exit attribution, and tax logs.

### 5.2 Deterministic Deduplication Logic
Re-uploading cumulative monthly Zerodha CSV files is a standard user habit. Without deduplication, re-importing a tradebook will double an investor's share count. 

TradeWise implements a **Deterministic Composite Identity Filter**:

```
Trade Signature = AdvisorID + Symbol + Type + Date + Quantity + Price (±0.01) + [TradeID]
```

**Workflow during CSV Ingestion:**
1. User drops a CSV file into the **Import & Export Hub**.
2. TradeWise parses the raw text and standardizes column headers across multiple Kite/Console format versions.
3. Every parsed trade row is matched against the user's existing `transactions` ledger for the target advisor.
4. **Visual Annotation:** 
   - Net-new rows receive a green **"New"** badge.
   - Duplicate rows receive an amber **"Duplicate"** badge.
5. **Safeguard Toggle:** A default-enabled checkbox `[x] Skip Duplicates` ensures only net-new records are merged.
6. If all rows already exist in the ledger, the primary action button disables gracefully, displaying *"All Trades Already In Ledger"*.

---

## 6. Error Causes & Diagnostic Protocols

| Failure Mode | Root Cause | System Impact | Mitigation / System Safeguard |
| :--- | :--- | :--- | :--- |
| **Orphan SELL Order** | User imported a Tradebook for a date range (e.g. FY 2024) where a sale occurred, but the original purchase happened in 2022. | FIFO engine finds no matching BUY lot. Without safeguards, inventory drops negative. | The engine sets the cost basis to the sell price with 0 holding days, prevents a crash, and alerts the user to widen the export date range. |
| **Double Ingestion (Holdings + Tradebook)** | User imported a Kite Holdings snapshot and subsequently imported a Console Tradebook for the same advisor. | Active holdings reflect double the actual Demat balance. | The import modal displays duplicate alerts. The user can use the "Reset All Data" button or filter by tag to prune duplicates. |
| **Symbol Discrepancies** | Broker exports containing exchange or series prefixes (e.g. `NSE:INFY`, `BSE:TCS`, `INFY-EQ`). | Ticker matching fails; quotes fail to link. | Ingestion engine runs regex cleaners: strips `NSE:`, `BSE:`, `-EQ`, `-BE` suffixes, normalizing all tickers to uppercase. |
| **Date Format Incompatibilities** | Different regional Excel exports produce `DD/MM/YYYY`, `MM/DD/YYYY`, or timestamps (`2024-03-15 11:32:01`). | Date sorting breaks FIFO chronological order. | The date parser detects delimiters (`/` vs `-`), validates month/day bounds, and standardizes to ISO `YYYY-MM-DD`. |
| **Guest Cache Loss** | Operating in unauthenticated Guest Mode and clearing browser cookies/cache. | Loss of local portfolio data. | Warning prompts advise users to authenticate via Google Cloud Firestore or export regular JSON backups. |

---

## 7. User Operating Checklist & Best Practices

To maintain flawless portfolio hygiene:

1. **Configure Advisors First:** Prior to uploading trade files, open **Advisors > Manage Advisors** to register your SEBI RIAs, Smallcase baskets, or self-directed strategies.
2. **Prioritize Tradebook Over Holdings:** For true financial attribution, export the **Zerodha Console Tradebook** spanning from your earliest trade date.
3. **Verify Deduplication Counts:** During monthly updates, verify that previously imported trades are marked as duplicates and skipped.
4. **Audit Multi-Advisor Overlaps:** Check the **Consolidated Demat** tab monthly. If two advisors recommend the same stock with conflicting actions (one BUY, one SELL), conduct an advisory review.
5. **Log Cash Dividends:** Record corporate dividend credits using the **Log Dividend** tool to reflect true total return alpha.
6. **Maintain Offline JSON Backups:** Export a weekly JSON backup via **Import / Export > Export Data > Download JSON Backup**.

---
*End of TradeWise Business Analyst System Specification.*
