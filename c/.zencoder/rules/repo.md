# Repository Context

- **Purpose**: Workspace for building a React-based symptom-checker chatbot powered by OpenAI gpt-4o-mini.
- **Environment**: Windows 11, PowerShell, VS Code.
- **Preferred Stack**:
  - **Frontend**: React (Vite) for chat UI
  - **Backend**: Node + Express proxy to OpenAI (keeps API key on server)
  - **OpenAI Model**: gpt-4o-mini

## Conventions
- **Paths**: Use absolute paths rooted at `c:\Users\Asus\OneDrive\Desktop\c`.
- **Secrets**: Store OpenAI key in server-side `.env` as `OPENAI_API_KEY`. Never commit secrets.
- **Streaming**: Prefer Server-Sent Events (SSE) for incremental token delivery if UX requires.

## Planned Endpoints
- `POST /api/chat`: Accepts messages array; proxies to OpenAI Chat Completions/Responses API.

## Safety & Compliance
- **Medical disclaimer**: "This tool does not provide medical advice; for emergencies, call local emergency services. Consult a qualified professional for diagnosis and treatment."
- **Triage rules**: Prefer guided questioning (onset, severity, duration, associated symptoms, red flags) before offering suggestions.

## Open Tasks
1. Confirm project structure (Vite React + Express backend).
2. Scaffold frontend and backend folders.
3. Implement `/api/chat` with gpt-4o-mini and optional streaming.
4. Build chat UI with message history and loading states.
5. Add guardrails and prompt template.
6. Add `.env` and example.