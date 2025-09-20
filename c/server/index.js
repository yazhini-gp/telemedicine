import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Safety-focused system prompt for free-form chat
const SYSTEM_PROMPT = `
You are a cautious, empathetic symptom-checker assistant. You are not a medical professional and do not provide medical advice or diagnosis. Always include this disclaimer: "This tool doesn't provide medical advice; for urgent symptoms, contact emergency services. Consult a healthcare professional for diagnosis and treatment."

Behavior:
- Ask brief clarifying questions when needed (onset, duration, severity, location, associated symptoms, relevant history, medications, red flags like chest pain, shortness of breath, confusion, severe bleeding).
- Offer general educational information and self-care suggestions where appropriate.
- Encourage in-person care when red flags are present or symptoms are severe, worsening, or persistent.
- Keep responses concise and non-alarming.
`;

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages must be an array of {role, content}' });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.3,
      max_tokens: 400,
      stream: false
    });

    const choice = response.choices?.[0];
    const content = choice?.message?.content ?? '';

    return res.json({ content });
  } catch (err) {
    console.error('OpenAI error:', err?.response?.data || err.message);
    const status = err?.status || 500;
    return res.status(status).json({ error: 'Failed to get response from model' });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});