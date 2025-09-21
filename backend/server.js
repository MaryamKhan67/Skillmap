import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { getSkillSuggestions } from "./skillSuggestions.js";

dotenv.config();
const app = express();
const PORT = 3000;

// ✅ Allow all
app.use(cors({ origin: "*" }));

// ✅ Parse JSON body - Add these lines to properly parse JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ✅ API endpoint
app.post("/get-skill-suggestions", async (req, res) => {
    try {
        console.log("📩 Received request body:", req.body);
        
        const { knownSkills, targetRole } = req.body;

        if (!knownSkills || !targetRole) {
            return res.status(400).json({ 
                error: "Missing required fields: knownSkills and targetRole",
                received: req.body
            });
        }

        console.log("📩 Processing:", { knownSkills, targetRole });

        const data = await getSkillSuggestions(knownSkills, targetRole);
        res.json(data);
    } catch (err) {
        console.error("❌ Backend error:", err);
        res.status(500).json({ error: "AI request failed", details: err.message });
    }
});

// ✅ Add a test endpoint
app.get("/test", (req, res) => {
    res.json({ 
        message: "Backend is working!", 
        timestamp: new Date().toISOString(),
        cors: "CORS is enabled"
    });
});

// ✅ Add a simple POST test endpoint
app.post("/test-post", (req, res) => {
    res.json({ 
        message: "POST request received!", 
        data: req.body,
        timestamp: new Date().toISOString()
    });
});

// ✅ Start server
app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});