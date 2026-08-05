import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorBanner from '../Components/ErrorBanner'
import LoadingSpinner from '../Components/LoadingSpinner'
import { getKnowledgeArticles, getKnowledgeSummary } from '../services/aiService'
import { getErrorMessage } from '../services/ticketService'

export default function KnowledgeBase() {
  const [articles, setArticles] = useState([])
  const [summary, setSummary] = useState(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    Promise.all([
      getKnowledgeArticles(),
      getKnowledgeSummary()
    ]).then(([items, summaryData]) => {
      if (!active) return
      setArticles(items || [])
      setSummary(summaryData || null)
    }).catch((ex) => {
      if (active) setError(getErrorMessage(ex, 'Knowledge articles are not available yet.'))
    }).finally(() => active && setLoading(false))

    return () => { active = false }
  }, [])

  const categories = useMemo(() => [...new Set(articles.map((article) => article.category).filter(Boolean))], [articles])
  const visibleArticles = useMemo(() => articles.filter((article) => {
    const searchText = `${article.title || ''} ${article.content || ''}`.toLowerCase()
    return (!query || searchText.includes(query.toLowerCase())) && (!category || article.category === category)
  }), [articles, category, query])

  return <section className="feature-page">
    <div className="feature-heading"><div><p className="eyebrow">SELF SERVICE</p><h1>Knowledge Base</h1><p>Find approved troubleshooting guidance and service information.</p></div></div>
    <ErrorBanner message={error} />
    {summary && <div className="knowledge-summary">{summary.categories?.length ? <div><strong>Categories</strong><p>{summary.categories.join(', ')}</p></div> : null}<div><strong>Recent articles</strong><p>{summary.recentArticles?.length || 0} updated recently</p></div></div>}
    <div className="knowledge-controls"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search troubleshooting articles" aria-label="Search knowledge articles" /><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
    {loading && <LoadingSpinner />}
    {!loading && !error && <div className="article-grid">{visibleArticles.length ? visibleArticles.map((article) => <Link className="article-card" key={article.id} to={`/knowledge/${article.id}`}><span>{article.category || 'General'}</span><h2>{article.title}</h2><p>{(article.content || '').slice(0, 150)}{(article.content || '').length > 150 ? '…' : ''}</p><strong>Read article →</strong></Link>) : <div className="empty-panel">No knowledge articles match your search.</div>}</div>}
  </section>
}
