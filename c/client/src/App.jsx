import React, { useState } from 'react'

const disclaimer = "This tool doesn't provide medical advice; for urgent symptoms, contact emergency services. Consult a healthcare professional for diagnosis and treatment.";

export default function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi! I'm your symptom-checker assistant. ${disclaimer} How can I help today?` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendMessage(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return

    const nextMessages = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages })
      })
      if (!res.ok) throw new Error('Network response was not ok')
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.content }])
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, something went wrong. Please try again later.' }])
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      maxWidth: 800, margin: '0 auto', padding: 16,
      display: 'flex', flexDirection: 'column', height: '100vh'
    }}>
      <h1>Symptom Checker Chatbot</h1>
      <p style={{ fontSize: 12, color: '#555' }}>{disclaimer}</p>

      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            marginBottom: 12,
            textAlign: m.role === 'user' ? 'right' : 'left'
          }}>
            <div style={{
              display: 'inline-block',
              padding: '8px 12px',
              borderRadius: 12,
              background: m.role === 'user' ? '#DCF8C6' : '#F1F0F0',
              maxWidth: '80%'
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div>Thinking…</div>}
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Describe your symptom (duration, severity, other details)"
          style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
        />
        <button type="submit" disabled={loading}>
          Send
        </button>
      </form>
    </div>
  )
}