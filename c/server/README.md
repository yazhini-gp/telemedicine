# Symptom Checker Server (Node + Express)

## Setup
1. Copy `.env.example` to `.env` and set `OPENAI_API_KEY`.
2. Install deps and run dev server:

```powershell
cd server
npm install
npm run dev
```

## Endpoints
- **POST /api/chat**: `{ messages: [{ role: 'user'|'assistant'|'system', content: string }, ...] }`
  - Returns: `{ content: string }`

## Notes
- Uses OpenAI gpt-4o-mini, non-streaming.
- Includes safety-focused system prompt and disclaimer.