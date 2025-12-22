import express from "express";
import fetch from "node-fetch";
import cors from "cors"; 

const app = express();

console.log("-----------------------------------------");
console.log("🚀 STARTING DUAL-MODE GATEWAY - VERSION V3");
console.log("-----------------------------------------");

// ✅ 1. UNIVERSAL CORS (Fixes errors for both websites)
app.use(cors({
  origin: "*", 
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json({ limit: "20mb" }));

// --- ROUTES ---

// 2. Health Check
app.get("/", (req, res) => {
  res.status(200).send("✅ LLM-for-All & Chitter Gateway is Active (V3)");
});

// 3. The Smart AI Endpoint
app.post("/call-ai", async (req, res) => {
  try {
    // Detect where the request is coming from
    const origin = req.headers.origin || "";
    const model = req.body.model || "gemma-e4b-27b-it";
    let payload = req.body;

    console.log(`📨 Request from: ${origin || "Unknown/Local"}`);

    // --- PERSONA LOGIC: DECIDE WHO THE AI IS ---
    let systemText = "";

    if (origin.includes("chitterchanges.org")) {
        // 🔴 MODE A: CHITTER CHANGES (Student Advocate)
        console.log("🎭 Persona: FAH (Chitter)");
        systemText = `
        IDENTITY: You are 'Chitter AI' (or 'Chitter') a student advocacy assistant.
        TONE: Rebellious but safe. On the student's side.
        NAME: If asked, you are 'Chitter'.`;
    } else {
        // 🔵 MODE B: LLM FOR ALL (General Assistant)
        console.log("🎭 Persona: GENERAL ASSISTANT (Fah)");
        systemText = `
        IDENTITY: You are a helpful, factual AI assistant for 'LLM For All'.
        TONE: Professional, educational, and clear.
        NAME: You are LLMall 1.0.`;
    }

    // --- INJECT THE PERSONA ---
    // We add this as the very first message so the AI knows how to behave
    const systemInstruction = { role: "user", parts: [{ text: `SYSTEM_INSTRUCTION: ${systemText}` }] };
    
    // Safety check for payload structure
    if (!payload.contents) payload.contents = [];
    
    // Add instruction to the TOP of the conversation
    payload.contents.unshift(systemInstruction);

    // --- SEND TO GOOGLE ---
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.API_KEY}`;
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    
    if (response.ok) {
        console.log("✅ AI Success");
    } else {
        console.log(`❌ AI Error ${response.status}`);
    }

    res.status(response.status).type("application/json").send(text);

  } catch (error) {
    console.error("❌ Gateway Error:", error);
    res.status(500).json({ error: "Backend Error", detail: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
