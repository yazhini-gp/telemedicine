# Dual Chatbot System

This implementation provides an intelligent dual chatbot system that automatically adapts to network conditions:

## 🚀 Features

### **AI-Powered Mode** (Good Network)
- Uses OpenAI GPT-4o-mini model
- Advanced symptom analysis
- Personalized recommendations
- Natural language understanding
- Detailed medical insights

### **Rule-Based Mode** (Poor Network/Offline)
- Works with local CSV data
- Instant symptom matching
- No internet required
- Reliable offline functionality
- Fast response times

## 🔄 Automatic Switching

The system automatically detects network conditions and switches between modes:

- **Fast Connection** (< 500ms) → AI Mode
- **Medium Connection** (500ms - 2s) → AI Mode  
- **Slow Connection** (> 2s) → Rule-Based Mode
- **Offline** → Rule-Based Mode

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
# Main application
cd nabhacare_siva
npm install

# AI server
cd ../c/server
npm install
```

### 2. Configure AI Server

Create a `.env` file in `c/server/`:
```
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
```

### 3. Start Both Servers

**Option A: Use the batch script (Windows)**
```bash
./start-dual-chatbot.bat
```

**Option B: Manual start**
```bash
# Terminal 1 - AI Server
cd c/server
npm start

# Terminal 2 - Main App  
cd nabhacare_siva
npm start
```

## 📱 Usage

### Floating Chatbot
- Click the chat icon in the bottom-right corner
- Automatically detects network and switches modes
- Shows current connection status

### Full Chatbot Page
- Navigate to `/chatbot` in the app
- Full-screen chatbot interface
- Network status indicator
- Mode information display

## 🔧 Technical Details

### Network Detection
- Measures response time to `/manifest.json`
- Classifies connection speed
- Monitors online/offline status
- Updates every 30 seconds

### AI Integration
- Calls `http://localhost:3001/api/chat`
- Uses OpenAI GPT-4o-mini model
- Fallback to rule-based on errors
- Maintains conversation context

### Rule-Based Fallback
- Uses `medical_symptoms_500_plus.csv`
- Levenshtein distance matching
- Multi-symptom parsing
- Instant local responses

## 🎯 Benefits

1. **Reliability**: Always works, even offline
2. **Performance**: Fast responses in poor network
3. **Intelligence**: Advanced AI when possible
4. **User Experience**: Seamless switching
5. **Accessibility**: Works in low-bandwidth areas

## 🔍 Monitoring

The system provides real-time feedback:
- 🚀 Fast connection (AI mode)
- 📶 Medium connection (AI mode)
- 🐌 Slow connection (Rule-based mode)
- 📡 Offline (Rule-based mode)

## ⚠️ Important Notes

- AI mode requires OpenAI API key
- Rule-based mode works without internet
- System automatically handles fallbacks
- No user intervention needed for switching
