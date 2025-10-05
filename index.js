import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

// Increase body size limit to handle PDF/image uploads
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Explicit CORS config
const FRONTEND = "https://llmforall.netlify.app";
const corsOptions = {
  origin: FRONTEND,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Add CORS header manually for every response
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", FRONTEND);
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// LOGIN route
app.post("/login", (req, res) => {
  try {
    const { user, pass } = req.body;
    const accounts = JSON.parse(process.env.ACCOUNTS || "{}");
    if (!accounts[user] || accounts[user] !== pass) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    res.status(200).json({ ok: true, user });
  } catch (err) {
    res.status(400).json({ error: "Bad request", detail: err.message });
  }
});

// CALL-AI proxy
app.post("/call-ai", async (req, res) => {
  try {
    const body = req.body;
    const model = body.model || "gemma-3-27b-it";
    const payload = body.payload || body;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.API_KEY}`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    res
      .status(response.status)
      .set("Access-Control-Allow-Origin", FRONTEND)
      .type("application/json")
      .send(text);
  } catch (err) {
    res
      .status(500)
      .set("Access-Control-Allow-Origin", FRONTEND)
      .json({ error: "AI request failed", detail: err.message });
  }
});

// Health check
app.get("/", (req, res) => {
  res
    .set("Access-Control-Allow-Origin", FRONTEND)
    .status(200)
    .send("✅ LLM-for-All backend running on Render");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
