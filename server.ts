import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy Google GenAI Client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in the environment.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI Advisor Performance Audit Endpoint
app.post("/api/ai/advisor-audit", async (req: Request, res: Response) => {
  try {
    const { advisorStats, timeframe, overlaps } = req.body;
    if (!advisorStats || !Array.isArray(advisorStats)) {
      return res.status(400).json({ error: "Missing advisorStats array in request body." });
    }

    const ai = getAIClient();
    const prompt = `You are a Senior Quantitative Portfolio Analyst and SEBI-registered advisory auditor.
Analyze the following multi-advisor stock portfolio performance data for an Indian investor (timeframe: ${timeframe || "All-Time"}):

ADVISOR PERFORMANCE DATA:
${JSON.stringify(advisorStats, null, 2)}

STOCK OVERLAPS ACROSS ADVISORS:
${JSON.stringify(overlaps || [], null, 2)}

Please provide a concise, sharp, high-conviction audit structured in markdown:
1. **Advisor Performance Summary**: Score each advisor/agent (A+ to C-) based on net alpha (Realized + Unrealized + Dividends), XIRR, and hit rate on exited trades. Point out who is delivering real gains vs who is dragging portfolio return with hidden realized losses.
2. **Hidden Losses & Churn Analysis**: Specifically evaluate the exited trades. Highlight if any advisor generated high turnover or took steep exit losses that Zerodha Kite's basic Holdings tab masks.
3. **Dividend Contribution**: Which advisor's picks generate healthy regular income/dividend yield.
4. **Stock Overlap & Capital Inefficiencies**: Analyze instances where multiple advisors hold the same stock (e.g. at conflicting prices or duplicating risk).
5. **Actionable Recommendations**: Clear, specific steps (e.g. increase allocation to top performer, trim overlapping duplicate holdings, rebalance).

Keep the analysis insightful, highly practical, and tailored to Indian market context (NSE/BSE, SEBI RIAs, Smallcases, Trading Agents).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
    });

    res.json({ analysis: response.text || "No analysis generated." });
  } catch (error: any) {
    console.error("Error in /api/ai/advisor-audit:", error);
    res.status(500).json({
      error: error.message || "Failed to generate AI Advisor audit.",
    });
  }
});

// AI Natural Language Trade Note / SMS / Contract Note Parser
app.post("/api/ai/parse-trade", async (req: Request, res: Response) => {
  try {
    const { noteText, availableAdvisors } = req.body;
    if (!noteText || typeof noteText !== "string") {
      return res.status(400).json({ error: "Missing noteText string." });
    }

    const ai = getAIClient();
    const prompt = `You are a financial trade parser for Indian stock market transactions (Kite, Zerodha, Smallcase, Broker SMS, Contract notes).
Extract all trade transactions from this input text:
"${noteText}"

Known Advisors/Tags: ${JSON.stringify(availableAdvisors || ["Ethica Invest", "Smallcase", "Trading Agent", "Self"])}

Respond ONLY with valid JSON in this exact structure (no markdown formatting around it, just raw JSON):
{
  "trades": [
    {
      "type": "BUY" | "SELL" | "DIVIDEND",
      "symbol": "TICKER_SYMBOL",
      "name": "Company Name",
      "quantity": number,
      "price": number,
      "date": "YYYY-MM-DD",
      "advisorName": "Matched or inferred advisor from text or 'Self'",
      "notes": "Brief context if available"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
    });

    let rawText = response.text || "{}";
    rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(rawText);

    res.json(parsed);
  } catch (error: any) {
    console.error("Error in /api/ai/parse-trade:", error);
    res.status(500).json({
      error: error.message || "Failed to parse trade text.",
    });
  }
});

// Vite Middleware & Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: "0.0.0.0", port: PORT },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
