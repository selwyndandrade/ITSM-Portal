import React, { useEffect, useMemo, useState } from 'react'
import DashboardCard from '../Components/DashboardCard'
import ErrorBanner from '../Components/ErrorBanner'
import LoadingSpinner from '../Components/LoadingSpinner'
import { getDashboardReports } from '../services/dashboardService'
import { getErrorMessage } from '../services/ticketService'

export default function Reports() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    getDashboardReports()
      .then((data) => active && setMetrics(data))
      .catch((ex) => active && setError(getErrorMessage(ex, 'Reporting data is unavailable right now.')))
      .finally(() => active && setLoading(false))

    return () => { active = false }
  }, [])

  const priorityBreakdown = useMemo(() => metrics?.priorityBreakdown || [], [metrics])
  const departmentBreakdown = useMemo(() => metrics?.departmentBreakdown || [], [metrics])
  const technicianWorkload = useMemo(() => metrics?.technicianWorkload || [], [metrics])
  const volumeTrend = useMemo(() => metrics?.volumeTrend || [], [metrics])

  if (loading) return <section className="feature-page"><LoadingSpinner /></section>

  return (
    <section className="feature-page">
      <div className="feature-heading">
        <div>
          <p className="eyebrow">REPORTING</p>
          <h1>Service performance insights</h1>
          <p>Monitor ticket trends, workload balance, and SLA posture across the support operation.</p>
        </div>
      </div>

      <ErrorBanner message={error} />

      {metrics && (
        <>
          <div className="report-grid">
            <div className="report-card">
              <p className="report-card__label">Total tickets</p>
              <strong>{metrics.totalTickets}</strong>
              <span>Live feed from the service desk</span>
            </div>
            <div className="report-card">
              <p className="report-card__label">Open vs resolved</p>
              <strong>{metrics.openTickets} open / {metrics.resolvedTickets} resolved</strong>
              <span>Current queue posture</span>
            </div>
            <div className="report-card">
              <p className="report-card__label">Average resolution time</p>
              <strong>{metrics.avgResolutionHours}h</strong>
              <span>Based on completed work</span>
            </div>
            <div className="report-card">
              <p className="report-card__label">SLA compliance</p>
              <strong>{metrics.slaCompliance}%</strong>
              <span>Performance benchmark</span>
            </div>
            <div className="report-card">
              <p className="report-card__label">SLA breaches</p>
              <strong>{metrics.slaBreaches ?? 0}</strong>
              <span>Tickets past their resolution deadline</span>
            </div>
          </div>

          <div className="report-panels">
            <DashboardCard eyebrow="Priority breakdown" title="Demand by urgency">
              <div className="report-list">
                {priorityBreakdown.map((item) => (
                  <div key={item.label} className="report-row">
                    <div className="report-row__label">
                      <span>{item.label}</span>
                      <strong>{item.count}</strong>
                    </div>
                    <div className="dashboard-bar">
                      <div className="dashboard-bar__fill" style={{ width: `${Math.max(12, (item.count / Math.max(metrics.totalTickets, 1)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>

            <DashboardCard eyebrow="Technician workload" title="Current assignment load">
              <div className="report-list">
                {technicianWorkload.map((item) => (
                  <div key={item.label} className="report-row">
                    <div className="report-row__label">
                      <span>{item.label}</span>
                      <strong>{item.count}</strong>
                    </div>
                    <div className="dashboard-bar">
                      <div className="dashboard-bar__fill dashboard-bar__fill--subtle" style={{ width: `${Math.max(12, (item.count / Math.max(metrics.totalTickets, 1)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>
          </div>

          <DashboardCard eyebrow="Ticket trend" title="Volume over the last week" className="report-table-card">
            <div className="report-list">
              {volumeTrend.map((item) => (
                <div key={item.label} className="report-row">
                  <div className="report-row__label">
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </div>
                  <div className="dashboard-bar">
                    <div className="dashboard-bar__fill" style={{ width: `${Math.max(10, (item.count / Math.max(metrics.totalTickets, 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard eyebrow="Department trends" title="Tickets by team" className="report-table-card">
            <div className="report-list">
              {departmentBreakdown.map((item) => (
                <div key={item.label} className="report-row">
                  <div className="report-row__label">
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </div>
                  <div className="dashboard-bar">
                    <div className="dashboard-bar__fill" style={{ width: `${Math.max(12, (item.count / Math.max(metrics.totalTickets, 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
        </>
      )}
    </section>
  )
}
