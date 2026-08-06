import React, { useMemo, useState } from 'react'
import EmptyState from './EmptyState'

function defaultSortValue(row, key) {
  const value = row[key]
  if (value == null) return ''
  return typeof value === 'string' ? value.toLowerCase() : value
}

export default function DataGrid({
  columns,
  rows,
  getRowKey,
  loading,
  error,
  loadingMessage = 'Loading...',
  errorPrefix = 'Error loading data',
  emptyTitle = 'No records',
  emptyDescription = 'There are no records to display.',
  noMatchMessage = 'No records match these filters.',
  selectable = true,
  selectedIds,
  onSelectionChange,
  pageSize = 20,
  showPagination = true,
  initialSort,
  actionsColumn,
  serverMode = false,
  filters: controlledFilters,
  onFilterChange,
  sort: controlledSort,
  onSortChange,
  page: controlledPage,
  onPageChange,
  totalCount: controlledTotalCount
}) {
  const [internalFilters, setInternalFilters] = useState(() => Object.fromEntries(columns.filter((c) => c.filter).map((c) => [c.key, ''])))
  const [internalSort, setInternalSort] = useState(initialSort || { key: columns[0]?.key, dir: 'asc' })
  const [internalPage, setInternalPage] = useState(1)
  const [internalSelected, setInternalSelected] = useState(() => new Set())

  const filters = serverMode ? controlledFilters : internalFilters
  const sortState = serverMode ? controlledSort : internalSort
  const selected = selectedIds ?? internalSelected
  const setSelected = onSelectionChange ?? setInternalSelected

  function updateFilter(key, value) {
    if (serverMode) {
      onFilterChange?.(key, value)
    } else {
      setInternalFilters((prev) => ({ ...prev, [key]: value }))
      setInternalPage(1)
    }
  }

  function toggleSort(key) {
    if (serverMode) {
      onSortChange?.(key)
      return
    }
    setInternalSort((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      return { key, dir: 'asc' }
    })
  }

  const filtered = useMemo(() => {
    if (serverMode || !rows) return rows || []
    return rows.filter((row) => {
      return columns.every((col) => {
        if (!col.filter) return true
        const value = filters[col.key]
        if (!value) return true
        if (col.filter === 'select') {
          return (col.filterValue ? col.filterValue(row) : row[col.key]) === value
        }
        const haystack = (col.filterText ? col.filterText(row) : String(row[col.key] ?? '')).toLowerCase()
        return haystack.includes(value.trim().toLowerCase())
      })
    })
  }, [serverMode, rows, columns, filters])

  const sorted = useMemo(() => {
    if (serverMode) return rows || []
    const col = columns.find((c) => c.key === sortState?.key)
    const copy = [...filtered]
    copy.sort((a, b) => {
      const av = col?.sortValue ? col.sortValue(a) : defaultSortValue(a, sortState.key)
      const bv = col?.sortValue ? col.sortValue(b) : defaultSortValue(b, sortState.key)
      if (av < bv) return sortState.dir === 'asc' ? -1 : 1
      if (av > bv) return sortState.dir === 'asc' ? 1 : -1
      return 0
    })
    return copy
  }, [serverMode, rows, filtered, columns, sortState])

  const totalCount = serverMode ? (controlledTotalCount ?? 0) : sorted.length
  const page = serverMode ? controlledPage : internalPage
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = Math.min(page || 1, pageCount)
  const pageStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const pageEnd = Math.min(currentPage * pageSize, totalCount)
  const pageRows = serverMode ? (rows || []) : sorted.slice(pageStart - 1, pageEnd)

  function goToPage(next) {
    const clamped = Math.max(1, Math.min(pageCount, next))
    if (serverMode) onPageChange?.(clamped)
    else setInternalPage(clamped)
  }

  function toggleSelectAllOnPage() {
    const pageIds = pageRows.map(getRowKey)
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
    const next = new Set(selected)
    pageIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)))
    setSelected(next)
  }

  function toggleSelectRow(id) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  if (loading) return <div className="dashboard-empty">{loadingMessage}</div>
  if (error) return <div className="dashboard-form-error">{errorPrefix}: {error}</div>
  if (!rows || (!serverMode && rows.length === 0)) return <EmptyState title={emptyTitle} description={emptyDescription} />

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((row) => selected.has(getRowKey(row)))
  const colCount = columns.length + (selectable ? 1 : 0) + (actionsColumn ? 1 : 0)

  return (
    <div>
      <div className="dashboard-grid-toolbar">
        <span>{selected.size > 0 ? `${selected.size} Selected` : `${totalCount} Record${totalCount === 1 ? '' : 's'}`}</span>
        {showPagination && (
          <div className="dashboard-pagination">
            <span>{totalCount === 0 ? '0 of 0' : `${pageStart} to ${pageEnd} of ${totalCount}`}</span>
            <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>‹ Prev</button>
            <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= pageCount}>Next ›</button>
          </div>
        )}
      </div>

      <div className="dashboard-table-wrap">
        <table className="dashboard-table">
          <thead>
            <tr>
              {selectable && (
                <th className="checkbox-col">
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAllOnPage} aria-label="Select all on page" />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} className={col.sortable === false ? undefined : 'is-sortable'} onClick={col.sortable === false ? undefined : () => toggleSort(col.key)}>
                  {col.label}
                  {col.sortable !== false && (
                    <span className="dashboard-sort-caret">{sortState?.key === col.key ? (sortState.dir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                  )}
                </th>
              ))}
              {actionsColumn && <th>{actionsColumn.label || 'Actions'}</th>}
            </tr>
            {columns.some((c) => c.filter) && (
              <tr className="dashboard-filter-row">
                {selectable && <th className="checkbox-col" />}
                {columns.map((col) => (
                  <th key={col.key}>
                    {col.filter === 'text' && (
                      <input
                        className="dashboard-filter-input"
                        value={filters[col.key] || ''}
                        onChange={(e) => updateFilter(col.key, e.target.value)}
                        placeholder={col.placeholder || 'Search'}
                      />
                    )}
                    {col.filter === 'select' && (
                      <select className="dashboard-filter-select" value={filters[col.key] || ''} onChange={(e) => updateFilter(col.key, e.target.value)}>
                        <option value="">All</option>
                        {col.filterOptions.map((opt) => (
                          <option key={opt.value ?? opt} value={opt.value ?? opt}>{opt.label ?? opt}</option>
                        ))}
                      </select>
                    )}
                  </th>
                ))}
                {actionsColumn && <th />}
              </tr>
            )}
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={colCount} className="dashboard-empty">{noMatchMessage}</td>
              </tr>
            )}
            {pageRows.map((row) => {
              const rowKey = getRowKey(row)
              return (
                <tr key={rowKey} className={selected.has(rowKey) ? 'is-selected' : undefined}>
                  {selectable && (
                    <td className="checkbox-col">
                      <input type="checkbox" checked={selected.has(rowKey)} onChange={() => toggleSelectRow(rowKey)} aria-label={`Select row ${rowKey}`} />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                  ))}
                  {actionsColumn && <td>{actionsColumn.render(row)}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
