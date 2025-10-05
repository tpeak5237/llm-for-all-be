import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "20mb" }));

// Allowed frontend origins
const allowedOrigins = ["https://llmforall.netlify.app", "null"]; // include null for local file:// testing

// CORS middleware
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

// Health check route
app.get("/", (req, res) => {
  res.status(200).send("✅ LLM-for-All backend running on Render");
});

// Main AI route
app.post("/call-ai", async (req, res) => {
  try {
    const { model = "gemma-3-27b-it", payload, prompt } = req.body;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.API_KEY}`;

    // If frontend sends only 'prompt', wrap it as a payload
    const finalPayload =
      payload ||
      {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt || "No prompt received." }],
          },
        ],
      };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalPayload),
    });

    const text = await response.text();
    res.status(response.status).type("application/json").send(text);
  } catch (error) {
    res
      .status(500)
      .json({ error: "AI request failed", detail: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 10000; // Render automatically maps 10000 to public HTTPS
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
