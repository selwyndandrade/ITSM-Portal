import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ErrorBanner from '../Components/ErrorBanner'
import { generateTicketSummary, sendAiMessage } from '../services/aiService'

const suggestions = ['My laptop keeps disconnecting from Wi-Fi', 'My monitor is not displaying anything', 'I cannot access my email']

export default function MeyonAssistant() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Hi, I’m Meyon. Describe the IT issue you’re experiencing and I’ll help you troubleshoot it.' }])
  const [draft, setDraft] = useState('')
  const [conversationId, setConversationId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState(null)

  async function sendMessage(text = draft) {
    const message = text.trim()
    if (!message || loading) return
    setDraft(''); setError(null); setLoading(true); setMessages((items) => [...items, { role: 'user', content: message }])
    try {
      const response = await sendAiMessage({ message, conversationId })
      setConversationId(response.conversationId || conversationId)
      setMessages((items) => [...items, { role: 'assistant', content: response.message || response.response || 'I could not generate a response. Please try again.', articles: response.knowledgeArticles || response.articles || [] }])
    } catch (ex) { setError(ex?.response?.data?.message || 'Meyon is currently unavailable. Please try again.') } finally { setLoading(false) }
  }

  async function createTicketDraft() {
    setError(null); setLoading(true)
    try { setSummary(await generateTicketSummary(conversationId)) } catch (ex) { setError(ex?.response?.data?.message || 'Ticket suggestions could not be generated.') } finally { setLoading(false) }
  }

  const approveTicket = () => navigate('/tickets/new', { state: { aiDraft: summary } })
  return <section className="feature-page ai-page"><div className="feature-heading"><div><p className="eyebrow">AI-POWERED SUPPORT</p><h1>Meyon</h1><p>Get guided troubleshooting and ticket-ready issue details.</p></div><button className="secondary-button" onClick={createTicketDraft} disabled={loading || messages.length < 2}>Create Ticket</button></div><ErrorBanner message={error} />
    <div className="ai-layout"><div className="chat-panel"><div className="chat-messages">{messages.map((item, index) => <div className={`message ${item.role}`} key={`${item.role}-${index}`}><div className="message-label">{item.role === 'user' ? 'You' : 'Meyon'}</div><div>{item.content}</div>{item.articles?.length > 0 && <div className="recommendations">Related articles: {item.articles.map((article) => <span key={article.id || article.title}>{article.title || article}</span>)}</div>}</div>)}{loading && <div className="message assistant"><div className="message-label">Meyon</div><span className="typing">Thinking<span>.</span><span>.</span><span>.</span></span></div>}</div><form className="chat-input" onSubmit={(event) => { event.preventDefault(); sendMessage() }}><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Describe your issue…" /><button disabled={loading || !draft.trim()}>Send</button></form></div><aside className="assistant-sidebar"><h2>Try asking</h2>{suggestions.map((item) => <button key={item} onClick={() => sendMessage(item)}>{item}</button>)}<div className="assistant-note"><strong>Before a ticket is created</strong><p>The AI prepares a draft. You review and submit it through the existing ticket workflow.</p></div></aside></div>
    {summary && <div className="ticket-draft"><div><p className="eyebrow">TICKET DRAFT</p><h2>{summary.title}</h2><p>{summary.description}</p><div className="draft-tags"><span>{summary.category || 'General'}</span><span>{summary.priority || 'Medium'} priority</span><span>{summary.assignmentGroup || summary.suggestedAssignmentGroup || 'Support'} </span></div></div><div><button className="primary-button" onClick={approveTicket}>Review & create ticket</button><button className="text-button" onClick={() => setSummary(null)}>Dismiss</button></div></div>}
  </section>
}
