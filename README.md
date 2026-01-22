# TripGPT: Voice-First AI Travel Planner 🌍✈️

**TripGPT** is a next-generation travel planning assistant that combines conversational voice AI with grounded real-world data to create feasible, personalized itineraries.

## 🚀 Key Features

- **🎙️ Voice-First Navigation**: Speak naturally to plan, modify, and explore trips.
- **📚 Grounded Knowledge (RAG)**: Integrates **Wikivoyage** data for city guides, safety tips, and etiquette.
- **🛠️ MCP Architecture**: Modularized core capabilities (POI Search & Itinerary Building) using the **Model Context Protocol**.
- **🗺️ Real-World Data**: Uses **OpenStreetMap (Overpass API)** for actual points of interest.
- **📄 Pro PDF Export**: Integrated **n8n workflow** to generate and email professional itineraries.
- **⚖️ AI Evaluations**: Automated checks for feasibility, edit correctness, and grounding.

---

## 🏗️ System Architecture

### **1. Orchestration Layer (Node.js)**
The central hub that manages the conversation flow between the User, LLM (OpenAI), and various tools.
- **MCP Orchestrator**: Manages standard I/O communication with specialized MCP servers.
- **RAG Service**: Handles caching and retrieval of travel knowledge with citations.

### **2. MCP Tools**
- **POI Search Server**: Grounded search for real-world locations via OpenStreetMap.
- **Itinerary Builder Server**: Generates structured plans and performs **Feasibility Checks** (Time/Pace/Conflicts).

### **3. Companion UI (React + Vite)**
A high-performance web interface designed with **Glassmorphism** aesthetics.
- Features: Real-time Transcript, Itinerary Cards, Sidebar History, and **Sources & References** section.

---

## 🛠️ Tech Stack
- **Frontend**: React, Vite, TailwindCSS, Lucide Icons.
- **Backend**: Node.js, Express, MCP SDK.
- **AI**: OpenAI GPT-4o (Tool Calling).
- **Automation**: n8n.
- **Data**: OpenStreetMap (OSM), Wikivoyage.

---

## 🚦 Getting Started

### **Prerequisites**
- Node.js (v18+)
- OpenAI API Key
- n8n instance (optional for PDF export)

### **Installation**

1. **Clone & Install Backend**
   ```bash
   cd server
   npm install
   # Create .env and add OPENAI_API_KEY
   npm start
   ```

2. **Install Frontend**
   ```bash
   cd client
   npm install
   npm run dev
   ```

3. **Verify**
   - Open `http://localhost:5173`
   - Ensure the server logs show: `[MCP Orchestrator] Connected successfully.`

---

## 🧪 AI Evaluations

We implement three core evaluation checks to ensure system reliability:
1.  **Feasibility Eval**: Validates duration, travel times, and pace consistency.
2.  **Edit Correctness Eval**: Ensures voice modifications only affect intended sections.
3.  **Grounding Eval**: Verifies POIs map to dataset records and tips cite RAG sources.

Run the suite:
```bash
cd server
npm test
```

---

## 📚 Requirements Checklist (Capstone)

- [x] **Voice-Based Planning** (Supported via Web Speech API)
- [x] **Voice-Based Editing** (History-aware tool calls)
- [x] **Explanation & Reasoning** (Grounded via RAG Citations)
- [x] **At least 2 MCP Tools** (POI Search & Itinerary Builder)
- [x] **RAG Implementation** (Wikivoyage guides with sources)
- [x] **n8n Workflow** (PDF Generation & Email)
- [x] **Companion UI** (Detailed Itinerary + Sources View)
- [x] **AI Evaluations** (3 runnable checks)
- [x] **Version Control** (Initialized Git Repo)
- [x] **Deployment Ready** (Configured for Vercel/Render)

---

## 📄 License
MIT License - Created for Capstone Project.
