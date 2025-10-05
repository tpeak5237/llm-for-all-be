import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "20mb" }));

// CORS setup
const allowedOrigins = ["https://llmforall.netlify.app", "null"]; // include 'null' for local file://
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

// Health check
app.get("/", (req, res) => {
  res.status(200).send("✅ LLM-for-All backend running on Render");
});

// Main AI route
app.post("/call-ai", async (req, res) => {
  try {
    const model = req.body.model || "gemma-3-27b-it";
    const payload = req.body; // forward full structure from frontend

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.API_KEY}`;

    console.log("➡️ Forwarding to:", apiUrl);
    console.log("🟢 Payload keys:", Object.keys(payload));

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    res.status(response.status).type("application/json").send(text);
  } catch (error) {
    console.error("❌ Backend error:", error);
    res.status(500).json({ error: "AI request failed", detail: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ LLM-for-All backend running on port ${PORT}`));
