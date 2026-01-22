# n8n Workflow Integration

## ✅ Requirements Met
- **n8n workflow** generates a PDF itinerary.
- **Email automation**: Sends the PDF to the user's provided email.
- **Structured Hand-off**: Server transforms JSON itinerary into styled HTML before sending to n8n.

## 🛠️ Workflow Architecture

### 1. Webhook (POST)
- **Path**: `/generate-itinerary`
- **Expected Body**:
  ```json
  {
    "email": "user@example.com",
    "htmlContent": "<html>...</html>",
    "itineraryTitle": "Paris Trip"
  }
  ```

### 2. HTML to PDF Node
- Converts the dynamic HTML string into a `.pdf` buffer.
- Uses n8n's native PDF generation capabilities.

### 3. Send Email Node
- **Attachments**: The generated PDF.
- **Body**: *"Please find attached your travel itinerary."*

## ⚙️ Setup Instructions

1. **Import Workflow**:
   - Open your n8n instance.
   - Go to **Workflows -> Import from File**.
   - Select `server/n8n/travel_planner_workflow.json`.

2. **Configure Credentials**:
   - In the **Send Email** node, add your SMTP credentials (Gmail, SendGrid, etc.).

3. **Deploy Webhook**:
   - Click **Execute Workflow** once to test or **Activate** to make it persistent.
   - Copy the Production Webhook URL.

4. **Update Application**:
   - Paste the URL into `server/.env`:
     ```env
     N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/generate-itinerary
     ```

## 🧪 Testing the Flow
1. Open the TripGPT UI.
2. Generate an itinerary using voice.
3. Click the **📄 Export PDF** button.
4. Enter your email when prompted.
5. Check your inbox!
