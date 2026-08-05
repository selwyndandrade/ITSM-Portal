import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ErrorBanner from '../Components/ErrorBanner'
import LoadingSpinner from '../Components/LoadingSpinner'
import { getKnowledgeArticle } from '../services/aiService'

export default function KnowledgeArticle() {
  const { id } = useParams()
  const [article, setArticle] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => { getKnowledgeArticle(id).then(setArticle).catch((ex) => setError(ex?.response?.data?.message || 'Article could not be loaded.')) }, [id])
  if (error) return <section className="feature-page"><ErrorBanner message={error} /><Link to="/knowledge">← Back to Knowledge Base</Link></section>
  if (!article) return <LoadingSpinner />
  return <article className="feature-page article-detail"><Link to="/knowledge">← Back to Knowledge Base</Link><p className="eyebrow">{article.category || 'GENERAL'}</p><h1>{article.title}</h1><div className="article-content">{article.content}</div><p className="article-meta">Last updated {article.updatedDate ? new Date(article.updatedDate).toLocaleDateString() : 'recently'}</p></article>
}
