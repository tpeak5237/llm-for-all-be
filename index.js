import express from "express";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
app.use(express.json({ limit: "20mb" }));

// Allowed frontend origins
const allowedOrigins = ["https://llmforall.netlify.app", "null"];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// File path for usage log (safe for Render)
const LOG_PATH = "/tmp/usage_log.json";

// Initialize log file if missing
if (!fs.existsSync(LOG_PATH)) {
  fs.writeFileSync(
    LOG_PATH,
    JSON.stringify(
      {
        Gemma3: { requests: 0, tokens: 0 },
        Gemma3n: { requests: 0, tokens: 0 },
        Gemini2_5FlashLite: {
          requests: 0,
          tokens: 0,
          limits: { RPM: 15, RPD: 1000 },
        },
      },
      null,
      2
    )
  );
}

// Helper: update usage log
function updateUsage(model, tokensUsed = 0) {
  const log = JSON.parse(fs.readFileSync(LOG_PATH));
  const key =
    model.startsWith("gemma-3n") ? "Gemma3n" :
    model.startsWith("gemma-3") ? "Gemma3" :
    model.includes("gemini-2.5-flash-lite") ? "Gemini2_5FlashLite" :
    null;

  if (key) {
    log[key].requests += 1;
    log[key].tokens += tokensUsed;
    fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
    console.log(`📊 Updated usage log for ${key}`);
  }
}

// Health check
app.get("/", (req, res) => {
  res.status(200).send("✅ LLM-for-All backend running on Render");
});

// Usage stats endpoint
app.get("/stats", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(LOG_PATH));
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to read usage log", detail: err.message });
  }
});

// Unified AI endpoint
app.post("/call-ai", async (req, res) => {
  try {
    const model = req.body.model || "gemma-3n-e4b-it";
    let payload = req.body;

    // Gemma models don't support system_instruction
    const isGemma = model.startsWith("gemma");
    if (isGemma) {
      const { contents, generationConfig, safetySettings } = payload;
      payload = { contents, generationConfig, safetySettings };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.API_KEY}`;
    console.log("➡️ Sending to:", apiUrl);
    console.log("📦 Model:", model);
    console.log("📤 Payload keys:", Object.keys(payload));

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await response.text();

    // Estimate token usage by payload length
    const tokensUsed = Math.round(JSON.stringify(payload).length / 4);
    updateUsage(model, tokensUsed);

    res.status(response.status).type("application/json").send(text);
  } catch (error) {
    console.error("❌ Backend error:", error);
    res.status(500).json({ error: "AI request failed", detail: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`✅ LLM-for-All backend running on port ${PORT}`)
);
