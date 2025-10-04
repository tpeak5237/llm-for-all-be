import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// Fix CORS issue
app.use(
  cors({
    origin: "*", // allow all origins
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

// Health check
app.get("/", (req, res) => {
  res.status(200).send("✅ LLM-for-All backend running on Render");
});

// AI endpoint
app.post("/call-ai", async (req, res) => {
  try {
    const { model, payload } = req.body;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=AIzaSyAi7g9ktQXUYoj0F9j_cgTpQQhIM1CVcHQ`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    res.status(response.status).type("json").send(text);
  } catch (err) {
    res.status(500).json({ error: "AI request failed", detail: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
