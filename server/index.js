require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { generateResponse } = require('./services/aiService');
const { initMCPSystem } = require('./mcp/orchestrator');
const { generateItineraryHTML } = require('./services/pdfTemplate');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize MCP System
initMCPSystem().catch(err => console.error("Failed to init MCP:", err));

const allowedOrigins = [
    'http://localhost:5173',
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('<h1>TripGPT API Server</h1><p>The backend is live. Use the frontend to interact.</p>');
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Travel AI Server is Running' });
});

// Chat Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { history } = req.body; // Array of { role, content }
        if (!history) {
            return res.status(400).json({ error: "No history provided" });
        }

        const responseData = await generateResponse(history);
        res.json({
            role: "assistant",
            content: responseData.content,
            itinerary: responseData.itinerary,
            sources: responseData.sources || []
        });

    } catch (error) {
        console.error("Endpoint Error:", error);
        res.status(500).json({ error: error.message || "Internal Server Error" });
    }
});

// n8n Workflow Trigger
app.post('/api/generate-pdf', async (req, res) => {
    try {
        const { itinerary, email } = req.body;

        if (!itinerary || !email) {
            return res.status(400).json({ error: "Missing itinerary or email" });
        }

        const htmlContent = generateItineraryHTML(itinerary);
        const webhookUrl = process.env.N8N_WEBHOOK_URL;

        if (!webhookUrl || webhookUrl.includes('your-n8n-instance')) {
            console.log("⚠️ n8n Webhook URL not configured. Simulating success...");
            return res.json({ message: "n8n simulation: PDF would be sent if webhook was configured." });
        }

        console.log(`🚀 Sending itinerary to n8n for ${email}...`);

        await axios.post(webhookUrl, {
            email,
            htmlContent,
            itineraryTitle: "Your Custom Trip"
        });

        res.json({ message: "Success! Your PDF is being generated and will be emailed shortly." });

    } catch (error) {
        console.error("n8n Webhook Error:", error.message);
        res.status(500).json({ error: "Failed to trigger PDF generation workflow." });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
