# Deployment Guide 🚀

This project is structured for a dual-deployment model: **Vercel** for the frontend and **Render** for the backend.

---

## 🏗️ 1. Backend Deployment (Render.com)

### **Setup Steps**
1.  **Create a New Web Service**: Connect your GitHub repository.
2.  **Root Directory**: `server`
3.  **Build Command**: `npm install`
4.  **Start Command**: `node index.js`
5.  **Add Environment Variables**:
    *   `OPENAI_API_KEY`: Your OpenAI key.
    *   `N8N_WEBHOOK_URL`: Your n8n webhook URL.
    *   `FRONTEND_URL`: `https://tripgpt.vercel.app`
    *   `PORT`: `3000` (Render will override this, but good to have).

### **Why Render?**
The backend uses **MCP Servers** via child processes. Render handles persistent Node.js processes and background tasks reliably.

---

## 🎨 2. Frontend Deployment (Vercel.com)

### **Setup Steps**
1.  **Import Project**: Connect GitHub.
2.  **Root Directory**: `client`
3.  **Framework Preset**: `Vite`
4.  **Add Environment Variables**:
    *   `VITE_API_URL`: Your **Render** backend URL + `/api/chat` (e.g., `https://tripgpt-backend.onrender.com/api/chat`).

### **Build Settings**
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

---

## 🛠️ 3. Post-Deployment Checklist

1.  **CORS Handshake**: Ensure `FRONTEND_URL` on Render matches your Vercel URL exactly (no trailing slash).
2.  **Voice Permissions**: Modern browsers require **HTTPS** for the Web Speech API. Both Vercel and Render provide SSL by default.
3.  **RAG Cache**: Note that on Render's free tier, the `wikivoyage_cache` folder is ephemeral. It will work fine but might re-fetch data after a server restart.

---

## 🧪 Testing the Live App
Once deployed, verify:
- [ ] Speech recognition works (Request mic permissions).
- [ ] Itinerary generates (Checks Backend connection).
- [ ] PDF Export works (Checks n8n connection).
- [ ] Sources appear (Checks RAG functionality).
