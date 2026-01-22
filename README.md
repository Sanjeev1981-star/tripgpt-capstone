# Antigravity Travel AI 🌍✈️

A Voice-First AI Travel Planner built with React, Node.js, and OpenAI.

## 🚀 Features
- **Voice-to-Plan**: Speak your travel desires, and get a structured itinerary.
- **Real-Time Data**: Uses OpenStreetMap (Overpass API) to find real POIs.
- **Grounded Reasoning**: Explains why it chose certain places.
- **Smart Edits**: "Make day 2 more relaxed" updates only the relevant sections.
- **Rich UI**: Glassmorphism design with interactive itinerary cards.

## 🛠️ Tech Stack
- **Frontend**: React, Vite, TailwindCSS, Web Speech API
- **Backend**: Node.js, Express
- **AI**: OpenAI GPT-4o (Tool Calling / Function Calling)
- **Tools**: 
    - `search_pois`: OSM Overpass integration
    - `update_itinerary`: Structured JSON generator

## 🏃‍♂️ How to Run

1. **Start the Server**
   ```bash
   cd server
   npm install
   # Ensure .env has OPENAI_API_KEY
   node index.js
   ```

2. **Start the Client**
   ```bash
   cd client
   npm install
   npm run dev
   ```

3. **Open App**
   - Visit `http://localhost:5173`
   - Click "Start Listening" and say: *"Plan a 2-day trip to Tokyo."*

## 🧪 AI Evaluations
Run the automated evaluation suite:
```bash
cd server
node tests/evals.js
```
*Tests included: Grounding Check (POI Usage), Feasibility Check (Time), Edit Correctness.*

## 📂 Project Structure
- `client/src/App.jsx`: Main Voice UI & Itinerary Render
- `server/services/aiService.js`: AI Logic & Tool Orchestration
- `server/tools/poiSearch.js`: OpenStreetMap Connector
- `server/tools/itineraryTool.js`: Itinerary State Manager
