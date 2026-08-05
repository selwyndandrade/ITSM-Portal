import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getKnowledgeArticles, sendAiMessage } from '../services/aiService'
import { getTickets } from '../services/ticketService'

const baseSuggestions = [
  'Create a ticket for my Outlook issue',
  'Review my open tickets',
  'Show my assigned tickets',
  'Help me reset my password',
  'Summarize today\'s incidents'
]

function normalizeArticles(items = []) {
  return (items || []).map((article) => {
    if (typeof article === 'string') {
      return { id: article, title: article }
    }

    return {
      id: article.id || article.slug || article.title,
      title: article.title || article.name || article.slug || 'Related article'
    }
  })
}

function getPortalAwareResponse(message, context = {}) {
  const text = (message || '').toLowerCase()
  const tickets = context.tickets || []
  const articles = normalizeArticles(context.articles || [])
  const userEmail = context.user?.email || ''

  const openTickets = tickets.filter((ticket) => (ticket.status || '').toLowerCase() === 'open')
  const assignedTickets = tickets.filter((ticket) => {
    const assignedTo = (ticket.assignedTo || ticket.assignedToEmail || '').toLowerCase()
    return assignedTo && userEmail && assignedTo === userEmail.toLowerCase()
  })

  if (text.includes('assigned')) {
    if (assignedTickets.length > 0) {
      return {
        shouldUsePortalContext: true,
        message: `You currently have ${assignedTickets.length} ticket${assignedTickets.length > 1 ? 's' : ''} assigned to you in the portal. I can help you prioritize them or draft a quick update for the next step.`,
        articles
      }
    }

    return {
      shouldUsePortalContext: true,
      message: 'I do not see any tickets currently assigned to you in the portal. If you want, I can help you review open work or create a new request.',
      articles
    }
  }

  if (text.includes('status') || text.includes('my tickets')) {
    const openCount = openTickets.length
    return {
      shouldUsePortalContext: true,
      message: `You currently have ${openCount} open ticket${openCount === 1 ? '' : 's'} in the portal. I can help you review the latest updates, identify blockers, or summarize what needs attention.`,
      articles
    }
  }

  if (text.includes('incident') || text.includes('summary')) {
    const recentTitles = tickets.slice(0, 3).map((ticket) => ticket.title).filter(Boolean)
    const recentSummary = recentTitles.length > 0 ? `Recent items include ${recentTitles.join(', ')}.` : 'I can also pull the most recent tickets into a short incident summary.'
    return {
      shouldUsePortalContext: true,
      message: `I can help turn your recent ITSM activity into a concise incident update. ${recentSummary}`,
      articles
    }
  }

  if (text.includes('password')) {
    return {
      shouldUsePortalContext: true,
      message: 'Password issues are usually handled through identity verification or a reset workflow. Based on the knowledge base, I can point you to the safest recovery steps and any related article guidance.',
      articles
    }
  }

  if (text.includes('vpn') || text.includes('access')) {
    return {
      shouldUsePortalContext: true,
      message: 'I can help you start a service request for access provisioning. The most likely catalog path is VPN or account access, and I can guide you through the request details so it becomes a linked ticket in Kyro.',
      articles
    }
  }

  if (text.includes('laptop') || text.includes('new laptop')) {
    return {
      shouldUsePortalContext: true,
      message: 'A new laptop request is a standard catalog workflow. I can help you submit it as a service request and connect it to the IT provisioning process in Kyro.',
      articles
    }
  }

  if (text.includes('onboard') || text.includes('new employee') || text.includes('setup')) {
    return {
      shouldUsePortalContext: true,
      message: 'Onboarding requests are supported through the service catalog. I can help you start a new employee setup request and route it into the existing ticket-driven delivery process.',
      articles
    }
  }

  if (text.includes('ticket')) {
    const openCount = openTickets.length
    return {
      shouldUsePortalContext: true,
      message: `I can help you draft a concise service request. You currently have ${openCount} open ticket${openCount === 1 ? '' : 's'} in the portal, so I can frame this as a follow-up or a new incident report.`,
      articles
    }
  }

  return {
    shouldUsePortalContext: false,
    message: 'I can help you troubleshoot common IT problems, review tickets, search the knowledge base, and draft a support request. Tell me what you need and I’ll guide you through it.',
    articles
  }
}

function getStructuredPortalActionResponse(message, context = {}) {
  const text = (message || '').toLowerCase()
  const tickets = (context.tickets || []).map((ticket) => ({
    title: ticket.title || 'Untitled ticket',
    status: ticket.status || 'Open',
    priority: ticket.priority || 'Low',
    assignedTo: ticket.assignedTo || ticket.assignedToEmail || ''
  }))
  const articles = normalizeArticles(context.articles || [])
  const userEmail = (context.user?.email || '').toLowerCase()

  const assignedTickets = tickets.filter((ticket) => {
    const assignedTo = (ticket.assignedTo || '').toLowerCase()
    return assignedTo && userEmail && assignedTo === userEmail
  })
  const openTickets = tickets.filter((ticket) => (ticket.status || '').toLowerCase() === 'open')
  const inProgressTickets = tickets.filter((ticket) => (ticket.status || '').toLowerCase() === 'in progress')

  if ((text.includes('show') && text.includes('assigned')) || text.includes('assigned tickets')) {
    if (assignedTickets.length > 0) {
      const lines = assignedTickets.slice(0, 5).map((ticket) => `• ${ticket.title} — ${ticket.status} (${ticket.priority})`)
      return {
        shouldUsePortalContext: true,
        message: `Here are the tickets currently assigned to you:\n${lines.join('\n')}`,
        articles
      }
    }

    return {
      shouldUsePortalContext: true,
      message: 'I do not see any tickets currently assigned to you right now.',
      articles
    }
  }

  if ((text.includes('show') && text.includes('open')) || (text.includes('status') && text.includes('tickets')) || text.includes('my tickets')) {
    if (openTickets.length > 0) {
      const lines = openTickets.slice(0, 5).map((ticket) => `• ${ticket.title} — ${ticket.status} (${ticket.priority})`)
      return {
        shouldUsePortalContext: true,
        message: `Here are your most relevant open tickets:\n${lines.join('\n')}`,
        articles
      }
    }

    return {
      shouldUsePortalContext: true,
      message: 'You do not currently have any open tickets in the portal.',
      articles
    }
  }

  if (text.includes('next step') || text.includes('what should i do') || text.includes('recommend')) {
    const openTicket = tickets.find((ticket) => (ticket.status || '').toLowerCase() === 'open')
    const recommendedAction = openTicket
      ? `Review the open ticket “${openTicket.title}” first, confirm the current status, and update the requester with the latest progress.`
      : 'Check the most recent portal update, confirm the impact, and then decide whether the issue needs a follow-up or a handoff.'

    return {
      shouldUsePortalContext: true,
      message: `Suggested next action:\n${recommendedAction}`,
      articles
    }
  }

  if (text.includes('latest ticket') || text.includes('current ticket') || text.includes('open ticket')) {
    const priorityTicket = tickets.find((ticket) => (ticket.status || '').toLowerCase() === 'open') || tickets[0]
    if (priorityTicket) {
      return {
        shouldUsePortalContext: true,
        message: `Current ticket focus:\nTitle: ${priorityTicket.title}\nStatus: ${priorityTicket.status || 'Open'}\nPriority: ${priorityTicket.priority || 'Low'}`,
        articles
      }
    }
  }

  if (text.includes('draft') && (text.includes('follow') || text.includes('incident') || text.includes('ticket'))) {
    const issueSummary = text.replace(/^(draft|help|me|a|an|the|for|about)\s+/g, '').trim() || 'the issue you described'
    const title = issueSummary.length > 50 ? `${issueSummary.slice(0, 47)}...` : issueSummary
    return {
      shouldUsePortalContext: true,
      message: `Suggested follow-up draft:\nTitle: ${title}\nDescription: I need assistance with ${issueSummary}. Please review the request, confirm the impact, and advise on the next steps.`,
      articles
    }
  }

  if (text.includes('summarize') && (text.includes('incident') || text.includes('today'))) {
    const recentTitles = tickets.slice(0, 3).map((ticket) => ticket.title).filter(Boolean)
    const summaryLine = recentTitles.length > 0 ? recentTitles.join(', ') : 'recent portal activity'
    return {
      shouldUsePortalContext: true,
      message: `Incident summary draft:\n- Current focus: ${summaryLine}\n- Open items: ${openTickets.length}\n- In progress: ${inProgressTickets.length}`,
      articles
    }
  }

  return null
}

export default function MeyonAssistant() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey, I'm Meyon. I'm here to help. What can I assist you with today?"
    }
  ])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [portalContext, setPortalContext] = useState({ tickets: [], articles: [], loading: false, loaded: false })

  useEffect(() => {
    function openAssistant() {
      setIsOpen(true)
    }

    window.addEventListener('open-meyon-assistant', openAssistant)
    return () => window.removeEventListener('open-meyon-assistant', openAssistant)
  }, [])

  useEffect(() => {
    if (!isOpen) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || portalContext.loading || portalContext.loaded) return undefined

    let cancelled = false

    async function loadPortalContext() {
      setPortalContext((current) => ({ ...current, loading: true }))

      try {
        const [ticketsResponse, articlesResponse] = await Promise.all([
          getTickets(1, 8),
          getKnowledgeArticles({ page: 1, pageSize: 5 })
        ])

        if (cancelled) return

        const tickets = Array.isArray(ticketsResponse) ? ticketsResponse : ticketsResponse.items || []
        const articles = Array.isArray(articlesResponse) ? articlesResponse : articlesResponse.items || []

        setPortalContext({ tickets, articles, loading: false, loaded: true })
      } catch (error) {
        if (!cancelled) {
          setPortalContext({ tickets: [], articles: [], loading: false, loaded: true })
        }
      }
    }

    loadPortalContext()

    return () => {
      cancelled = true
    }
  }, [isOpen, portalContext.loaded, portalContext.loading])

  const showSuggestions = useMemo(() => messages.length <= 1, [messages.length])
  const portalSummary = useMemo(() => {
    const openCount = portalContext.tickets.filter((ticket) => (ticket.status || '').toLowerCase() === 'open').length
    const assignedCount = portalContext.tickets.filter((ticket) => {
      const assignedTo = (ticket.assignedTo || ticket.assignedToEmail || '').toLowerCase()
      return assignedTo && (user?.email || '').toLowerCase() && assignedTo === (user?.email || '').toLowerCase()
    }).length

    return {
      openCount,
      assignedCount,
      articleCount: portalContext.articles.length,
      hasData: portalContext.loaded || portalContext.loading
    }
  }, [portalContext.articles, portalContext.tickets, portalContext.loaded, portalContext.loading, user?.email])

  const suggestionChips = useMemo(() => {
    const chips = [...baseSuggestions]

    if (portalSummary.assignedCount > 0) {
      chips[2] = `Review ${portalSummary.assignedCount} assigned ticket${portalSummary.assignedCount === 1 ? '' : 's'}`
    }

    if (portalSummary.openCount > 0) {
      chips[1] = `Review ${portalSummary.openCount} open ticket${portalSummary.openCount === 1 ? '' : 's'}`
    }

    return chips
  }, [portalSummary.assignedCount, portalSummary.openCount])

  async function sendMessage(text = draft) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setDraft('')
    setMessages((current) => [...current, { role: 'user', content: trimmed }])
    setLoading(true)

    try {
      const portalReply = getPortalAwareResponse(trimmed, {
        tickets: portalContext.tickets,
        articles: portalContext.articles,
        user
      })
      const structuredReply = getStructuredPortalActionResponse(trimmed, {
        tickets: portalContext.tickets,
        articles: portalContext.articles,
        user
      })

      let response = null
      let messageText = portalReply.message
      let articleList = normalizeArticles(portalReply.articles || [])

      if (structuredReply) {
        messageText = structuredReply.message
        articleList = normalizeArticles(structuredReply.articles || [])
      } else {
        try {
          response = await sendAiMessage({
            message: trimmed,
            conversationId,
            portalContext: {
              userEmail: user?.email || null,
              ticketCount: portalContext.tickets.length,
              openTicketCount: portalContext.tickets.filter((ticket) => (ticket.status || '').toLowerCase() === 'open').length,
              assignedTicketCount: portalContext.tickets.filter((ticket) => {
                const assignedTo = (ticket.assignedTo || ticket.assignedToEmail || '').toLowerCase()
                return assignedTo && user?.email && assignedTo === user.email.toLowerCase()
              }).length,
              knowledgeArticles: portalContext.articles.slice(0, 5)
            }
          })

          const nextConversationId = response?.conversationId || conversationId
          setConversationId(nextConversationId)

          const aiMessage = response?.message || response?.response || response?.content
          messageText = portalReply.shouldUsePortalContext ? portalReply.message : (aiMessage || portalReply.message)
          articleList = normalizeArticles(
            response?.knowledgeArticles || response?.recommendedArticles || response?.articles || portalReply.articles || []
          )
        } catch (error) {
          messageText = portalReply.message
          articleList = normalizeArticles(portalReply.articles || [])
        }
      }

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: messageText,
          articles: articleList
        }
      ])
    } catch (error) {
      const fallback = getPortalAwareResponse(trimmed, {
        tickets: portalContext.tickets,
        articles: portalContext.articles,
        user
      })
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: fallback.message,
          articles: fallback.articles
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="nova-toggle"
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Open Meyon assistant"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3c-1.7 0-3.2.9-4.1 2.3l-.5 1-.9-.1a5.2 5.2 0 0 0-4.9 4.3c-.2 1.2 0 2.4.6 3.4.4.6.8 1.1 1.3 1.6l.2.2a1 1 0 0 1-.2 1.5l-.6.4A1 1 0 0 0 4 17.8c1.4 1.2 3.2 1.9 5.1 1.9h.5c.6 0 1.1.3 1.4.8l.4.6a1 1 0 0 0 1.7 0l.4-.6c.3-.5.8-.8 1.4-.8h.5c1.9 0 3.7-.7 5.1-1.9a1 1 0 0 0 .2-1.4l-.6-.4a1 1 0 0 1-.2-1.5l.2-.2c.5-.5.9-1 .1-1.6A5.2 5.2 0 0 0 16.6 6.2l-.9.1-.5-1A4.9 4.9 0 0 0 12 3Zm-.2 5.2a.8.8 0 0 1 1.1 0l.8.7.2.9a.8.8 0 0 1-.3.8l-.5.4.1.9a.8.8 0 0 1-.5.7.8.8 0 0 1-.8 0l-.8-.4-.8.4a.8.8 0 0 1-.8 0 .8.8 0 0 1-.5-.7l.1-.9-.5-.4a.8.8 0 0 1-.3-.8l.2-.9.8-.7Z" />
        </svg>
      </button>

      <div className={`nova-backdrop${isOpen ? ' is-open' : ''}`} onClick={() => setIsOpen(false)} />

      <aside className={`nova-panel${isOpen ? ' is-open' : ''}`} role="dialog" aria-label="Meyon assistant">
        <div className="nova-panel__header">
          <div>
            <p className="nova-panel__eyebrow">KYRO AI</p>
            <h2>Meyon</h2>
          </div>
          <button type="button" className="nova-panel__close" onClick={() => setIsOpen(false)} aria-label="Close Meyon assistant">
            ×
          </button>
        </div>

        <div className="nova-panel__body">
          <div className="nova-panel__welcome">
            <p>Hey, I&apos;m Meyon. I&apos;m here to help.</p>
            {portalSummary.hasData && (
              <div className="nova-portal-summary">
                <div className="nova-portal-summary__item">
                  <span>Open</span>
                  <strong>{portalSummary.openCount}</strong>
                </div>
                <div className="nova-portal-summary__item">
                  <span>Assigned</span>
                  <strong>{portalSummary.assignedCount}</strong>
                </div>
                <div className="nova-portal-summary__item">
                  <span>Articles</span>
                  <strong>{portalSummary.articleCount}</strong>
                </div>
              </div>
            )}
            <p className="nova-portal-summary__hint">I can help you create a ticket, review open work, summarize incidents, and guide you through common service requests.</p>
          </div>

          {showSuggestions && (
            <div className="nova-suggestions">
              {suggestionChips.map((suggestion) => (
                <button key={suggestion} type="button" className="nova-chip" onClick={() => sendMessage(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div className="nova-messages">
            {messages.map((item, index) => (
              <div key={`${item.role}-${index}`} className={`nova-message ${item.role}`}>
                <div className="nova-message__label">{item.role === 'user' ? 'You' : 'Meyon'}</div>
                <div style={{ whiteSpace: 'pre-line' }}>{item.content}</div>
                {item.articles?.length > 0 && (
                  <div className="nova-message__articles">
                    {item.articles.map((article) => (
                      <span key={article.id || article.title}>{article.title || article}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="nova-message assistant">
                <div className="nova-message__label">Meyon</div>
                <div className="nova-typing">Thinking<span /></div>
              </div>
            )}
          </div>
        </div>

        <form className="nova-input" onSubmit={(event) => {
          event.preventDefault()
          sendMessage(draft)
        }}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask Meyon anything..."
          />
          <button type="submit" disabled={loading || !draft.trim()}>
            Send
          </button>
        </form>
      </aside>
    </>
  )
}
