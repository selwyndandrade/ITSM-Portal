// Lightweight fuzzy matcher: returns a score (higher is better) if `text` fuzzy-matches `query`,
// or null if it doesn't match at all. Matches consecutive characters more highly than scattered ones,
// and matches at the start of a word more highly than mid-word.
export function fuzzyScore(text, query) {
  if (!query) return 0
  const haystack = (text || '').toLowerCase()
  const needle = query.toLowerCase().trim()
  if (!needle) return 0

  if (haystack.includes(needle)) {
    // Prefer earlier / whole-word matches
    const index = haystack.indexOf(needle)
    const isWordStart = index === 0 || /\s|[-_/]/.test(haystack[index - 1] || '')
    return 100 - index + (isWordStart ? 20 : 0)
  }

  // Fallback: subsequence fuzzy match
  let score = 0
  let searchIndex = 0
  let consecutive = 0
  for (let i = 0; i < haystack.length && searchIndex < needle.length; i += 1) {
    if (haystack[i] === needle[searchIndex]) {
      searchIndex += 1
      consecutive += 1
      score += consecutive
    } else {
      consecutive = 0
    }
  }

  return searchIndex === needle.length ? score : null
}

export function fuzzyFilter(items, query, getText) {
  if (!query || !query.trim()) return items.map((item) => ({ item, score: 0 }))
  return items
    .map((item) => ({ item, score: fuzzyScore(getText(item), query) }))
    .filter((entry) => entry.score !== null)
    .sort((a, b) => b.score - a.score)
}
